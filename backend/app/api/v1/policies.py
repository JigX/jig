import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user, get_current_user, get_db
from app.models.capability import Capability
from app.models.policy import Policy, PolicyTier
from app.models.user import User

router = APIRouter()


@router.get("/connector/{connector_id}")
async def list_policies(
    connector_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    result = await db.execute(
        select(Policy, Capability)
        .join(Capability, Policy.capability_id == Capability.id)
        .where(Capability.connector_id == connector_id)
    )
    rows = result.all()
    return [
        {
            "id": str(p.id),
            "capability_id": str(p.capability_id),
            "capability_name": c.name,
            "tier": p.tier.value,
            "rate_limit_per_hour": p.rate_limit_per_hour,
            "require_audit": p.require_audit,
            "justification": p.justification,
        }
        for p, c in rows
    ]


@router.patch("/{policy_id}")
async def update_policy(
    policy_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_admin_user)],
) -> dict:
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if "tier" in body:
        policy.tier = PolicyTier(body["tier"])
    if "rate_limit_per_hour" in body:
        policy.rate_limit_per_hour = body["rate_limit_per_hour"]
    if "justification" in body:
        policy.justification = body["justification"]
    if "allowed_principals" in body:
        policy.allowed_principals = body["allowed_principals"]
    if "parameter_constraints" in body:
        policy.parameter_constraints = body["parameter_constraints"]

    await db.commit()
    await db.refresh(policy)
    return {"id": str(policy.id), "tier": policy.tier.value}
