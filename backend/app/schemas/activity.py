from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ActivityBase(BaseModel):
    title: str = Field(..., max_length=160)
    activity_type: str = Field(..., max_length=50)
    category_label: str = Field("Water Sports & Marine Adventures", max_length=80)
    category_group: str = Field("Water Sports", max_length=50)
    requires_boat: bool = False
    vessel_requirement_note: str = "Beach & Shore-Based (No Boat Needed)"
    available_dates_summary: str = "Available Daily • Today onwards"
    description: str = ""
    highlights: List[str] = []
    included_gear: List[str] = []
    safety_guidelines: str = ""
    requirements: str = ""
    price: Decimal = Field(..., gt=0)
    duration_minutes: int = Field(60, ge=15)
    difficulty_level: str = "MODERATE"
    capacity_per_slot: int = Field(8, ge=1)
    min_participants: int = Field(1, ge=1)
    pricing_type: str = "PER_PERSON"
    weather_conditions: str = "Operates in calm to moderate sea swell. Subject to wind/rain advisories."
    instructor_available: bool = True
    instructor_details: str = "Available • Certified Master Instructor"
    age_restrictions: str = "Operator-defined (Age 10+)"
    cancellation_policy: str = "Free cancellation up to 24 hours before start time (Operator Policy)"
    location: str = "Goa"
    departure_port: str = "Dona Paula Jetty"
    operating_hours: str = "08:00 AM - 05:30 PM"
    time_slots: List[str] = ["08:30 AM", "10:30 AM", "01:30 PM", "03:30 PM", "05:00 PM"]
    image: str = ""
    gallery: List[str] = []
    host_ship_id: Optional[int] = None
    auto_confirm: bool = True
    is_active: bool = True
    is_featured: bool = False


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    activity_type: Optional[str] = None
    category_label: Optional[str] = None
    category_group: Optional[str] = None
    requires_boat: Optional[bool] = None
    vessel_requirement_note: Optional[str] = None
    available_dates_summary: Optional[str] = None
    instructor_available: Optional[bool] = None
    instructor_details: Optional[str] = None
    age_restrictions: Optional[str] = None
    cancellation_policy: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    included_gear: Optional[List[str]] = None
    safety_guidelines: Optional[str] = None
    requirements: Optional[str] = None
    price: Optional[Decimal] = None
    pricing_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    capacity_per_slot: Optional[int] = None
    min_participants: Optional[int] = None
    weather_conditions: Optional[str] = None
    location: Optional[str] = None
    departure_port: Optional[str] = None
    operating_hours: Optional[str] = None
    time_slots: Optional[List[str]] = None
    image: Optional[str] = None
    gallery: Optional[List[str]] = None
    host_ship_id: Optional[int] = None
    auto_confirm: Optional[bool] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ActivityResponse(BaseModel):
    id: int
    title: str
    slug: str
    activity_type: str
    category_label: str
    category_group: str = "Water Sports"
    requires_boat: bool = False
    vessel_requirement_note: str = ""
    available_dates_summary: str = "Available Daily • Today onwards"
    instructor_available: bool = True
    instructor_details: str = "Available • Certified Master Instructor"
    age_restrictions: str = "Operator-defined (Age 10+)"
    cancellation_policy: str = "Free cancellation up to 24 hours before start time (Operator Policy)"
    additional_options: List[Dict[str, Any]] = []
    description: str
    highlights: List[str]
    included_gear: List[str]
    safety_guidelines: str
    requirements: str
    price: float
    starting_price: Optional[float] = None
    pricing_type: str = "PER_PERSON"
    duration_minutes: int
    duration_display: str
    difficulty_level: str
    capacity_per_slot: int
    min_participants: int = 1
    weather_conditions: str = "Operates in calm to moderate sea swell. Subject to wind/rain advisories."
    location: str
    departure_port: str
    operating_hours: str
    time_slots: List[str]
    image: str
    gallery: List[str]
    host_ship_id: Optional[int] = None
    host_ship_name: Optional[str] = None
    host_ship_category: Optional[str] = None
    host_ship_image: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: str
    owner_phone: str
    auto_confirm: bool = True
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
    selected_addons: Optional[List[Dict[str, Any]]] = None
    customer_whatsapp: Optional[str] = None
    promo_code: Optional[str] = None
    special_request: Optional[str] = None
    payment_method: Optional[str] = "UPI / Razorpay"
