"""Compliance analysis engine.

Builds a prompt from capability metadata + regulation knowledge,
calls the AI client, and parses structured findings per regulation.
"""
from __future__ import annotations

import json

from app.models.capability import Capability
from app.services.ai.client import AIClient, AIMessage
from app.services.compliance.regulations.gdpr import GDPR_CONTEXT
from app.services.compliance.regulations.nis2 import NIS2_CONTEXT
from app.services.compliance.regulations.bio import BIO_CONTEXT


REGULATIONS = {
    "GDPR": GDPR_CONTEXT,
    "NIS2": NIS2_CONTEXT,
    "BIO": BIO_CONTEXT,
}

SYSTEM_PROMPT = """Je bent een AI compliance-analist gespecialiseerd in Nederlandse en Europese wet- en regelgeving voor IT-systemen bij overheidsinstanties en semi-publieke organisaties (zoals CRV).

Analyseer de gegeven API-capability en geef een gestructureerde compliance-beoordeling per regulering.

Geef je antwoord UITSLUITEND als geldig JSON met deze structuur:
{
  "risk_score": <0-100>,
  "ai_advice": "<kort advies in het Nederlands, max 3 zinnen>",
  "default_policy_tier": "<allow|confirm|deny>",
  "compliance": {
    "GDPR":  {"status": "<ok|warning|critical>", "articles": [...], "findings": "<uitleg>"},
    "NIS2":  {"status": "<ok|warning|critical>", "articles": [...], "findings": "<uitleg>"},
    "BIO":   {"status": "<ok|warning|critical>", "articles": [...], "findings": "<uitleg>"}
  }
}
"""


async def analyze_capability(capability: Capability, ai_client: AIClient) -> dict:
    """Run compliance analysis on a single capability. Returns raw AI response dict."""
    reg_context = "\n\n".join(
        f"=== {name} ===\n{ctx}" for name, ctx in REGULATIONS.items()
    )

    user_msg = f"""Analyseer de volgende capability:

Naam: {capability.name}
Beschrijving: {capability.description or "(geen beschrijving)"}
Operatie type: {capability.operation_type.value}
Parameters: {json.dumps(capability.parameters_schema, indent=2)}

{reg_context}

Geef de compliance-beoordeling als JSON."""

    messages = [
        AIMessage(role="system", content=SYSTEM_PROMPT),
        AIMessage(role="user", content=user_msg),
    ]

    response = await ai_client.chat(messages, temperature=0.05)

    # Strip markdown code blocks if the model wraps JSON in them
    content = response.content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    return json.loads(content)
