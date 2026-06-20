"""MCP server analyzer — discovers tools from an existing MCP endpoint."""
import httpx


async def discover_mcp(config: dict) -> list[dict]:
    """Call MCP server's tools/list endpoint and return capabilities."""
    url = config.get("url", "")
    headers = {}
    if api_key := config.get("api_key"):
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # MCP HTTP transport: POST /mcp with JSON-RPC
            resp = await client.post(
                url,
                json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}},
                headers={"Content-Type": "application/json", **headers},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    tools = data.get("result", {}).get("tools", [])
    capabilities = []
    for tool in tools:
        capabilities.append({
            "name": tool.get("name", "unknown"),
            "description": tool.get("description"),
            "operation_type": _infer_operation_type(tool.get("name", "")),
            "parameters_schema": tool.get("inputSchema", {}).get("properties", {}),
        })
    return capabilities


def _infer_operation_type(tool_name: str) -> str:
    name = tool_name.lower()
    if any(kw in name for kw in ("delete", "remove", "drop", "truncate")):
        return "delete"
    if any(kw in name for kw in ("create", "update", "write", "insert", "run", "exec", "send")):
        return "write"
    if any(kw in name for kw in ("admin", "configure", "restart", "shutdown")):
        return "admin"
    return "read"
