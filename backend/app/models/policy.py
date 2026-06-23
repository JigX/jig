import uuid
import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PolicyTier(str, enum.Enum):
    allow = "allow"       # Auto-approve, execute immediately
    confirm = "confirm"   # Require human confirmation token before executing
    deny = "deny"         # Always block, return error to caller


class Policy(Base):
    """Permission rule for a capability.

    user_id = NULL  → global policy (applies to all users without a personal override)
    user_id = <id>  → per-user override (takes precedence over the global policy)
    """
    __tablename__ = "policies"
    __table_args__ = (
        UniqueConstraint("capability_id", "user_id", name="uq_policy_capability_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    capability_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("capabilities.id"), nullable=False
    )

    # NULL = global; set = per-user override
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    tier: Mapped[PolicyTier] = mapped_column(Enum(PolicyTier), default=PolicyTier.confirm)

    # Rate limiting (calls per hour, None = unlimited)
    rate_limit_per_hour: Mapped[int | None] = mapped_column(Integer)

    # Always write to audit log regardless of tier
    require_audit: Mapped[bool] = mapped_column(Boolean, default=True)

    # Optional: restrict to specific principals (user IDs, API key prefixes)
    # Empty list = any authenticated caller
    allowed_principals: Mapped[list] = mapped_column(JSON, default=list)

    # Optional parameter constraints (e.g., {"host": {"pattern": "^10\\.100\\."}})
    parameter_constraints: Mapped[dict] = mapped_column(JSON, default=dict)

    # Free-form justification written by the admin
    justification: Mapped[str | None] = mapped_column()

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    capability: Mapped["Capability"] = relationship(back_populates="policy")  # noqa: F821
