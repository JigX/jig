import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter()


@router.get("/")
async def list_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    connector_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
) -> list[dict]:
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
    if connector_id:
        query = query.where(AuditLog.connector_id == connector_id)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "connector_id": str(log.connector_id),
            "capability_id": str(log.capability_id),
            "principal": log.principal,
            "policy_tier": log.policy_tier.value,
            "outcome": log.outcome,
            "response_summary": log.response_summary,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]
