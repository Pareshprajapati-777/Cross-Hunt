from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Date, Numeric, Text, ForeignKey, SmallInteger
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class Offer(Base):
    __tablename__ = "crosses_offer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    discount_type: Mapped[str] = mapped_column(String(20), default="PERCENTAGE", nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_booking_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    max_discount_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    def calculate_discount(self, amount: float | Decimal) -> Decimal:
        amount_dec = Decimal(str(amount))
        today = date.today()
        if not self.is_active or self.valid_from > today or self.valid_to < today:
            return Decimal("0.00")
        if amount_dec < self.min_booking_amount:
            return Decimal("0.00")

        if self.discount_type == "PERCENTAGE":
            disc = (amount_dec * self.discount_value) / Decimal("100.00")
            if self.max_discount_amount and disc > self.max_discount_amount:
                disc = self.max_discount_amount
            return Decimal(str(round(float(disc), 2)))
        else:
            disc = min(amount_dec, self.discount_value)
            return Decimal(str(round(float(disc), 2)))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "code": self.code,
            "title": self.title,
            "description": self.description or "",
            "discount_type": self.discount_type,
            "discount_value": float(self.discount_value),
            "min_booking_amount": float(self.min_booking_amount),
            "max_discount_amount": float(self.max_discount_amount) if self.max_discount_amount is not None else None,
            "valid_from": self.valid_from.strftime("%Y-%m-%d"),
            "valid_to": self.valid_to.strftime("%Y-%m-%d"),
            "is_active": bool(self.is_active),
        }


class CrossReview(Base):
    __tablename__ = "crosses_crossreview"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cross_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts_user.id"), nullable=False)
    booking_id: Mapped[int] = mapped_column(Integer, ForeignKey("bookings_booking.id"), unique=True, nullable=False)
    rating: Mapped[int] = mapped_column(SmallInteger, default=5, nullable=False)
    comment: Mapped[str] = mapped_column(Text, default="", nullable=False)
    has_complaint: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    complaint_category: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    complaint_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    complaint_status: Mapped[str] = mapped_column(String(50), default="NONE", nullable=False)
    warning_message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    warning_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    owner_response: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner_response_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cross = relationship("Cross", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    booking = relationship("Booking", back_populates="review")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "ship_id": self.cross_id,
            "ship_name": self.cross.name if self.cross else "Cruiser",
            "author": self.user.full_name if self.user else "Anonymous",
            "user": self.user.username if self.user else "Anonymous",
            "rating": self.rating,
            "comment": self.comment or "",
            "has_complaint": bool(self.has_complaint),
            "complaint_category": self.complaint_category or "",
            "complaint_text": self.complaint_text or "",
            "complaint_status": self.complaint_status or ("PENDING" if self.has_complaint else "NONE"),
            "warning_message": self.warning_message or "",
            "warning_sent_at": self.warning_sent_at.strftime("%Y-%m-%d %H:%M") if self.warning_sent_at else None,
            "owner_response": self.owner_response or "",
            "owner_response_at": self.owner_response_at.strftime("%Y-%m-%d %H:%M") if self.owner_response_at else None,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
            "date": self.created_at.strftime("%Y-%m-%d") if self.created_at else "",
        }

