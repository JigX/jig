"""JIG MCP Runtime — JSON-RPC endpoint (MCP Streamable HTTP protocol).

Authentication: X-JIG-API-Key header — each user generates their own key in
JIG Settings. JIG resolves the key to a user, applies their policies, and
uses their connector credential (or the global service credential).

Claude Code config (per user, add to ~/.claude.json):
  {
    "mcpServers": {
      "jig": {
        "type": "http",
        "url": "https://jig.indeweygerlings.com/api/v1/mcp",
        "headers": { "X-JIG-API-Key": "<your personal key from JIG Settings>" }
      }
    }
  }
"""
from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import hash_mcp_key
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.capability import Capability
from app.models.connector import Connector
from app.models.mcp_api_key import MCPApiKey
from app.models.policy import Policy, PolicyTier
from app.models.user import User
from app.services.mcp_runtime.executor import execute_capability

log = structlog.get_logger()
router = APIRouter()

# In-memory pending confirmation tokens: token → {connector, cap, policy, args, user}
_pending: dict[str, dict] = {}


def _safe(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


async def _resolve_user(x_jig_api_key: str, db: AsyncSession) -> User:
    if not x_jig_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="X-JIG-API-Key required")

    key_hash = hash_mcp_key(x_jig_api_key)
    row = (await db.execute(
        select(MCPApiKey, User)
        .join(User, MCPApiKey.user_id == User.id)
        .where(MCPApiKey.key_hash == key_hash)
    )).one_or_none()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    mcp_key, user = row
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

    mcp_key.last_used_at = datetime.now(UTC)
    await db.commit()
    return user


async def _get_policy(capability_id, user_id, db: AsyncSession) -> Policy | None:
    """User-specific policy takes precedence over the global policy."""
    user_pol = (await db.execute(
        select(Policy).where(Policy.capability_id == capability_id, Policy.user_id == user_id)
    )).scalar_one_or_none()
    if user_pol:
        return user_pol
    return (await db.execute(
        select(Policy).where(Policy.capability_id == capability_id, Policy.user_id == None)  # noqa: E711
    )).scalar_one_or_none()


@router.post("/")
async def mcp_handler(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_jig_api_key: Annotated[str, Header()] = "",
) -> dict:
    user = await _resolve_user(x_jig_api_key, db)
    method = body.get("method", "")
    req_id = body.get("id", 0)

    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "JIG Governance Runtime", "version": "0.1.0"},
            },
        }

    if method == "tools/list":
        tools = await _list_tools(user, db)
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}

    if method == "tools/call":
        params = body.get("params", {})
        text = await _call_tool(params.get("name", ""), params.get("arguments", {}), user, db)
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"content": [{"type": "text", "text": text}]},
        }

    return {
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


async def _list_tools(user: User, db: AsyncSession) -> list[dict]:
    rows = (await db.execute(
        select(Connector, Capability)
        .join(Capability, Capability.connector_id == Connector.id)
    )).all()

    tools = []
    for connector, cap in rows:
        policy = await _get_policy(cap.id, user.id, db)
        if not policy or policy.tier == PolicyTier.deny:
            continue

        props = {k: v for k, v in cap.parameters_schema.items() if k != "_http"}
        desc = cap.description or cap.name

        if policy.tier == PolicyTier.confirm:
            desc += " ⚠️ Requires confirmation — first call returns a token, re-call with _confirmation_token to execute."
            props["_confirmation_token"] = {
                "type": "string",
                "description": "Confirmation token from the previous call",
            }

        tools.append({
            "name": f"{_safe(connector.name)}_{_safe(cap.name)}",
            "description": desc,
            "inputSchema": {"type": "object", "properties": props},
        })

    return tools


async def _call_tool(tool_name: str, arguments: dict, user: User, db: AsyncSession) -> str:
    rows = (await db.execute(
        select(Connector, Capability)
        .join(Capability, Capability.connector_id == Connector.id)
    )).all()

    for connector, cap in rows:
        if f"{_safe(connector.name)}_{_safe(cap.name)}" == tool_name:
            policy = await _get_policy(cap.id, user.id, db)
            if not policy:
                return f"[JIG] No policy configured for '{cap.name}'."
            return await _dispatch(connector, cap, policy, dict(arguments), user, db)

    return f"[JIG] Unknown tool: {tool_name}"


async def _dispatch(
    connector: Connector, cap: Capability, policy: Policy,
    args: dict, user: User, db: AsyncSession,
) -> str:
    if policy.tier == PolicyTier.deny:
        await _audit(connector, cap, policy, args, "denied", None, user, db)
        return f"[JIG] Blocked: '{cap.name}' is disabled by policy."

    if policy.tier == PolicyTier.confirm:
        token = args.pop("_confirmation_token", None)
        if token is None:
            new_token = secrets.token_hex(16)
            _pending[new_token] = {
                "connector": connector, "cap": cap, "policy": policy,
                "args": args, "user": user,
            }
            await _audit(connector, cap, policy, args, "pending_confirmation", new_token, user, db)
            return (
                f"[JIG] Confirmation required for '{cap.name}'.\n"
                f"Re-call '{_safe(connector.name)}_{_safe(cap.name)}' "
                f"with _confirmation_token='{new_token}' to proceed."
            )
        if token not in _pending:
            return "[JIG] Invalid or expired confirmation token."
        p = _pending.pop(token)
        return await _run(p["connector"], p["cap"], p["policy"], p["args"], p["user"], db, confirmed=True)

    return await _run(connector, cap, policy, args, user, db)


async def _run(
    connector: Connector, cap: Capability, policy: Policy,
    args: dict, user: User, db: AsyncSession, *, confirmed: bool = False,
) -> str:
    try:
        result = await execute_capability(connector, cap, args, user=user, db=db)
        outcome = "confirmed" if confirmed else "allowed"
    except Exception as exc:
        result = f"[JIG] Execution error: {exc}"
        outcome = "error"

    await _audit(connector, cap, policy, args, outcome, None, user, db)
    return result


async def _audit(
    connector: Connector, cap: Capability, policy: Policy,
    params: dict, outcome: str, token: str | None, user: User, db: AsyncSession,
) -> None:
    try:
        entry = AuditLog(
            connector_id=connector.id,
            capability_id=cap.id,
            principal=str(user.id),
            parameters={k: v for k, v in params.items() if not k.startswith("_")},
            policy_tier=policy.tier,
            outcome=outcome,
            confirmation_token=token,
            response_summary=None,
        )
        db.add(entry)
        await db.commit()
    except Exception as exc:
        log.warning("audit_log_failed", error=str(exc))
