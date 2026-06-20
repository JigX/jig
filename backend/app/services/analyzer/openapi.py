"""OpenAPI spec parser → capability list."""
import httpx


async def parse_openapi(config: dict) -> list[dict]:
    """Fetch and parse an OpenAPI spec. Returns capability dicts."""
    spec_url = config.get("spec_url")
    spec_content = config.get("spec_content")  # direct JSON upload

    if spec_url:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(spec_url)
            resp.raise_for_status()
            spec = resp.json()
    elif spec_content:
        spec = spec_content
    else:
        return []

    capabilities = []
    paths = spec.get("paths", {})
    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue

            op_type = _method_to_operation_type(method)
            parameters_schema = _extract_parameters(operation)

            capabilities.append({
                "name": operation.get("operationId") or f"{method.upper()} {path}",
                "description": operation.get("summary") or operation.get("description"),
                "operation_type": op_type,
                "parameters_schema": parameters_schema,
            })

    return capabilities


def _method_to_operation_type(method: str) -> str:
    mapping = {
        "get": "read",
        "post": "write",
        "put": "write",
        "patch": "write",
        "delete": "delete",
    }
    return mapping.get(method, "execute")


def _extract_parameters(operation: dict) -> dict:
    params = {}
    for param in operation.get("parameters", []):
        params[param.get("name", "unknown")] = {
            "in": param.get("in"),
            "required": param.get("required", False),
            "schema": param.get("schema", {}),
        }
    body = operation.get("requestBody", {})
    if body:
        params["_body"] = body.get("content", {})
    return params
