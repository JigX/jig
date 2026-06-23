import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserConnectorCredential(Base):
    """User-specific credential for a connector.

    Stored encrypted (Fernet, derived from SECRET_KEY).
    Used when connector.auth_mode == 'per_user' — the executor decrypts
    and uses this token instead of the global env-var credential.
    """
    __tablename__ = "user_connector_credentials"
    __table_args__ = (
        UniqueConstraint("user_id", "connector_id", name="uq_user_connector"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    connector_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False)

    # Fernet-encrypted credential (API token, password, etc.)
    credential_encrypted: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship()  # noqa: F821
    connector: Mapped["Connector"] = relationship()  # noqa: F821
