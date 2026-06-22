import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.audit import AuditLog
from app.models.capability import Capability
from app.models.connector import Connector
from app.models.user import User

OUTCOME_MAP = {
    "allowed": "executed",
    "denied": "blocked",
    "pending_confirmation": "pending",
    "confirmed": "executed",
    "timed_out": "blocked",
}

router = APIRouter()


@router.get("/")
async def list_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    connector_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
) -> list[dict]:
    query = (
        select(AuditLog, Connector, Capability)
        .join(Connector, AuditLog.connector_id == Connector.id)
        .join(Capability, AuditLog.capability_id == Capability.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .offset(offset)
    )
    if connector_id:
        query = query.where(AuditLog.connector_id == connector_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat(),
            "connector_name": conn.name,
            "capability_name": cap.name,
            "actor": log.principal,
            "decision": log.policy_tier.value,
            "outcome": OUTCOME_MAP.get(log.outcome, log.outcome),
        }
        for log, conn, cap in rows
    ]
