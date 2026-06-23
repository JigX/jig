"""Capability executor — dispatches to the real connector.

Credential resolution order for per_user connectors:
  1. UserConnectorCredential for the calling user
  2. Error (user must add their credential in JIG Settings)

For global connectors:
  1. env var SECRET_<UPPER_REF> (injected from K8s secret)
"""
from __future__ import annotations

import os

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.crypto import decrypt_credential
from app.models.capability import Capability
from app.models.connector import Connector, ConnectorAuthMode, ConnectorType
from app.models.user import User

log = structlog.get_logger()


async def execute_capability(
    connector: Connector,
    capability: Capability,
    params: dict,
    *,
    user: User | None = None,
    db: AsyncSession | None = None,
) -> str:
    match connector.type:
        case ConnectorType.openapi:
            return await _execute_rest(connector, capability, params, user=user, db=db)
        case ConnectorType.ssh:
            return "[JIG] SSH execution not yet implemented."
        case ConnectorType.mcp:
            return "[JIG] MCP proxy execution not yet implemented."
        case _:
            return f"[JIG] Connector type '{connector.type.value}' not implemented."


async def _resolve_api_key(
    connector: Connector, user: User | None, db: AsyncSession | None
) -> str:
    if connector.auth_mode == ConnectorAuthMode.per_user:
        if not user or not db:
            return ""
        from app.models.user_connector_credential import UserConnectorCredential
        row = (await db.execute(
            select(UserConnectorCredential).where(
                UserConnectorCredential.connector_id == connector.id,
                UserConnectorCredential.user_id == user.id,
            )
        )).scalar_one_or_none()
        if not row:
            raise ValueError(
                f"No credential found for connector '{connector.name}'. "
                "Add your personal token via JIG Settings → Connectors."
            )
        return decrypt_credential(settings.secret_key, row.credential_encrypted)

    # global mode — env var
    config = connector.config or {}
    secret_ref = config.get("api_key_secret_ref", "")
    if secret_ref:
        return os.environ.get(f"SECRET_{secret_ref.upper()}", "")
    return ""


async def _execute_rest(
    connector: Connector,
    capability: Capability,
    params: dict,
    *,
    user: User | None,
    db: AsyncSession | None,
) -> str:
    config = connector.config or {}
    base_url = config.get("base_url", "").rstrip("/")

    api_key = await _resolve_api_key(connector, user, db)

    http = capability.parameters_schema.get("_http", {})
    method = http.get("method", "POST").upper()
    path = http.get("path", "/")
    url = f"{base_url}{path}"

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        auth_type = config.get("auth_type", "bearer")
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {api_key}"

    clean_params = {k: v for k, v in params.items() if not k.startswith("_")}

    log.info("mcp_executor_rest", connector=connector.name, capability=capability.name,
             method=method, url=url, auth_mode=connector.auth_mode.value)

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers, params=clean_params)
        else:
            resp = await client.post(url, headers=headers, json=clean_params)

    if resp.status_code >= 400:
        return f"Error {resp.status_code}: {resp.text[:500]}"

    return resp.text[:4000]
