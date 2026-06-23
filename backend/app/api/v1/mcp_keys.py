"""MCP API key management.

Each user generates their own key here. They configure this key in Claude Code
(X-JIG-API-Key header). JIG uses it to identify who is calling the MCP runtime.

Keys are shown exactly once on creation — like GitHub PATs.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.crypto import generate_mcp_key, hash_mcp_key
from app.models.mcp_api_key import MCPApiKey
from app.models.user import User

router = APIRouter()


@router.get("/")
async def list_keys(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    rows = (await db.execute(
        select(MCPApiKey)
        .where(MCPApiKey.user_id == user.id)
        .order_by(MCPApiKey.created_at.desc())
    )).scalars().all()
    return [
        {
            "id": str(k.id),
            "label": k.label,
            "key_prefix": k.key_prefix,
            "created_at": k.created_at.isoformat(),
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        }
        for k in rows
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_key(
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    key = generate_mcp_key()
    record = MCPApiKey(
        user_id=user.id,
        key_hash=hash_mcp_key(key),
        key_prefix=key[:12],
        label=body.get("label", "Default"),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Return the full key ONCE — it cannot be retrieved again
    return {
        "id": str(record.id),
        "key": key,
        "key_prefix": record.key_prefix,
        "label": record.label,
        "created_at": record.created_at.isoformat(),
    }


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_key(
    key_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    row = (await db.execute(
        select(MCPApiKey).where(MCPApiKey.id == key_id, MCPApiKey.user_id == user.id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Key not found")
    await db.delete(row)
    await db.commit()
