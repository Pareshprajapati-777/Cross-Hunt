from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import Integer, String, Boolean, DateTime, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class User(Base):
    __tablename__ = "accounts_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    username: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    email: Mapped[str] = mapped_column(String(254), index=True, nullable=False)
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_joined: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="USER", nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_picture: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_approved_owner: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    block_reason: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    wallet_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    crosses = relationship("Cross", back_populates="owner", cascade="all, delete-orphan", foreign_keys="Cross.owner_id")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan", foreign_keys="Booking.user_id")
    reviews = relationship("CrossReview", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("PlatformNotification", back_populates="target_user", cascade="all, delete-orphan")
    favorites = relationship("FavoriteShip", back_populates="user", cascade="all, delete-orphan")
    wallet_transactions = relationship("WalletTransaction", back_populates="user", cascade="all, delete-orphan", foreign_keys="WalletTransaction.user_id", order_by="desc(WalletTransaction.created_at)")

    @property
    def is_owner(self) -> bool:
        return self.role in ("OWNER", "CRUISE_OWNER", "CROSS_OWNER") or self.is_superuser

    @property
    def is_operator(self) -> bool:
        return self.is_owner

    @property
    def cruises(self):
        return self.crosses

    @property
    def is_admin(self) -> bool:
        return self.role == "ADMIN" or self.is_superuser or self.is_staff

    @property
    def full_name(self) -> str:
        fn = f"{self.first_name} {self.last_name}".strip()
        return fn or self.username

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "username": self.username,
            "first_name": self.first_name or "",
            "last_name": self.last_name or "",
            "full_name": self.full_name,
            "email": self.email or "",
            "phone": self.phone or "",
            "whatsapp_number": self.whatsapp_number or "",
            "address": self.address or "",
            "role": self.role,
            "is_staff": self.is_staff,
            "is_superuser": self.is_superuser,
            "is_owner": self.is_owner,
            "is_operator": self.is_operator,
            "is_admin": self.is_admin,
            "is_approved_owner": self.is_approved_owner,
            "is_verified": self.is_verified,
            "wallet_balance": float(self.wallet_balance or 0.0),
        }
