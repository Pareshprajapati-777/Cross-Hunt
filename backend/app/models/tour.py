from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Date, Time, Numeric, Text, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class PublicTour(Base):
    __tablename__ = "crosses_publictour"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ship_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    operator_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_operator.id"), nullable=True)
    route_ref_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_route.id"), nullable=True)

    tour_title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    departure_port: Mapped[str] = mapped_column(String(150), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    departure_time: Mapped[time] = mapped_column(Time, nullable=False)
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_time: Mapped[time] = mapped_column(Time, nullable=False)

    duration_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_display: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    total_capacity: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    booked_capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    adult_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    child_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    price_unit: Mapped[str] = mapped_column(String(30), default="PER_PERSON", nullable=False)
    is_live_pricing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    itinerary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ports_of_call: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    meals_included: Mapped[str] = mapped_column(String(200), default="All Gourmet Meals & High Tea Included", nullable=False)
    tax_note: Mapped[str] = mapped_column(String(200), default="GST & Port Taxes Extra", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    image_url: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    source_checked: Mapped[str] = mapped_column(String(80), default="01 Oct 2026", nullable=False)
    last_verified_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    ship = relationship("Cross", back_populates="public_tours")
    operator = relationship("Operator", back_populates="public_tours")
    route_ref = relationship("Route", back_populates="tours")
    fares = relationship("TourFare", back_populates="public_tour", cascade="all, delete-orphan")
    cabins = relationship("TourCabin", back_populates="tour", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="public_tour")

    @property
    def remaining_capacity(self) -> int:
        return max(0, self.total_capacity - self.booked_capacity)

    @property
    def is_bookable(self) -> bool:
        return (
            self.is_published
            and self.status in ("SCHEDULED", "AVAILABLE", "BOARDING")
            and self.remaining_capacity > 0
        )


class TourFare(Base):
    __tablename__ = "crosses_tourfare"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_tour_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_publictour.id"), nullable=False)
    cabin_type: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    price_unit: Mapped[str] = mapped_column(String(30), default="PER_PERSON", nullable=False)
    taxes: Mapped[str] = mapped_column(String(150), default="GST & Port Charges Extra", nullable=False)
    validity: Mapped[str] = mapped_column(String(120), default="2026 Scheduled Sailing", nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    last_verified_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    public_tour = relationship("PublicTour", back_populates="fares")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "cabin_type": self.cabin_type,
            "price": float(self.price) if self.price is not None else None,
            "currency": self.currency,
            "price_unit": self.price_unit,
            "taxes": self.taxes or "",
            "validity": self.validity or "",
            "source": self.source or "",
        }


class TourCabin(Base):
    __tablename__ = "crosses_tourcabin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tour_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_publictour.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    price_per_person: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    total_capacity: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    booked_capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    tour = relationship("PublicTour", back_populates="cabins")

    @property
    def remaining_capacity(self) -> int:
        return max(0, self.total_capacity - self.booked_capacity)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "price_per_person": float(self.price_per_person),
            "total_capacity": self.total_capacity,
            "booked_capacity": self.booked_capacity,
            "remaining_capacity": self.remaining_capacity,
        }
