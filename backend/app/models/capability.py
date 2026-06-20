import uuid
import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OperationType(str, enum.Enum):
    read = "read"
    write = "write"
    delete = "delete"
    admin = "admin"
    execute = "execute"


class SensitivityLevel(str, enum.Enum):
    public = "public"
    internal = "internal"
    confidential = "confidential"
    restricted = "restricted"   # PII, financial, medical


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Capability(Base):
    """A single discoverable operation/tool on a connector."""
    __tablename__ = "capabilities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connector_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("connectors.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    operation_type: Mapped[OperationType] = mapped_column(Enum(OperationType), nullable=False)
    sensitivity: Mapped[SensitivityLevel] = mapped_column(
        Enum(SensitivityLevel), default=SensitivityLevel.internal
    )
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.medium)

    # JSON Schema of parameters (from OpenAPI, MCP inputSchema, etc.)
    parameters_schema: Mapped[dict] = mapped_column(JSON, default=dict)

    # Data categories detected by AI (e.g. ["personal_data", "health_data"])
    data_categories: Mapped[list] = mapped_column(JSON, default=list)

    # Applicable regulation articles found (e.g. ["GDPR Art. 9", "BIO 10.5"])
    regulation_refs: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    connector: Mapped["Connector"] = relationship(back_populates="capabilities")  # noqa: F821
    policy: Mapped["Policy | None"] = relationship(back_populates="capability", uselist=False)  # noqa: F821
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="capability")  # noqa: F821
