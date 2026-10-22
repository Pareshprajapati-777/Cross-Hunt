from datetime import datetime
from typing import Dict, Any
from sqlalchemy import Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class Operator(Base):
    __tablename__ = "crosses_operator"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    location: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    whatsapp_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    email: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    website: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    booking_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    office_address: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    source_checked: Mapped[str] = mapped_column(String(80), default="01 Oct 2026", nullable=False)
    operator_type: Mapped[str] = mapped_column(String(50), default="PUBLIC_EXTERNAL", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    vessels = relationship("Cross", back_populates="operator")
    routes = relationship("Route", back_populates="operator")
    public_tours = relationship("PublicTour", back_populates="operator")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "location": self.location or "",
            "phone": self.phone or "",
            "whatsapp_number": self.whatsapp_number or "",
            "email": self.email or "",
            "website": self.website or "",
            "booking_url": self.booking_url or "",
            "office_address": self.office_address or "",
            "verified": bool(self.verified),
            "source_checked": bool(self.source_checked),
            "operator_type": self.operator_type or "PUBLIC_EXTERNAL",
            "vessels_count": len(self.vessels) if self.vessels else 0,
            "routes_count": len(self.routes) if self.routes else 0,
        }
