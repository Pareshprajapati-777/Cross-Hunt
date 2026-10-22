from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel


class CreateBookingPayload(BaseModel):
    cruise_id: Optional[int] = None
    cruise_slug: Optional[str] = None
    rate_id: Optional[int] = None
    public_tour_id: Optional[int] = None
    public_tour_slug: Optional[str] = None
    booking_type: Optional[str] = "TOUR"
    booking_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    passengers_count: Optional[int] = None
    adults_count: Optional[int] = None
    children_count: Optional[int] = None
    number_of_people: Optional[int] = None
    cabin_type: Optional[str] = None
    event_type: Optional[str] = None
    event_package: Optional[str] = None
    selected_extras: Optional[List[Union[Dict[str, Any], str]]] = []
    promo_code: Optional[str] = None
    special_requests: Optional[str] = None
    special_request: Optional[str] = None
    customer_whatsapp: Optional[str] = None
    whatsapp_reminder_opt_in: Optional[bool] = True


class CancelBookingPayload(BaseModel):
    reason: Optional[str] = "Cancelled by user"


class ReviewPayload(BaseModel):
    rating: int
    comment: str
    has_complaint: Optional[bool] = False
    complaint_category: Optional[str] = ""
    complaint_text: Optional[str] = ""


class WhatsAppOptPayload(BaseModel):
    opt_in: bool
    whatsapp_number: Optional[str] = None
