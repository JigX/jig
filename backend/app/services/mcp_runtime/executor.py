"""Capability executor — dispatches to the real connector."""
from __future__ import annotations

import os
import re

import httpx
import structlog

from app.models.capability import Capability
from app.models.connector import Connector, ConnectorType

log = structlog.get_logger()


async def execute_capability(connector: Connector, capability: Capability, params: dict) -> str:
    match connector.type:
        case ConnectorType.openapi:
            return await _execute_rest(connector, capability, params)
        case ConnectorType.ssh:
            return "[JIG] SSH execution not yet implemented."
        case ConnectorType.mcp:
            return "[JIG] MCP proxy execution not yet implemented."
        case _:
            return f"[JIG] Connector type '{connector.type.value}' not implemented."


async def _execute_rest(connector: Connector, capability: Capability, params: dict) -> str:
    config = connector.config or {}
    base_url = config.get("base_url", "").rstrip("/")

    # API key: stored as env var SECRET_<UPPER_REF> (injected from K8s secret)
    secret_ref = config.get("api_key_secret_ref", "")
    api_key = ""
    if secret_ref:
        env_key = f"SECRET_{secret_ref.upper()}"
        api_key = os.environ.get(env_key, "")

    http = capability.parameters_schema.get("_http", {})
    method = http.get("method", "POST").upper()
    path = http.get("path", "/")
    url = f"{base_url}{path}"

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        auth_type = config.get("auth_type", "bearer")
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {api_key}"

    # Strip internal JIG meta-params before forwarding
    clean_params = {k: v for k, v in params.items() if not k.startswith("_")}

    log.info("mcp_executor_rest", connector=connector.name, capability=capability.name, method=method, url=url)

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers, params=clean_params)
        else:
            resp = await client.post(url, headers=headers, json=clean_params)

    if resp.status_code >= 400:
        return f"Error {resp.status_code}: {resp.text[:500]}"

    return resp.text[:4000]
