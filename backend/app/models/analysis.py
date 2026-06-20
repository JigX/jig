import uuid
import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AnalysisStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class Analysis(Base):
    """AI compliance analysis result for a connector."""
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connector_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("connectors.id"), nullable=False)

    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus), default=AnalysisStatus.queued
    )

    # 0-100, higher = riskier
    risk_score: Mapped[int | None] = mapped_column(Integer)

    # Free-form AI advice in Dutch
    ai_advice: Mapped[str | None] = mapped_column(Text)

    # Structured findings per regulation
    compliance_findings: Mapped[dict] = mapped_column(JSON, default=dict)
    # {
    #   "GDPR": {"status": "warning", "articles": ["Art. 5", "Art. 9"], "findings": "..."},
    #   "NIS2":  {"status": "ok",      "articles": [],                   "findings": "..."},
    #   "BIO":   {"status": "critical","articles": ["BIO 10.5"],          "findings": "..."},
    #   "AI_Act":{"status": "ok",      "articles": [],                   "findings": "..."},
    # }

    # Which AI model was used
    ai_model: Mapped[str | None] = mapped_column(Text)

    error_message: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    connector: Mapped["Connector"] = relationship(back_populates="analyses")  # noqa: F821
