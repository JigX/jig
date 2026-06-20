import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.analysis import Analysis
from app.models.capability import Capability
from app.models.user import User

router = APIRouter()


@router.get("/{connector_id}")
async def get_analysis(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> dict:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.connector_id == connector_id)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found")

    caps_result = await db.execute(
        select(Capability).where(Capability.connector_id == connector_id)
    )
    capabilities = caps_result.scalars().all()

    return {
        "id": str(analysis.id),
        "status": analysis.status.value,
        "risk_score": analysis.risk_score,
        "ai_advice": analysis.ai_advice,
        "compliance_findings": analysis.compliance_findings,
        "ai_model": analysis.ai_model,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
        "capabilities": [
            {
                "id": str(c.id),
                "name": c.name,
                "operation_type": c.operation_type.value,
                "sensitivity": c.sensitivity.value,
                "risk_level": c.risk_level.value,
                "regulation_refs": c.regulation_refs,
            }
            for c in capabilities
        ],
    }
