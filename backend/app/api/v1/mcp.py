"""JIG MCP Runtime — JSON-RPC endpoint (MCP Streamable HTTP protocol).

Authentication: X-JIG-API-Key header.
Set MCP_API_KEY env var on the backend pod.

Claude Code config (add to ~/.claude.json):
  {
    "mcpServers": {
      "jig-staging": {
        "type": "http",
        "url": "https://jig-staging.indeweygerlings.com/api/v1/mcp",
        "headers": { "X-JIG-API-Key": "<MCP_API_KEY>" }
      }
    }
  }
"""
from __future__ import annotations

import re
import secrets
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.capability import Capability
from app.models.connector import Connector
from app.models.policy import Policy, PolicyTier
from app.services.mcp_runtime.executor import execute_capability

log = structlog.get_logger()
router = APIRouter()

# In-memory pending confirmations: token → {connector, cap, policy, args}
_pending: dict[str, dict] = {}


def _safe(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def _check_api_key(x_jig_api_key: Annotated[str, Header()] = "") -> None:
    if not settings.mcp_api_key:
        raise HTTPException(status_code=503, detail="MCP runtime not configured (MCP_API_KEY not set)")
    if not secrets.compare_digest(x_jig_api_key, settings.mcp_api_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@router.post("/")
async def mcp_handler(
    body: dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    _: None = Depends(_check_api_key),
) -> dict:
    method = body.get("method", "")
    req_id = body.get("id", 0)

    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "JIG Governance Runtime", "version": settings.app_version},
            },
        }

    if method == "tools/list":
        tools = await _list_tools(db)
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}

    if method == "tools/call":
        params = body.get("params", {})
        text = await _call_tool(params.get("name", ""), params.get("arguments", {}), db)
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"content": [{"type": "text", "text": text}]},
        }

    return {
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


async def _list_tools(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(
        select(Connector, Capability, Policy)
        .join(Capability, Capability.connector_id == Connector.id)
        .join(Policy, Policy.capability_id == Capability.id)
    )).all()

    tools = []
    for connector, cap, policy in rows:
        if policy.tier == PolicyTier.deny:
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


async def _call_tool(tool_name: str, arguments: dict, db: AsyncSession) -> str:
    rows = (await db.execute(
        select(Connector, Capability, Policy)
        .join(Capability, Capability.connector_id == Connector.id)
        .join(Policy, Policy.capability_id == Capability.id)
    )).all()

    for connector, cap, policy in rows:
        if f"{_safe(connector.name)}_{_safe(cap.name)}" == tool_name:
            return await _dispatch(connector, cap, policy, dict(arguments), db)

    return f"[JIG] Unknown tool: {tool_name}"


async def _dispatch(connector: Connector, cap: Capability, policy: Policy, args: dict, db: AsyncSession) -> str:
    if policy.tier == PolicyTier.deny:
        await _audit(connector, cap, policy, args, "denied", None, db)
        return f"[JIG] Blocked: '{cap.name}' is disabled by policy."

    if policy.tier == PolicyTier.confirm:
        token = args.pop("_confirmation_token", None)
        if token is None:
            new_token = secrets.token_hex(16)
            _pending[new_token] = {"connector": connector, "cap": cap, "policy": policy, "args": args}
            await _audit(connector, cap, policy, args, "pending_confirmation", new_token, db)
            return (
                f"[JIG] Confirmation required for '{cap.name}'.\n"
                f"Re-call '{_safe(connector.name)}_{_safe(cap.name)}' "
                f"with _confirmation_token='{new_token}' to proceed."
            )
        if token not in _pending:
            return "[JIG] Invalid or expired confirmation token."
        p = _pending.pop(token)
        return await _run(p["connector"], p["cap"], p["policy"], p["args"], db, confirmed=True)

    return await _run(connector, cap, policy, args, db)


async def _run(
    connector: Connector, cap: Capability, policy: Policy,
    args: dict, db: AsyncSession, *, confirmed: bool = False,
) -> str:
    try:
        result = await execute_capability(connector, cap, args)
        outcome = "confirmed" if confirmed else "allowed"
    except Exception as exc:
        result = f"[JIG] Execution error: {exc}"
        outcome = "error"

    await _audit(connector, cap, policy, args, outcome, None, db)
    return result


async def _audit(
    connector: Connector, cap: Capability, policy: Policy,
    params: dict, outcome: str, token: str | None, db: AsyncSession,
) -> None:
    try:
        entry = AuditLog(
            connector_id=connector.id,
            capability_id=cap.id,
            principal="mcp-runtime",
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
