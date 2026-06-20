"""MCP Runtime Generator.

Given a connector with its capabilities and policies,
generates a live MCP server that enforces all policies at runtime.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

from mcp.server.fastmcp import FastMCP

from app.models.audit import AuditLog
from app.models.capability import Capability
from app.models.policy import Policy, PolicyTier


class PolicyViolation(Exception):
    pass


class ConfirmationRequired(Exception):
    def __init__(self, token: str) -> None:
        self.token = token
        super().__init__(f"Confirmation required. Token: {token}")


def build_mcp_server(
    connector_name: str,
    capabilities: list[tuple[Capability, Policy]],
) -> FastMCP:
    """Build and return a FastMCP server for the given connector + policies."""
    mcp = FastMCP(f"JIG:{connector_name}")

    for capability, policy in capabilities:
        _register_tool(mcp, capability, policy)

    return mcp


def _register_tool(mcp: FastMCP, capability: Capability, policy: Policy) -> None:
    cap_name = capability.name
    cap_desc = capability.description or cap_name
    tier = policy.tier

    # Pending confirmation tokens: token -> audit_log_id
    pending: dict[str, uuid.UUID] = {}

    async def tool_handler(**kwargs: Any) -> str:
        if tier == PolicyTier.deny:
            return f"[JIG] Geblokkeerd: '{cap_name}' is uitgeschakeld door het beleid."

        if tier == PolicyTier.confirm:
            # First call without token → issue confirmation token
            token = kwargs.pop("_confirmation_token", None)
            if token is None:
                new_token = secrets.token_hex(16)
                pending[new_token] = uuid.uuid4()
                return (
                    f"[JIG] Bevestiging vereist voor '{cap_name}'.\n"
                    f"Roep deze tool opnieuw aan met _confirmation_token='{new_token}' om te bevestigen."
                )
            if token not in pending:
                return "[JIG] Ongeldig of verlopen bevestigingstoken."
            del pending[token]

        # tier == allow or confirmed → execute
        return await _execute_capability(capability, kwargs)

    # Register with MCP — tool name must be a valid identifier
    safe_name = cap_name.replace(" ", "_").replace("-", "_").lower()
    mcp.tool(name=safe_name, description=cap_desc)(tool_handler)


async def _execute_capability(capability: Capability, params: dict[str, Any]) -> str:
    """Execute the actual capability. Dispatches per connector type."""
    # TODO: implement per ConnectorType
    # This is a stub — real implementation calls the connector (SSH, HTTP, MCP proxy)
    return f"[JIG] Capability '{capability.name}' uitgevoerd met params: {params}"
