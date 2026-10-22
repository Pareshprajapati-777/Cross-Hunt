import json
import re
import os
from decimal import Decimal
from datetime import datetime, date, time
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.core.config import settings
from backend.app.models.cross import Cross, ShipExtra, Route, PrivateCharterRate
from backend.app.models.operator import Operator
from backend.app.models.tour import PublicTour
from backend.app.models.booking import Booking
from backend.app.models.user import User

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


def get_openai_client():
    api_key = settings.OPENAI_API_KEY
    if not api_key or not HAS_OPENAI:
        return None
    try:
        return OpenAI(api_key=api_key)
    except Exception:
        return None


def lookup_user_ticket(code: str, user: Optional[User] = None, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Securely looks up booking and ticket details by ticket_code or booking_id.
    Strictly verifies ownership:
    - If user is not authenticated -> returns error requiring login.
    - If ticket belongs to someone else -> returns forbidden security error.
    - Never exposes confidential admin margins or owner payouts.
    """
    if not code:
        return {"success": False, "error": "empty_code", "message": "Kripya valid ticket ya booking code enter karein."}

    code = str(code).strip()
    clean_code = code.lstrip("#").strip()

    if not db:
        return {"success": False, "error": "db_error", "message": "Database session not available."}

    booking = db.query(Booking).filter(
        or_(
            Booking.ticket_code.ilike(clean_code),
            Booking.booking_id.ilike(clean_code),
            Booking.qr_code_hash.ilike(clean_code)
        )
    ).first()

    if not booking:
        return {
            "success": False,
            "error": "not_found",
            "message": f"Ticket / Booking code '{clean_code}' system me nahi mila. Kripya code check karein."
        }

    # Ownership & Security Verification
    if not user:
        return {
            "success": False,
            "error": "auth_required",
            "requires_login": True,
            "message": f"Ticket code '{clean_code}' mil gaya hai, lekin details dekhne ke liye kripya Cross-Hunt account me Sign In karein.",
            "actions": [{"label": "Sign In to View Ticket", "url": "/login", "type": "navigate"}]
        }

    is_owner = (booking.user_id == user.id)
    is_admin = user.is_admin
    is_vessel_operator = (booking.cross.owner_id == user.id if booking.cross and booking.cross.owner_id else False)

    if not (is_owner or is_admin or is_vessel_operator):
        return {
            "success": False,
            "error": "forbidden",
            "message": f"Ye ticket #{clean_code} kisi aur passenger account se linked hai. Privacy aur security guidelines ke tehat aap sirf apni bookings dekh sakte hain.",
            "actions": [{"label": "View My Bookings", "url": "/dashboard", "type": "navigate"}]
        }

    ship = booking.cross
    op_name = ship.effective_operator_name if ship else "Cross-Hunt Fleet"
    dep_port = booking.public_tour.departure_port if booking.public_tour else (ship.departure_port if ship else "")
    dest = booking.public_tour.destination if booking.public_tour else (ship.destination if ship else "")

    status_labels = {
        "PENDING": "Pending Confirmation ⏳",
        "CONFIRMED": "Confirmed ✅",
        "CANCELLED": "Cancelled ❌",
        "COMPLETED": "Completed 🏁",
        "REJECTED": "Rejected ⚠️",
    }

    tracking_labels = {
        "BOOKED": "Reservation Placed 📝",
        "CONFIRMED": "Confirmed & Scheduled 🚢",
        "BOARDING": "Boarding Now at Jetty 🎫",
        "DEPARTED": "Departed / Sailing 🌊",
        "ARRIVED": "Arrived at Destination ⚓",
        "COMPLETED": "Voyage Completed ✨",
        "CANCELLED": "Voyage Cancelled ❌",
    }

    ticket_status_labels = {
        "VALID": "Valid Boarding Pass 🟢",
        "USED": "Boarded / Used 🎟️",
        "CANCELLED": "Cancelled 🔴",
        "EXPIRED": "Expired ⚪",
    }

    ticket_data = {
        "booking_id": booking.booking_id,
        "ticket_code": booking.ticket_code or booking.booking_id,
        "passenger_name": booking.user.full_name if booking.user else "Passenger",
        "passenger_email": booking.user.email if booking.user else "",
        "ship_name": ship.name if ship else "",
        "ship_slug": ship.slug if ship else str(booking.cross_id),
        "ship_category": ship.effective_category if ship else "",
        "operator_name": op_name,
        "booking_type": "Private Ship Charter" if booking.booking_type == "EVENT" else "Public Cruise Tour Ticket",
        "route": f"{dep_port} → {dest}",
        "departure_port": dep_port,
        "destination": dest,
        "departure_date": booking.booking_date.strftime("%d %b %Y"),
        "departure_time": booking.start_time.strftime("%I:%M %p") if booking.start_time else "TBD",
        "end_time": booking.end_time.strftime("%I:%M %p") if booking.end_time else "TBD",
        "cabin_seat": booking.cabin_type or "General Guest Access",
        "event_type": booking.event_type or "",
        "total_passengers": booking.number_of_people,
        "adults_count": booking.adults_count,
        "children_count": booking.children_count,
        "extras": [ex.get("name", "Extra") if isinstance(ex, dict) else str(ex) for ex in booking.extras_list],
        "total_price_inr": float(booking.total_price),
        "booking_status": status_labels.get(booking.status, booking.status),
        "ticket_status": ticket_status_labels.get(booking.ticket_status, booking.ticket_status),
        "tracking_status": tracking_labels.get(booking.tracking_status, booking.tracking_status),
        "is_used": booking.ticket_status == "USED",
    }

    actions = [
        {"label": "🎫 View Ticket / Boarding Pass", "url": f"/ticket/verify/{booking.ticket_code or booking.booking_id}", "type": "navigate", "variant": "primary"},
        {"label": "🚢 My Dashboard Trips", "url": "/dashboard", "type": "navigate", "variant": "outline"},
        {"label": "⚓ Ship Details", "url": f"/cruises/{ship.slug if ship else booking.cross_id}", "type": "navigate", "variant": "ghost"},
    ]

    return {
        "success": True,
        "ticket": ticket_data,
        "actions": actions
    }


def extract_requirements_from_text(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    requirements: Dict[str, Any] = {}

    guest_match = re.search(r"(\d+)\s*(?:guests?|people|persons?|pax|log|members?|adults?)", text_lower)
    if guest_match:
        requirements["guests"] = int(guest_match.group(1))

    duration_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hours?|ghante?|hrs?|h)\b", text_lower)
    if duration_match:
        requirements["duration_hours"] = float(duration_match.group(1))

    if "birthday" in text_lower or "janamdin" in text_lower:
        requirements["purpose"] = "Birthday Party"
    elif "wedding" in text_lower or "shaadi" in text_lower or "marriage" in text_lower or "reception" in text_lower:
        requirements["purpose"] = "Wedding Celebration"
    elif "corporate" in text_lower or "office" in text_lower or "meeting" in text_lower or "conference" in text_lower:
        requirements["purpose"] = "Corporate Event"
    elif "anniversary" in text_lower or "saalgirah" in text_lower:
        requirements["purpose"] = "Anniversary Celebration"
    elif "party" in text_lower or "celebration" in text_lower:
        requirements["purpose"] = "Private Party"

    locations = ["goa", "mumbai", "kochi", "cochin", "andaman", "port blair", "havelock", "kerala", "lakshadweep", "chennai"]
    for loc in locations:
        if loc in text_lower:
            requirements["location"] = loc.capitalize()
            break

    ticket_match = re.search(r"\b(CH\d+[A-Z0-9-]*|CH-[A-Z0-9-]+|TKT-[A-Z0-9-]+|CRS-\d+-[A-Z0-9]+)\b", text, re.IGNORECASE)
    if ticket_match:
        code_found = ticket_match.group(1).upper()
        if any(char.isdigit() for char in code_found) or "-" in code_found:
            requirements["ticket_code"] = code_found

    return requirements


def smart_local_rag_respond(query: str, user: Optional[User] = None, db: Optional[Session] = None) -> Dict[str, Any]:
    q_lower = query.lower().strip()
    extracted = extract_requirements_from_text(query)
    data: Dict[str, Any] = {}

    # Ticket lookup
    ticket_code = extracted.get("ticket_code")
    if not ticket_code:
        code_candidates = re.findall(r"[A-Za-z0-9_-]{5,20}", query)
        for c in code_candidates:
            c_up = c.upper()
            if (c_up.startswith("CH") or c_up.startswith("TKT") or c_up.startswith("CRS")) and (any(ch.isdigit() for ch in c_up) or "-" in c_up):
                ticket_code = c_up
                break

    if ticket_code or "ticket" in q_lower or "booking code" in q_lower or "boarding pass" in q_lower:
        if ticket_code and db:
            lookup = lookup_user_ticket(ticket_code, user, db)
            if lookup.get("success"):
                t = lookup["ticket"]
                data["ticket"] = t
                reply = (
                    f"Sure! Here are your verified booking details for **#{t['ticket_code']}** 🎫\n\n"
                    f"• **Passenger:** {t['passenger_name']}\n"
                    f"• **Ship / Vessel:** {t['ship_name']} ({t['operator_name']})\n"
                    f"• **Type:** {t['booking_type']}\n"
                    f"• **Route:** {t['route']}\n"
                    f"• **Date & Time:** {t['departure_date']} at {t['departure_time']}\n"
                    f"• **Cabin / Seat:** {t['cabin_seat']}\n"
                    f"• **Headcount:** {t['total_passengers']} Passenger(s) ({t['adults_count']} Adults, {t['children_count']} Children)\n"
                    f"• **Booking Status:** {t['booking_status']}\n"
                    f"• **Boarding Status:** {t['ticket_status']}\n"
                    f"• **Journey Progress:** {t['tracking_status']}\n"
                    f"• **Total Fare:** ₹{t['total_price_inr']:,.2f}\n"
                )
                if t["extras"]:
                    reply += f"• **Selected Extras:** {', '.join(t['extras'])}\n"
                reply += "\nClick the action button below to view your digital QR boarding pass!"
                return {
                    "reply": reply,
                    "actions": lookup.get("actions", []),
                    "data": data
                }
            else:
                return {
                    "reply": f"🐬 **Cross-Hunt AI:**\n{lookup.get('message')}",
                    "actions": lookup.get("actions", [{"label": "Go to Dashboard", "url": "/dashboard", "type": "navigate"}]),
                    "data": {}
                }
        elif user and db:
            my_bookings = db.query(Booking).filter(Booking.user_id == user.id).order_by(Booking.created_at.desc()).limit(3).all()
            if my_bookings:
                reply = "Here are your recent Cross-Hunt bookings:\n\n"
                for b in my_bookings:
                    t_code = b.ticket_code or b.booking_id
                    reply += (
                        f"🎫 **Booking #{t_code}**\n"
                        f"• Ship: {b.cross.name if b.cross else 'Vessel'}\n"
                        f"• Date: {b.booking_date.strftime('%d %b %Y')}\n"
                        f"• Status: {b.status} | Pass: {b.ticket_status}\n\n"
                    )
                reply += "Which booking would you like to inspect? Provide the code or click Dashboard below."
                return {
                    "reply": reply,
                    "actions": [
                        {"label": "Open Dashboard", "url": "/dashboard", "type": "navigate", "variant": "primary"},
                        {"label": "Explore More Trips", "url": "/explore", "type": "navigate", "variant": "outline"}
                    ]
                }
            else:
                return {
                    "reply": "You don't have any active bookings yet. Explore our private yacht charters or scheduled public tours! 🚢✨",
                    "actions": [
                        {"label": "Browse Public Cruises", "url": "/tours", "type": "navigate", "variant": "primary"},
                        {"label": "Explore Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"}
                    ]
                }
        else:
            return {
                "reply": "To view your ticket, please enter your **Ticket Code** or **Booking ID** (e.g. `CRS-2026-XXXXXX` or `TK-XXXXXX`), or Sign In to your account. 🎫",
                "actions": [
                    {"label": "Sign In", "url": "/login", "type": "navigate", "variant": "primary"},
                    {"label": "Go to Home", "url": "/", "type": "navigate", "variant": "outline"}
                ]
            }

    # Guide queries
    if any(w in q_lower for w in ["kaha", "kahan", "kaise", "where", "how to", "steps", "guide", "kidhar", "cancel", "refund"]):
        if "cancel" in q_lower or "refund" in q_lower:
            reply = (
                "🐬 **Cancellation & Refund Policy:**\n\n"
                "• **Public Tours:** Full refund for cancellations made at least 48 hours before departure. 50% between 24-48 hours, non-refundable within 24 hours.\n"
                "• **Private Charters:** Governed by operator terms.\n"
                "• **How to Cancel:** Open Dashboard (`/dashboard`) → Select Booking → Click `Cancel Booking`."
            )
            return {
                "reply": reply,
                "actions": [{"label": "Go to Dashboard", "url": "/dashboard", "type": "navigate", "variant": "primary"}]
            }
        else:
            reply = (
                "🐬 **Booking Steps on Cross-Hunt:**\n\n"
                "1. **Explore:** Browse `/explore` for private yachts or `/tours` for scheduled public voyages.\n"
                "2. **Select:** Choose your destination (Goa, Mumbai, Kochi, Andaman) and vessel.\n"
                "3. **Customize:** Pick departure dates, stateroom cabins, and add-on extras.\n"
                "4. **Confirm:** Complete reservation to receive your verified digital QR Boarding Pass!"
            )
            return {
                "reply": reply,
                "actions": [
                    {"label": "Explore Ships", "url": "/explore", "type": "navigate", "variant": "primary"},
                    {"label": "Public Tours", "url": "/tours", "type": "navigate", "variant": "outline"}
                ]
            }

    # General welcome or recommendation
    reply = (
        "Welcome to **Cross-Hunt**! 🐬⚓\n\n"
        "I am your maritime AI assistant. You can ask me to:\n"
        "• Find private yacht charters in Goa, Mumbai, Kochi, or the Andaman Islands.\n"
        "• Book seats on Cordelia Cruises or scenic sunset river voyages.\n"
        "• Track and verify your digital boarding pass and ticket code.\n"
        "• Plan marine weddings, birthdays, and corporate celebrations."
    )
    return {
        "reply": reply,
        "actions": [
            {"label": "Explore Ships", "url": "/explore", "type": "navigate", "variant": "primary"},
            {"label": "View Public Tours", "url": "/tours", "type": "navigate", "variant": "outline"},
            {"label": "My Dashboard", "url": "/dashboard", "type": "navigate", "variant": "ghost"}
        ]
    }


def get_ai_suggestions_list(user: Optional[User] = None) -> List[Dict[str, str]]:
    if user:
        return [
            {"id": "my_tickets", "label": "🎫 My Active Tickets & Passes", "query": "Meri upcoming trip aur ticket ka status kya hai?"},
            {"id": "goa_charter", "label": "🚢 Sunset Yacht in Goa", "query": "Goa me Mandovi river sunset yacht charter ke options bataiye."},
            {"id": "cordelia", "label": "🌊 Cordelia Cruise Ocean Liner", "query": "Cordelia cruises ke Mumbai to Goa sailing schedules dikhaiye."},
            {"id": "events", "label": "🎉 Private Birthday Celebration", "query": "30 guests ke liye birthday celebration package cruise par kaise book karein?"},
        ]
    return [
        {"id": "explore_ships", "label": "🚢 Explore Luxury Vessels", "query": "Cross-Hunt par kaun se luxury yachts aur ships available hain?"},
        {"id": "lookup_ticket", "label": "🎫 Look up My Ticket", "query": "Mera ticket code verify karein."},
        {"id": "cordelia", "label": "🌊 Ocean Liner Sailings", "query": "Cordelia Cruise Mumbai to Goa ki dates aur fares kya hain?"},
        {"id": "andaman", "label": "🏝️ Andaman Catamaran Ferries", "query": "Havelock aur Neil Island ke fast catamarans ki details bataiye."},
    ]


def generate_ai_chat_response(
    messages: List[Dict[str, str]],
    user: Optional[User] = None,
    current_path: str = "/",
    db: Optional[Session] = None
) -> Dict[str, Any]:
    latest_query = ""
    for msg in reversed(messages):
        if isinstance(msg, dict) and msg.get("role") == "user":
            latest_query = msg.get("content", "").strip()
            break
        elif isinstance(msg, str):
            latest_query = msg.strip()
            break

    return smart_local_rag_respond(latest_query or "Hello", user=user, db=db)
