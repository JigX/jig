import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
import enum


class ConnectorType(str, enum.Enum):
    openapi = "openapi"    # OpenAPI/Swagger spec URL or upload
    ssh = "ssh"            # SSH host
    mcp = "mcp"            # Existing MCP server
    graphql = "graphql"   # GraphQL endpoint


class ConnectorStatus(str, enum.Enum):
    pending = "pending"
    analyzing = "analyzing"
    ready = "ready"
    error = "error"


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[ConnectorType] = mapped_column(Enum(ConnectorType), nullable=False)
    status: Mapped[ConnectorStatus] = mapped_column(
        Enum(ConnectorStatus), default=ConnectorStatus.pending
    )

    # Type-specific config: endpoint URL, SSH host/user, MCP URL, etc.
    # Credentials are NEVER stored here — reference a vault key or k8s secret name
    config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Parsed raw spec (OpenAPI JSON, MCP tool list, SSH command inventory)
    raw_spec: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="connector", cascade="all, delete-orphan")  # noqa: F821
    capabilities: Mapped[list["Capability"]] = relationship(back_populates="connector", cascade="all, delete-orphan")  # noqa: F821
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="connector")  # noqa: F821
