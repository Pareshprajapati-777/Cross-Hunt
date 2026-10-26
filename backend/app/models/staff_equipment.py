import json
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Date, Text, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base


class StaffMember(Base):
    """
    Staff member record managed by an operator/owner.
    Roles: INSTRUCTOR, CAPTAIN, GUIDE, SAFETY_CREW
    Enforces maximum supervision limit per time slot for water activities (e.g. Scuba diving, Surfing).
    """
    __tablename__ = "crosses_staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts_user.id"), index=True, nullable=False)
    operator_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_operator.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="INSTRUCTOR", nullable=False)  # INSTRUCTOR, CAPTAIN, GUIDE, SAFETY_CREW
    license_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    certifications: Mapped[str] = mapped_column(Text, default="", nullable=False)
    phone: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    email: Mapped[str] = mapped_column(String(100), default="", nullable=False)

    # Approved supervision capacity limit (e.g. max 4 participants for scuba diving, max 6 for surfing)
    max_supervision_limit: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, ON_DUTY, ON_LEAVE, INACTIVE

    # JSON list of activity slugs or activity IDs this staff member is certified to supervise
    assigned_activity_types_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    assigned_ship_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=True)

    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    assigned_ship = relationship("Cross", foreign_keys=[assigned_ship_id])

    @property
    def assigned_activity_types(self) -> List[str]:
        try:
            val = json.loads(self.assigned_activity_types_json)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "operator_id": self.operator_id,
            "name": self.name,
            "role": self.role,
            "license_number": self.license_number or "",
            "certifications": self.certifications or "",
            "phone": self.phone or "",
            "email": self.email or "",
            "max_supervision_limit": self.max_supervision_limit,
            "experience_years": self.experience_years,
            "status": self.status,
            "assigned_activity_types": self.assigned_activity_types,
            "assigned_ship_id": self.assigned_ship_id,
            "assigned_ship_name": self.assigned_ship.name if self.assigned_ship else None,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class EquipmentItem(Base):
    """
    Water sports & maritime safety equipment managed by an operator/owner.
    Categories: LIFE_JACKET, DIVING_EQUIPMENT, JET_SKI, SURFBOARD, RAFT, SNORKEL_GEAR, KAYAK, SAFETY_KIT, OTHER
    Condition statuses: OPERATIONAL, IN_USE, MAINTENANCE, RETIRED
    """
    __tablename__ = "crosses_equipment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts_user.id"), index=True, nullable=False)
    operator_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_operator.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    serial_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    total_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    condition_status: Mapped[str] = mapped_column(String(30), default="OPERATIONAL", nullable=False)  # OPERATIONAL, IN_USE, MAINTENANCE, RETIRED

    last_inspected_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_inspection_due: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    safety_certification: Mapped[str] = mapped_column(String(200), default="Certified for Marine Use", nullable=False)

    assigned_activity_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_activity.id"), nullable=True)
    assigned_ship_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("crosses_cross.id"), nullable=True)

    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    assigned_activity = relationship("Activity", foreign_keys=[assigned_activity_id])
    assigned_ship = relationship("Cross", foreign_keys=[assigned_ship_id])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "operator_id": self.operator_id,
            "name": self.name,
            "category": self.category,
            "serial_number": self.serial_number or "",
            "total_quantity": self.total_quantity,
            "condition_status": self.condition_status,
            "last_inspected_at": self.last_inspected_at.isoformat() if self.last_inspected_at else None,
            "next_inspection_due": self.next_inspection_due.isoformat() if self.next_inspection_due else None,
            "safety_certification": self.safety_certification or "",
            "assigned_activity_id": self.assigned_activity_id,
            "assigned_activity_title": self.assigned_activity.title if self.assigned_activity else None,
            "assigned_ship_id": self.assigned_ship_id,
            "assigned_ship_name": self.assigned_ship.name if self.assigned_ship else None,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
