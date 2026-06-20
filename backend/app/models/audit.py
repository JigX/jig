import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.policy import PolicyTier


class AuditLog(Base):
    """Immutable log of every MCP tool call through JIG."""
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connector_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("connectors.id"), nullable=False)
    capability_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("capabilities.id"), nullable=False)

    # Who called it (API key ID, user ID, or "anonymous")
    principal: Mapped[str] = mapped_column(String(255), nullable=False)

    # Parameters passed (PII must be masked before storage — see sanitize_params)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)

    # Policy decision at time of call
    policy_tier: Mapped[PolicyTier] = mapped_column(Enum(PolicyTier), nullable=False)

    # "allowed" | "denied" | "pending_confirmation" | "confirmed" | "timed_out"
    outcome: Mapped[str] = mapped_column(String(50), nullable=False)

    # Truncated response or error message
    response_summary: Mapped[str | None] = mapped_column(Text)

    # Confirmation token if tier == confirm
    confirmation_token: Mapped[str | None] = mapped_column(String(64))

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    connector: Mapped["Connector"] = relationship(back_populates="audit_logs")  # noqa: F821
    capability: Mapped["Capability"] = relationship(back_populates="audit_logs")  # noqa: F821
