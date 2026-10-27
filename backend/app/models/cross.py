from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Date, Numeric, Text, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class Cross(Base):
    __tablename__ = "crosses_cross"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="YACHT", nullable=False)
    vessel_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    listing_type: Mapped[str] = mapped_column(String(30), default="PRIVATE_CHARTER", nullable=False)

    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    location: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    address: Mapped[str] = mapped_column(Text, default="", nullable=False)

    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    price_unit: Mapped[str] = mapped_column(String(30), default="PER_BOAT", nullable=False)
    is_quote_based: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duration_display: Mapped[str] = mapped_column(String(100), default="", nullable=False)

    tax_note: Mapped[str] = mapped_column(String(200), default="GST Extra as applicable", nullable=False)
    permit_note: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    fuel_surcharge_note: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    included: Mapped[str] = mapped_column(Text, default="", nullable=False)
    extra_charges: Mapped[str] = mapped_column(Text, default="", nullable=False)

    capacity: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    capacity_note: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    has_unknown_capacity: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    supports_private_charter: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_public_tours: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    supports_weddings: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_birthdays: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_corporate: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_conferences: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_parties: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_dinners: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    destination: Mapped[str] = mapped_column(String(150), default="Goa & Arabian Sea", nullable=False)
    route: Mapped[str] = mapped_column(String(250), default="Panaji - Mandovi River - Arabian Sea", nullable=False)
    departure_port: Mapped[str] = mapped_column(String(120), default="Panaji Jetty", nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    ship_length_meters: Mapped[int] = mapped_column(Integer, default=35, nullable=False)
    beam_meters: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    decks_count: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    cabin_count: Mapped[int] = mapped_column(Integer, default=4, nullable=False)

    itinerary_highlights: Mapped[str] = mapped_column(Text, default="", nullable=False)
    dining_venues: Mapped[str] = mapped_column(Text, default="", nullable=False)
    entertainment: Mapped[str] = mapped_column(Text, default="", nullable=False)

    image: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)

    facilities: Mapped[str] = mapped_column(Text, default="", nullable=False)
    rules: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cancellation_policy: Mapped[str] = mapped_column(Text, default="", nullable=False)

    source_url: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    source_checked: Mapped[str] = mapped_column(String(80), default="01 Oct 2026", nullable=False)
    last_verified_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    availability_status: Mapped[str] = mapped_column(String(30), default="AVAILABLE", nullable=False)

    registration_number: Mapped[str] = mapped_column(String(100), default="IND-GA-2024-REG", nullable=False)
    vessel_type: Mapped[str] = mapped_column(String(80), default="Motor Yacht", nullable=False)
    certifications: Mapped[str] = mapped_column(Text, default="IRS Seaworthiness Class A1, Annual Marine Safety Inspection Passed", nullable=False)
    maintenance_schedule: Mapped[str] = mapped_column(Text, default="Bi-weekly routine check; Next drydock inspection: Scheduled", nullable=False)
    supported_activities: Mapped[str] = mapped_column(Text, default="Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter", nullable=False)

    vessel_model: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    ac_status: Mapped[str] = mapped_column(String(30), default="AC", nullable=False)
    food_service: Mapped[str] = mapped_column(String(200), default="Catering and refreshments available", nullable=False)
    dj_music: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    decoration_service: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    photography_service: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    water_sports: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    extra_services: Mapped[str] = mapped_column(Text, default="", nullable=False)

    contact_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    whatsapp_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    email: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    website: Mapped[str] = mapped_column(String(400), default="", nullable=False)
    booking_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    is_external_operator: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    source_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    valid_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valid_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    price_review_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price_review_reason: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    operator_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_operator.id"), nullable=True)
    owner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("accounts_user.id"), nullable=True)

    # Relationships
    operator = relationship("Operator", back_populates="vessels")
    owner = relationship("User", back_populates="crosses", foreign_keys=[owner_id])
    extras = relationship("ShipExtra", back_populates="ship", cascade="all, delete-orphan")
    charter_rates = relationship("PrivateCharterRate", back_populates="vessel", cascade="all, delete-orphan")
    gallery_images = relationship("ShipImage", back_populates="ship", cascade="all, delete-orphan", order_by="ShipImage.order")
    maintenance_periods = relationship("ShipMaintenance", back_populates="ship", cascade="all, delete-orphan")
    public_tours = relationship("PublicTour", back_populates="ship", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="cross", cascade="all, delete-orphan")
    reviews = relationship("CrossReview", back_populates="cross", cascade="all, delete-orphan")

    @property
    def effective_category(self) -> str:
        return self.vessel_category or self.category

    @property
    def effective_operator_name(self) -> str:
        if self.operator:
            return self.operator.name
        if self.owner:
            return self.owner.full_name
        return "Cruise-Hunt Fleet"

    @property
    def display_capacity_text(self) -> str:
        if self.capacity_note:
            return self.capacity_note
        if self.has_unknown_capacity or not self.capacity:
            return "Contact operator"
        return f"Up to {self.capacity} guests"

    @property
    def formatted_price_basis(self) -> str:
        if self.is_quote_based or not self.price or self.price_unit == "QUOTE":
            return "Price on Request"
        unit_map = {
            "PER_PERSON": "/ person",
            "PER_CABIN": "/ cabin",
            "PER_BOAT": "/ boat",
            "PER_HOUR": "/ hour",
            "PER_DAY": "/ day",
        }
        unit_text = unit_map.get(self.price_unit, f"/ {self.price_unit.lower()}")
        if self.duration_display and self.price_unit == "PER_BOAT":
            return f"₹{float(self.price):,.0f} / {self.duration_display}"
        return f"₹{float(self.price):,.0f} {unit_text}"

    @property
    def display_image_url(self) -> str:
        if self.image:
            img = str(self.image)
            return img if img.startswith(("/media/", "http")) else f"/media/{img}"
        if self.image_url:
            return self.image_url.strip()
        return "/static/images/placeholder.png"

    def get_facilities_list(self) -> List[str]:
        if not self.facilities:
            return []
        return [item.strip() for item in self.facilities.replace("\n", ",").split(",") if item.strip()]

    @property
    def average_rating(self) -> float:
        if self.reviews:
            ratings = [r.rating for r in self.reviews]
            return round(sum(ratings) / len(ratings), 1)
        return 4.9

    @property
    def review_count(self) -> int:
        return len(self.reviews) if self.reviews else 0

    def supports_purpose(self, purpose_key: Optional[str]) -> bool:
        pk = (purpose_key or "").lower().strip()
        if "wedding" in pk:
            return self.supports_weddings
        elif "birthday" in pk:
            return self.supports_birthdays
        elif "corporate" in pk or "business" in pk:
            return self.supports_corporate
        elif "conference" in pk or "seminar" in pk:
            return self.supports_conferences
        elif "anniversary" in pk:
            return self.supports_birthdays or self.supports_weddings or self.supports_private_charter
        elif "party" in pk or "celebration" in pk:
            return self.supports_parties
        elif "dinner" in pk or "gala" in pk:
            return self.supports_dinners
        return self.supports_private_charter

    def get_all_gallery_urls(self) -> List[str]:
        urls = []
        cover = self.display_image_url
        if cover and cover != "/static/images/placeholder.png":
            urls.append(cover)
        for img in self.gallery_images:
            u = img.display_url
            if u and u not in urls:
                urls.append(u)
        if not urls:
            urls.append("/static/images/placeholder.png")
        return urls


# Backward compatibility aliases
Cruise = Cross
Ship = Cross
Vessel = Cross


class ShipExtra(Base):
    __tablename__ = "crosses_shipextra"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ship_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    pricing_mode: Mapped[str] = mapped_column(String(20), default="FIXED", nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    ship = relationship("Cross", back_populates="extras")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "price": float(self.price),
            "pricing_mode": self.pricing_mode,
            "is_available": bool(self.is_available),
        }


Extra = ShipExtra


class PrivateCharterRate(Base):
    __tablename__ = "crosses_privatecharterrate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vessel_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    duration: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_hours: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=1.0, nullable=False)
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    price_unit: Mapped[str] = mapped_column(String(30), default="PER_BOAT", nullable=False)
    is_quote_based: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    minimum_guests: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    maximum_guests: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    included: Mapped[str] = mapped_column(Text, default="", nullable=False)
    extra_charges: Mapped[str] = mapped_column(Text, default="", nullable=False)
    validity: Mapped[str] = mapped_column(String(120), default="2026 Season", nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    last_verified_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    vessel = relationship("Cross", back_populates="charter_rates")

    @property
    def formatted_display(self) -> str:
        if self.is_quote_based or self.price is None:
            return "Price on Request"
        return f"₹{float(self.price):,.0f} / {self.duration}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "duration": self.duration,
            "duration_hours": float(self.duration_hours),
            "price": float(self.price) if self.price is not None else None,
            "currency": self.currency,
            "price_unit": self.price_unit,
            "is_quote_based": bool(self.is_quote_based),
            "formatted_display": self.formatted_display,
            "minimum_guests": self.minimum_guests,
            "maximum_guests": self.maximum_guests,
            "included": self.included or "",
            "extra_charges": self.extra_charges or "",
            "validity": self.validity or "",
            "source": self.source or "",
        }


class ShipImage(Base):
    __tablename__ = "crosses_shipimage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ship_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    image: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(600), nullable=True)
    caption: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    ship = relationship("Cross", back_populates="gallery_images")

    @property
    def display_url(self) -> str:
        if self.image:
            img = str(self.image)
            return img if img.startswith(("/media/", "http")) else f"/media/{img}"
        if self.image_url:
            return self.image_url.strip()
        return "/static/images/placeholder.png"


VesselImage = ShipImage


class ShipMaintenance(Base):
    __tablename__ = "crosses_shipmaintenance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ship_id: Mapped[int] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(250), default="Scheduled Drydock & Safety Inspection", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    ship = relationship("Cross", back_populates="maintenance_periods")


class Route(Base):
    __tablename__ = "crosses_route"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operator_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_operator.id"), nullable=True)
    departure: Mapped[str] = mapped_column(String(150), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    duration: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    operator = relationship("Operator", back_populates="routes")
    tours = relationship("PublicTour", back_populates="route_ref")
