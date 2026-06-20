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


async def _run_analysis(connector_id: uuid.UUID) -> None:
    """Background task: discover capabilities and run compliance analysis."""
    from app.core.database import AsyncSessionLocal
    from app.services.analyzer.dispatcher import analyze_connector

    async with AsyncSessionLocal() as db:
        await analyze_connector(connector_id, db)
