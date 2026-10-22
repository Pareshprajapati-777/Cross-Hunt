import json
from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Date, Time, Numeric, Text, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class Booking(Base):
    __tablename__ = "bookings_booking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts_user.id"), nullable=False)
    cross_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    public_tour_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_publictour.id"), nullable=True)

    booking_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    booking_type: Mapped[str] = mapped_column(String(20), default="TOUR", nullable=False)
    cabin_type: Mapped[str] = mapped_column(String(80), default="Royal Balcony Stateroom", nullable=False)
    event_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    event_package: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    qr_code_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    number_of_people: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    adults_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    selected_extras: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    duration_hours: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=1.0, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    extras_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    promo_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    owner_payout_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    platform_commission_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    net_platform_profit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)

    ticket_code: Mapped[str] = mapped_column(String(64), default="", index=True, nullable=False)
    ticket_status: Mapped[str] = mapped_column(String(20), default="VALID", index=True, nullable=False)

    special_request: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True, nullable=False)
    tracking_status: Mapped[str] = mapped_column(String(30), default="BOOKED", nullable=False)

    customer_whatsapp: Mapped[str] = mapped_column(String(30), default="", nullable=False)
    whatsapp_reminder_opt_in: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    whatsapp_reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    whatsapp_reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    whatsapp_reminder_status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", index=True, nullable=False)
    whatsapp_reminder_message_id: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    whatsapp_reminder_error: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    payment_status: Mapped[str] = mapped_column(String(25), default="PAID", index=True, nullable=False)
    payout_status: Mapped[str] = mapped_column(String(25), default="PENDING", index=True, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(60), default="UPI / NetBanking", nullable=False)
    payment_gateway_ref: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    refund_reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    refund_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="bookings")
    cross = relationship("Cross", back_populates="bookings")
    public_tour = relationship("PublicTour", back_populates="bookings")
    review = relationship("CrossReview", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    whatsapp_logs = relationship("WhatsAppMessageLog", back_populates="booking", cascade="all, delete-orphan")

    @property
    def extras_list(self) -> List[Any]:
        if not self.selected_extras:
            return []
        try:
            val = json.loads(self.selected_extras)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    @property
    def is_upcoming(self) -> bool:
        today = date.today()
        if self.booking_date > today:
            return True
        elif self.booking_date == today:
            return self.start_time > datetime.now().time()
        return False

    @property
    def is_cancellable(self) -> bool:
        return self.status in ("PENDING", "CONFIRMED") and self.is_upcoming

    @property
    def can_be_reviewed(self) -> bool:
        return self.status == "COMPLETED" and self.review is None


class SystemSetting(Base):
    __tablename__ = "bookings_systemsetting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, default="", nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class WhatsAppMessageLog(Base):
    __tablename__ = "bookings_whatsappmessagelog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bookings_booking.id"), nullable=True)
    recipient: Mapped[str] = mapped_column(String(30), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    message_type: Mapped[str] = mapped_column(String(30), default="TOUR_REMINDER", nullable=False)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(30), default="META_CLOUD", nullable=False)
    provider_message_id: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SENT", nullable=False)
    error_message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    booking = relationship("Booking", back_populates="whatsapp_logs")


class PlatformNotification(Base):
    __tablename__ = "bookings_platformnotification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(30), default="ANNOUNCEMENT", index=True, nullable=False)
    target_audience: Mapped[str] = mapped_column(String(30), default="ALL_USERS", index=True, nullable=False)
    target_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("accounts_user.id"), nullable=True)
    action_link: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    sender_name: Mapped[str] = mapped_column(String(100), default="Cross Hunt Admin", nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    recipients_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    target_user = relationship("User", back_populates="notifications")
