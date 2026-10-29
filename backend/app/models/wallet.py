from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import Integer, String, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class WalletTransaction(Base):
    __tablename__ = "accounts_wallet_transaction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts_user.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bookings_booking.id", ondelete="SET NULL"), nullable=True, index=True)
    booking_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)

    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # CREDIT, DEBIT
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # CANCELLATION_REFUND, OPERATOR_REFUND, TOPUP, BOOKING_PAYMENT, ADMIN_ADJUSTMENT
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="wallet_transactions")
    booking = relationship("Booking")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "booking_id": self.booking_id,
            "booking_code": self.booking_code or "",
            "transaction_type": self.transaction_type,
            "amount": float(self.amount or 0.0),
            "balance_after": float(self.balance_after or 0.0),
            "source": self.source,
            "description": self.description or "",
            "reference_id": self.reference_id or "",
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }
