"""Connector CRUD + trigger analysis."""
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.crypto import decrypt_credential, encrypt_credential
from app.models.connector import Connector, ConnectorAuthMode, ConnectorStatus, ConnectorType
from app.models.user import User

router = APIRouter()


@router.get("/")
async def list_connectors(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    result = await db.execute(select(Connector))
    connectors = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "type": c.type.value,
            "status": c.status.value,
            "created_at": c.created_at.isoformat(),
        }
        for c in connectors
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_connector(
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks,
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    connector = Connector(
        name=body["name"],
        description=body.get("description"),
        type=ConnectorType(body["type"]),
        config=body.get("config", {}),
    )
    db.add(connector)
    await db.commit()
    await db.refresh(connector)

    # Trigger analysis in background
    background_tasks.add_task(_run_analysis, connector.id)

    return {"id": str(connector.id), "status": connector.status.value}


@router.patch("/{connector_id}/auth-mode")
async def set_auth_mode(
    connector_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    from app.api.deps import get_admin_user
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    connector.auth_mode = ConnectorAuthMode(body["auth_mode"])
    await db.commit()
    return {"auth_mode": connector.auth_mode.value}


@router.get("/{connector_id}")
async def get_connector(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    return {
        "id": str(connector.id),
        "name": connector.name,
        "type": connector.type.value,
        "status": connector.status.value,
        "auth_mode": connector.auth_mode.value,
        "config": connector.config,
        "created_at": connector.created_at.isoformat(),
    }


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connector(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> None:
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    await db.delete(connector)
    await db.commit()


@router.get("/{connector_id}/my-credential")
async def get_my_credential(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    from app.models.user_connector_credential import UserConnectorCredential
    row = (await db.execute(
        select(UserConnectorCredential).where(
            UserConnectorCredential.connector_id == connector_id,
            UserConnectorCredential.user_id == user.id,
        )
    )).scalar_one_or_none()
    return {
        "has_credential": row is not None,
        "updated_at": row.updated_at.isoformat() if row else None,
    }


@router.put("/{connector_id}/my-credential", status_code=status.HTTP_204_NO_CONTENT)
async def save_my_credential(
    connector_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.models.user_connector_credential import UserConnectorCredential

    token = body.get("credential", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="credential required")

    encrypted = encrypt_credential(settings.secret_key, token)

    existing = (await db.execute(
        select(UserConnectorCredential).where(
            UserConnectorCredential.connector_id == connector_id,
            UserConnectorCredential.user_id == user.id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.credential_encrypted = encrypted
    else:
        db.add(UserConnectorCredential(
            user_id=user.id,
            connector_id=connector_id,
            credential_encrypted=encrypted,
        ))
    await db.commit()


@router.delete("/{connector_id}/my-credential", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_credential(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    from app.models.user_connector_credential import UserConnectorCredential
    row = (await db.execute(
        select(UserConnectorCredential).where(
            UserConnectorCredential.connector_id == connector_id,
            UserConnectorCredential.user_id == user.id,
        )
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()


@router.get("/{connector_id}/capabilities/")
async def list_capabilities(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    from app.models.capability import Capability
    from app.models.policy import Policy
    result = await db.execute(
        select(Capability, Policy)
        .outerjoin(Policy, Policy.capability_id == Capability.id)
        .where(Capability.connector_id == connector_id)
        .order_by(Capability.created_at)
    )
    rows = result.all()
    return [
        {
            "id": str(cap.id),
            "name": cap.name,
            "description": cap.description,
            "operation_type": cap.operation_type.value,
            "risk_level": cap.risk_level.value,
            "parameters_schema": cap.parameters_schema,
            "policy_id": str(pol.id) if pol else None,
            "policy_tier": pol.tier.value if pol else None,
        }
        for cap, pol in rows
    ]


@router.post("/{connector_id}/capabilities/", status_code=status.HTTP_201_CREATED)
async def create_capability(
    connector_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    from app.models.capability import Capability, OperationType, RiskLevel, SensitivityLevel
    from app.models.policy import Policy, PolicyTier

    result = await db.execute(
        select(Connector).where(Connector.id == connector_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Connector not found")

    # Build parameters_schema: _http meta + user params
    http_method = body.get("http_method", "POST").upper()
    http_path = body.get("http_path", "/")
    raw_params: list[dict] = body.get("parameters", [])

    parameters_schema: dict = {
        "_http": {"method": http_method, "path": http_path}
    }
    for p in raw_params:
        parameters_schema[p["name"]] = {
            "type": p.get("type", "string"),
            "description": p.get("description", ""),
        }

    cap = Capability(
        connector_id=connector_id,
        name=body["name"],
        description=body.get("description"),
        operation_type=OperationType(body.get("operation_type", "read")),
        sensitivity=SensitivityLevel(body.get("sensitivity", "internal")),
        risk_level=RiskLevel(body.get("risk_level", "medium")),
        parameters_schema=parameters_schema,
    )
    db.add(cap)
    await db.flush()

    tier = PolicyTier(body.get("policy_tier", "deny"))
    policy = Policy(capability_id=cap.id, tier=tier)
    db.add(policy)
    await db.commit()
    await db.refresh(cap)
    await db.refresh(policy)

    return {
        "id": str(cap.id),
        "name": cap.name,
        "policy_id": str(policy.id),
        "policy_tier": policy.tier.value,
    }


@router.delete("/{connector_id}/capabilities/{capability_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_capability(
    connector_id: uuid.UUID,
    capability_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> None:
    from app.models.capability import Capability
    result = await db.execute(
        select(Capability).where(
            Capability.id == capability_id,
            Capability.connector_id == connector_id,
        )
    )
    cap = result.scalar_one_or_none()
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    await db.delete(cap)
    await db.commit()


async def _run_analysis(connector_id: uuid.UUID) -> None:
    """Background task: discover capabilities and run compliance analysis."""
    from app.core.database import AsyncSessionLocal
    from app.services.analyzer.dispatcher import analyze_connector

    async with AsyncSessionLocal() as db:
        await analyze_connector(connector_id, db)
