"""SSH connector analyzer.

For SSH, capabilities are manually defined in the connector config
(since we can't auto-discover arbitrary shell commands safely).
The config specifies which commands are allowed and their parameters.
"""


async def discover_ssh(config: dict) -> list[dict]:
    """Return capabilities from the ssh connector's command manifest."""
    host = config.get("host", "unknown")
    commands = config.get("commands", [])

    capabilities = []
    for cmd in commands:
        capabilities.append({
            "name": cmd.get("name", cmd.get("command", "unknown_command")),
            "description": cmd.get("description") or f"SSH command on {host}: {cmd.get('command')}",
            "operation_type": cmd.get("operation_type", "execute"),
            "parameters_schema": cmd.get("parameters", {}),
        })

    # If no commands defined, expose a generic ssh_run capability
    if not capabilities:
        capabilities.append({
            "name": "ssh_run",
            "description": f"Execute arbitrary command on {host} via SSH",
            "operation_type": "execute",
            "parameters_schema": {
                "command": {"type": "string", "description": "Shell command to execute"},
            },
        })

    return capabilities
