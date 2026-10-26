from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import (
    Integer, String, DateTime, Date, Numeric, Text, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class OwnerPayout(Base):
    """
    Settlement payout record disbursed to an operator/vessel owner.
    Tracks net earnings transfers, bank account details, and bank UTR numbers.
    """
    __tablename__ = "crosses_ownerpayout"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts_user.id"), index=True, nullable=False)

    payout_reference: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    utr_number: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)  # COMPLETED, PENDING, PROCESSING, FAILED

    bank_name: Mapped[str] = mapped_column(String(100), default="HDFC Bank", nullable=False)
    account_number_masked: Mapped[str] = mapped_column(String(50), default="•••• •••• 4092", nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), default="HDFC0001234", nullable=False)
    payment_method: Mapped[str] = mapped_column(String(60), default="NEFT / Direct Bank Transfer", nullable=False)

    period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bookings_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)

    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    owner = relationship("User", foreign_keys=[owner_id])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "payout_reference": self.payout_reference,
            "utr_number": self.utr_number or "Awaiting UTR Generation",
            "amount": float(self.amount),
            "currency": self.currency,
            "status": self.status,
            "bank_name": self.bank_name,
            "account_number_masked": self.account_number_masked,
            "ifsc_code": self.ifsc_code,
            "payment_method": self.payment_method,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "bookings_count": self.bookings_count,
            "notes": self.notes or "",
            "processed_at": self.processed_at.strftime("%Y-%m-%d %H:%M") if self.processed_at else None,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None,
        }
