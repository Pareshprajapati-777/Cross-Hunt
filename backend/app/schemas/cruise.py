from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class MatchEnginePayload(BaseModel):
    search_mode: Optional[str] = "PRIVATE_CHARTER"
    purpose: Optional[str] = None
    guests: Optional[int] = None
    passengers: Optional[int] = None
    date: Optional[str] = None
    budget: Optional[float] = None
    location: Optional[str] = None
    city: Optional[str] = None
    departure_port: Optional[str] = None
    destination: Optional[str] = None
    duration: Optional[float] = None
    vessel_category: Optional[str] = None
