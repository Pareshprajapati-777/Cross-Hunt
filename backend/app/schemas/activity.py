from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ActivityBase(BaseModel):
    title: str = Field(..., max_length=160)
    activity_type: str = Field(..., max_length=50)
    category_label: str = Field("Water Sports & Marine Adventures", max_length=80)
    description: str = ""
    highlights: List[str] = []
    included_gear: List[str] = []
    safety_guidelines: str = ""
    requirements: str = ""
    price: Decimal = Field(..., gt=0)
    duration_minutes: int = Field(60, ge=15)
    difficulty_level: str = "MODERATE"
    capacity_per_slot: int = Field(8, ge=1)
    location: str = "Goa"
    departure_port: str = "Dona Paula Jetty"
    operating_hours: str = "08:00 AM - 05:30 PM"
    time_slots: List[str] = ["08:30 AM", "10:30 AM", "01:30 PM", "03:30 PM", "05:00 PM"]
    image: str = ""
    gallery: List[str] = []
    host_ship_id: int
    is_active: bool = True
    is_featured: bool = False


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    activity_type: Optional[str] = None
    category_label: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    included_gear: Optional[List[str]] = None
    safety_guidelines: Optional[str] = None
    requirements: Optional[str] = None
    price: Optional[Decimal] = None
    duration_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    capacity_per_slot: Optional[int] = None
    location: Optional[str] = None
    departure_port: Optional[str] = None
    operating_hours: Optional[str] = None
    time_slots: Optional[List[str]] = None
    image: Optional[str] = None
    gallery: Optional[List[str]] = None
    host_ship_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ActivityResponse(BaseModel):
    id: int
    title: str
    slug: str
    activity_type: str
    category_label: str
    description: str
    highlights: List[str]
    included_gear: List[str]
    safety_guidelines: str
    requirements: str
    price: float
    duration_minutes: int
    duration_display: str
    difficulty_level: str
    capacity_per_slot: int
    location: str
    departure_port: str
    operating_hours: str
    time_slots: List[str]
    image: str
    gallery: List[str]
    host_ship_id: int
    host_ship_name: str
    host_ship_category: str
    host_ship_image: str
    owner_id: Optional[int] = None
    owner_name: str
    owner_phone: str
    is_active: bool
    is_featured: bool
    rating: float
    reviews_count: int
    created_at: str


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int
    categories: List[Dict[str, Any]]


class ActivityBookingRequest(BaseModel):
    activity_id: int
    booking_date: str
    time_slot: str
    participants: int = Field(1, ge=1)
    customer_whatsapp: Optional[str] = None
    promo_code: Optional[str] = None
    special_request: Optional[str] = None
    payment_method: Optional[str] = "UPI / Razorpay"
