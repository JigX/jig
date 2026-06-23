import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MCPApiKey(Base):
    """Per-user MCP API key for authenticating calls to the JIG MCP runtime.

    The full key is shown to the user exactly once on creation (like a GitHub PAT).
    Only the SHA-256 hash is stored here.
    """
    __tablename__ = "mcp_api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # SHA-256 hash of the full key — used for lookup + verification
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    # First 8 chars of the key (e.g. "jig_a1b2") — safe to display for identification
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)

    label: Mapped[str] = mapped_column(String(255), nullable=False, default="Default")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship()  # noqa: F821
