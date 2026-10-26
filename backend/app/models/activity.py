import json
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Numeric, Text, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class Activity(Base):
    __tablename__ = "crosses_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    activity_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    category_label: Mapped[str] = mapped_column(String(80), default="Water Sports & Marine Adventures", nullable=False)
    
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    highlights_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    included_gear_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    safety_guidelines: Mapped[str] = mapped_column(String(300), default="Certified life jackets provided, professional instructors on board", nullable=False)
    requirements: Mapped[str] = mapped_column(String(250), default="Age 10+, basic swimming capability recommended", nullable=False)

    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=1999.00, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    difficulty_level: Mapped[str] = mapped_column(String(30), default="MODERATE", nullable=False)
    capacity_per_slot: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    min_participants: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    pricing_type: Mapped[str] = mapped_column(String(30), default="PER_PERSON", nullable=False)
    weather_conditions: Mapped[str] = mapped_column(String(250), default="Operates in calm to moderate sea swell. Subject to wind/rain advisories.", nullable=False)

    location: Mapped[str] = mapped_column(String(120), default="Goa Watersports Marina", nullable=False)
    departure_port: Mapped[str] = mapped_column(String(150), default="Dona Paula Jetty", nullable=False)
    operating_hours: Mapped[str] = mapped_column(String(100), default="08:00 AM - 05:30 PM", nullable=False)
    time_slots_json: Mapped[str] = mapped_column(Text, default='["08:30 AM", "10:30 AM", "01:30 PM", "03:30 PM", "05:00 PM"]', nullable=False)

    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    gallery_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    # Activity & Vessel separation:
    # An activity is an independent entity. Some activities require/include boat transport,
    # while others are beach, shore, or river based.
    category_group: Mapped[str] = mapped_column(String(50), default="Water Sports", nullable=False)
    requires_boat: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    vessel_requirement_note: Mapped[str] = mapped_column(String(150), default="Beach & Shore-Based (No Boat Needed)", nullable=False)
    available_dates_summary: Mapped[str] = mapped_column(String(150), default="Available Daily • Today onwards", nullable=False)

    # Activity Details Specification Fields
    instructor_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    instructor_details: Mapped[str] = mapped_column(String(150), default="Available • Certified Master Instructor", nullable=False)
    age_restrictions: Mapped[str] = mapped_column(String(150), default="Operator-defined (Age 10+)", nullable=False)
    cancellation_policy: Mapped[str] = mapped_column(String(250), default="Free cancellation up to 24 hours before start time (Operator Policy)", nullable=False)
    additional_options_json: Mapped[str] = mapped_column(Text, default='[{"id":"gopro","name":"4K GoPro Video & Photo Package","price":499},{"id":"vest","name":"Pro Impact Neoprene Vest","price":199},{"id":"pickup","name":"Hotel Pickup & Drop Transfer","price":799}]', nullable=False)

    # Host Vessel Link - Optional (NULL for beach/shore-based activities)
    host_ship_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=True)
    operator_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_operator.id"), nullable=True)
    owner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("accounts_user.id"), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 1), default=4.9, nullable=False)
    reviews_count: Mapped[int] = mapped_column(Integer, default=14, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    host_ship = relationship("Cross", foreign_keys=[host_ship_id])
    operator = relationship("Operator", foreign_keys=[operator_id])
    owner = relationship("User", foreign_keys=[owner_id])

    @property
    def highlights(self) -> List[str]:
        try:
            val = json.loads(self.highlights_json)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    @property
    def included_gear(self) -> List[str]:
        try:
            val = json.loads(self.included_gear_json)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    @property
    def time_slots(self) -> List[str]:
        try:
            val = json.loads(self.time_slots_json)
            return val if isinstance(val, list) else ["09:00 AM", "11:30 AM", "02:30 PM", "04:30 PM"]
        except Exception:
            return ["09:00 AM", "11:30 AM", "02:30 PM", "04:30 PM"]

    @property
    def gallery(self) -> List[str]:
        try:
            val = json.loads(self.gallery_json)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    @property
    def additional_options(self) -> List[Dict[str, Any]]:
        try:
            val = json.loads(self.additional_options_json)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "activity_type": self.activity_type,
            "category_label": self.category_label,
            "category_group": self.category_group,
            "requires_boat": self.requires_boat,
            "vessel_requirement_note": self.vessel_requirement_note,
            "available_dates_summary": self.available_dates_summary,
            "instructor_available": self.instructor_available,
            "instructor_details": self.instructor_details,
            "age_restrictions": self.age_restrictions,
            "cancellation_policy": self.cancellation_policy,
            "additional_options": self.additional_options,
            "description": self.description,
            "highlights": self.highlights,
            "included_gear": self.included_gear,
            "safety_guidelines": self.safety_guidelines,
            "requirements": self.requirements,
            "price": float(self.price),
            "starting_price": float(self.price),
            "duration_minutes": self.duration_minutes,
            "duration_display": f"{self.duration_minutes} Mins" if self.duration_minutes < 120 else f"{self.duration_minutes // 60} Hours",
            "difficulty_level": self.difficulty_level,
            "capacity_per_slot": self.capacity_per_slot,
            "min_participants": self.min_participants,
            "pricing_type": self.pricing_type,
            "weather_conditions": self.weather_conditions,
            "location": self.location,
            "departure_port": self.departure_port,
            "operating_hours": self.operating_hours,
            "time_slots": self.time_slots,
            "image": self.image,
            "gallery": self.gallery,
            "host_ship_id": self.host_ship_id,
            "host_ship_name": self.host_ship.name if self.host_ship else ("Boat Transport Included" if self.requires_boat else "Beach & Shore Based"),
            "host_ship_category": self.host_ship.category if self.host_ship else ("Speedboat / Charter" if self.requires_boat else "Shore / Beach"),
            "host_ship_image": self.host_ship.display_image_url if self.host_ship else "",
            "owner_id": self.owner_id,
            "owner_name": f"{self.owner.first_name} {self.owner.last_name}".strip() if self.owner and (self.owner.first_name or self.owner.last_name) else (self.operator.name if self.operator else "Fleet Owner"),
            "owner_phone": self.host_ship.whatsapp_number if self.host_ship and self.host_ship.whatsapp_number else (self.owner.phone if self.owner and self.owner.phone else "+919820012345"),
            "is_active": self.is_active,
            "is_featured": self.is_featured,
            "rating": float(self.rating),
            "reviews_count": self.reviews_count,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }
