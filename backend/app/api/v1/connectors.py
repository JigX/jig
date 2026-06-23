"""Connector CRUD + trigger analysis."""
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.connector import Connector, ConnectorStatus, ConnectorType
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
