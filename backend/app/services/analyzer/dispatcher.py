"""Capability discovery + compliance analysis pipeline.

Flow:
  1. Load connector from DB
  2. Dispatch to type-specific parser (OpenAPI / SSH / MCP)
  3. For each discovered capability: run AI compliance analysis
  4. Save capabilities + default policies + analysis result to DB
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.analysis import Analysis, AnalysisStatus
from app.models.capability import Capability, OperationType, RiskLevel, SensitivityLevel
from app.models.connector import Connector, ConnectorStatus, ConnectorType
from app.models.policy import Policy, PolicyTier
from app.services.ai.client import get_ai_client
from app.services.compliance.engine import analyze_capability

log = structlog.get_logger()


async def analyze_connector(connector_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        return

    connector.status = ConnectorStatus.analyzing
    analysis = Analysis(connector_id=connector.id, status=AnalysisStatus.running)
    db.add(analysis)
    await db.commit()

    try:
        capabilities = await _discover_capabilities(connector)
        ai_client = get_ai_client()

        overall_risk = 0
        all_findings: dict = {}

        for cap_data in capabilities:
            cap = Capability(
                connector_id=connector.id,
                name=cap_data["name"],
                description=cap_data.get("description"),
                operation_type=OperationType(cap_data["operation_type"]),
                parameters_schema=cap_data.get("parameters_schema", {}),
            )
            db.add(cap)
            await db.flush()  # get cap.id

            try:
                findings = await analyze_capability(cap, ai_client)
                cap.risk_level = _score_to_risk(findings.get("risk_score", 50))
                cap.sensitivity = _infer_sensitivity(findings)
                cap.regulation_refs = _extract_refs(findings)

                # Default policy based on AI recommendation
                default_tier = PolicyTier(findings.get("default_policy_tier", "confirm"))
                policy = Policy(capability_id=cap.id, tier=default_tier)
                db.add(policy)

                overall_risk = max(overall_risk, findings.get("risk_score", 0))
                all_findings[cap.name] = findings.get("compliance", {})

            except Exception as e:
                log.warning("capability_analysis_failed", cap=cap.name, error=str(e))
                policy = Policy(capability_id=cap.id, tier=PolicyTier.confirm)
                db.add(policy)

        analysis.status = AnalysisStatus.completed
        analysis.risk_score = overall_risk
        analysis.compliance_findings = all_findings
        analysis.ai_model = ai_client.__class__.__name__
        analysis.completed_at = datetime.now(UTC)
        connector.status = ConnectorStatus.ready

    except Exception as e:
        log.error("connector_analysis_failed", connector_id=str(connector_id), error=str(e))
        analysis.status = AnalysisStatus.failed
        analysis.error_message = str(e)
        connector.status = ConnectorStatus.error

    await db.commit()


async def _discover_capabilities(connector: Connector) -> list[dict]:
    if connector.type == ConnectorType.openapi:
        from app.services.analyzer.openapi import parse_openapi
        return await parse_openapi(connector.config)
    elif connector.type == ConnectorType.ssh:
        from app.services.analyzer.ssh import discover_ssh
        return await discover_ssh(connector.config)
    elif connector.type == ConnectorType.mcp:
        from app.services.analyzer.mcp import discover_mcp
        return await discover_mcp(connector.config)
    else:
        return []


def _score_to_risk(score: int) -> RiskLevel:
    if score >= 80:
        return RiskLevel.critical
    if score >= 60:
        return RiskLevel.high
    if score >= 30:
        return RiskLevel.medium
    return RiskLevel.low


def _infer_sensitivity(findings: dict) -> SensitivityLevel:
    compliance = findings.get("compliance", {})
    for reg in compliance.values():
        if reg.get("status") == "critical":
            return SensitivityLevel.restricted
        if reg.get("status") == "warning":
            return SensitivityLevel.confidential
    return SensitivityLevel.internal


def _extract_refs(findings: dict) -> list[str]:
    refs = []
    for reg_name, reg_data in findings.get("compliance", {}).items():
        for article in reg_data.get("articles", []):
            refs.append(f"{reg_name} {article}")
    return refs
