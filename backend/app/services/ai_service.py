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
from backend.app.models.activity import Activity
from backend.app.models.booking import Booking
from backend.app.models.user import User

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


CRUISE_HUNT_SYSTEM_PROMPT = """You are the AI Concierge for Cruise-Hunt (India's premier luxury cruise, private yacht charter, and water sports booking platform).

CORE PLATFORM KNOWLEDGE BASE:
1. Public Cruises & Scheduled Tours (/tours):
   - Premium ocean voyages including Cordelia Cruises (Mumbai to Goa, Lakshadweep, Kochi), Goa Mandovi River sunset cruises, and Andaman inter-island catamarans.
   - Individual per-passenger ticketing with cabin choices: Ocean View Suite, Private Balcony, Stateroom, and General Access. Gourmet meals and high tea included.
2. Private Yacht Charters (/explore):
   - Exclusive private vessel rentals in Goa, Mumbai, Kochi, and the Andaman Islands.
   - Tailored hourly bookings (2h, 4h, full-day) for couples, families, and private gatherings.
   - Add-on services: Chef catering, DJ sound setup, drone photography, birthday/anniversary decor.
3. Water Sports & Marine Adventures (/activities):
   - PADI-certified Scuba Diving (Grand Island Goa, Havelock Andaman), Twin-Turbo Jet Skiing, Ocean Parasailing, Snorkeling, Surfing, and Speed Boating.
4. Private Events & Celebrations (/events):
   - Marine weddings, milestone birthdays, corporate retreats, DJ yacht parties with end-to-end event production.
5. Cruise-Hunt Wallet & Instant UPI QR Top-up:
   - Dedicated digital wallet for fast 1-click checkouts and split payments (Wallet + UPI).
   - Fast UPI Top-up: Click Wallet in navbar or dashboard, select amount (+₹500, +₹1,000, +₹2,000, +₹5,000 or custom), scan the dynamic UPI QR with any UPI app (GPay, PhonePe, Paytm), and click 'Payment Done' for instant credit.
   - Automatic, instant refunds on cancelled rides credited directly to wallet balance (zero bank wait).
   - Note: Passenger-only feature (Admin and Owner accounts manage fleet/operations, not passenger wallet).
6. Digital Boarding Pass & Live QR Gate Entry (/ticket/verify/{code}):
   - Unique Ticket Code (e.g. CRS-2026-XXXX) and encrypted QR boarding pass generated immediately upon booking.
   - Passengers display pass on phone or download from dashboard.
   - Ship owners/operators scan passes at boarding gate using the live Camera QR Scanner on their Command Center (/owner). 1-second gate verification updates pass to USED.
7. Cancellation & Refunds:
   - Passengers can cancel upcoming voyages directly from /dashboard.
   - Public Tours: 100% refund for cancellations >= 48 hours before departure; 50% between 24-48 hours; non-refundable within 24 hours.
   - Refund is credited automatically and instantly to the user's Cruise-Hunt Wallet.
8. Reviews & Complaints:
   - Strictly restricted to completed voyages (COMPLETED status). Upcoming voyages do not permit reviews or complaints to maintain authentic feedback.
9. 24-Hour WhatsApp Alerts & Live Voyage Tracking:
   - Automated booking confirmation and 24-hour pre-departure voyage reminder with jetty directions, weather forecast, and direct QR pass link.
   - Live voyage statuses: BOOKED -> CONFIRMED -> BOARDING -> DEPARTED -> ARRIVED -> COMPLETED.

STRICT RESPONSE RULES:
1. MEDIUM LENGTH ONLY: Answers must be concise, crisp, and strictly 2 to 4 bullet points or short paragraphs (maximum 120-180 words). Never output lengthy essays, repetitive filler, or walls of text.
2. LANGUAGE MATCHING: If user writes in Hindi or Hinglish, answer in polite, natural Hinglish. If in English, answer in polished, professional English.
3. FORMATTING: Use bold highlights and clean bullet points.
4. ACTION SUGGESTIONS: Always recommend 1 to 3 relevant site URLs (e.g. /tours, /explore, /activities, /dashboard, /ticket/verify/..., /owner).
"""


def get_openai_client() -> Optional[Any]:
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
            "message": f"Ticket code '{clean_code}' mil gaya hai, lekin details dekhne ke liye kripya Cruise-Hunt account me Sign In karein.",
            "actions": [{"label": "Sign In to View Ticket", "url": "/login", "type": "navigate", "variant": "primary"}]
        }

    is_owner = (booking.user_id == user.id)
    is_admin = getattr(user, "is_admin", False)
    is_vessel_operator = (booking.cross.owner_id == user.id if booking.cross and booking.cross.owner_id else False)

    if not (is_owner or is_admin or is_vessel_operator):
        return {
            "success": False,
            "error": "forbidden",
            "message": f"Ye ticket #{clean_code} kisi aur passenger account se linked hai. Privacy guidelines ke tehat aap sirf apni bookings dekh sakte hain.",
            "actions": [{"label": "View My Bookings", "url": "/dashboard", "type": "navigate", "variant": "primary"}]
        }

    ship = booking.cross
    op_name = ship.effective_operator_name if ship else "Cruise-Hunt Fleet"
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
        {"label": "🎫 View Boarding Pass", "url": f"/ticket/verify/{booking.ticket_code or booking.booking_id}", "type": "navigate", "variant": "primary"},
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

    if any(k in text_lower for k in ["birthday", "janamdin"]):
        requirements["purpose"] = "Birthday Party"
    elif any(k in text_lower for k in ["wedding", "shaadi", "marriage", "reception"]):
        requirements["purpose"] = "Wedding Celebration"
    elif any(k in text_lower for k in ["corporate", "office", "meeting", "conference", "retreat"]):
        requirements["purpose"] = "Corporate Event"
    elif any(k in text_lower for k in ["anniversary", "saalgirah"]):
        requirements["purpose"] = "Anniversary Celebration"
    elif any(k in text_lower for k in ["party", "celebration", "cocktail", "dj"]):
        requirements["purpose"] = "Private Party"

    locations = ["goa", "mumbai", "kochi", "cochin", "andaman", "port blair", "havelock", "kerala", "lakshadweep", "chennai"]
    for loc in locations:
        if loc in text_lower:
            requirements["location"] = loc.capitalize()
            break

    ticket_match = re.search(r"\b(TK-[A-Z0-9-]+|TKT-[A-Z0-9-]+|CRS-[A-Z0-9-]+|CH-[A-Z0-9-]+|CH\d+[A-Z0-9-]*)\b", text, re.IGNORECASE)
    if ticket_match:
        code_found = ticket_match.group(1).upper()
        if any(char.isdigit() for char in code_found) or "-" in code_found:
            requirements["ticket_code"] = code_found

    return requirements


def smart_local_rag_respond(query: str, user: Optional[User] = None, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Intelligent semantic RAG responding with up-to-date Cruise-Hunt knowledge.
    Strictly medium-length answers (2-4 bullet points or short paragraphs),
    bilingual support (Hindi/Hinglish/English), and live database retrieval.
    """
    q_lower = query.lower().strip()
    extracted = extract_requirements_from_text(query)
    is_hindi = any(w in q_lower for w in ["kaha", "kahan", "kaise", "kya", "mera", "meri", "mere", "batao", "bataiye", "paise", "karein", "hai", "hain", "ko", "se", "chahiye", "karo", "tikit", "tikit", "dekhna", "wapas"])

    # 1. TICKET & BOARDING PASS LOOKUP
    ticket_code = extracted.get("ticket_code")
    if not ticket_code:
        code_candidates = re.findall(r"[A-Za-z0-9_-]{5,20}", query)
        for c in code_candidates:
            c_up = c.upper()
            if (c_up.startswith("CH") or c_up.startswith("TKT") or c_up.startswith("TK") or c_up.startswith("CRS")) and (any(ch.isdigit() for ch in c_up) or "-" in c_up):
                ticket_code = c_up
                break

    is_ticket_query = bool(ticket_code) or any(k in q_lower for k in ["ticket", "booking code", "tikit", "mera pass", "meri booking", "my pass", "my ticket", "check ticket"])
    if is_ticket_query and not any(k in q_lower for k in ["cancel", "refund", "scan"]):
        if ticket_code and db:
            lookup = lookup_user_ticket(ticket_code, user, db)
            if lookup.get("success"):
                t = lookup["ticket"]
                reply = (
                    f"🎫 **Verified Boarding Pass #{t['ticket_code']}**\n\n"
                    f"• **Vessel & Route:** {t['ship_name']} • {t['route']}\n"
                    f"• **Schedule:** {t['departure_date']} at {t['departure_time']} ({t['cabin_seat']})\n"
                    f"• **Status:** {t['ticket_status']} | **Booking:** {t['booking_status']}\n"
                    f"• **Passengers:** {t['total_passengers']} Guest(s) • Total: ₹{t['total_price_inr']:,.2f}\n\n"
                    f"Neeche button par click karke aap apna digital QR boarding pass gate entry ke liye dekh sakte hain!"
                    if is_hindi else
                    f"🎫 **Verified Boarding Pass #{t['ticket_code']}**\n\n"
                    f"• **Vessel & Route:** {t['ship_name']} • {t['route']}\n"
                    f"• **Schedule:** {t['departure_date']} at {t['departure_time']} ({t['cabin_seat']})\n"
                    f"• **Status:** {t['ticket_status']} | **Booking:** {t['booking_status']}\n"
                    f"• **Passengers:** {t['total_passengers']} Guest(s) • Total: ₹{t['total_price_inr']:,.2f}\n\n"
                    f"Click the button below to view your encrypted QR boarding pass for jetty gate check-in!"
                )
                return {
                    "reply": reply,
                    "actions": lookup.get("actions", []),
                    "data": {"ticket": t}
                }
            else:
                return {
                    "reply": f"🐬 **Cruise-Hunt AI:**\n{lookup.get('message')}",
                    "actions": lookup.get("actions", [{"label": "Go to Dashboard", "url": "/dashboard", "type": "navigate", "variant": "primary"}]),
                    "data": {}
                }
        elif user and db:
            my_bookings = db.query(Booking).filter(Booking.user_id == user.id).order_by(Booking.created_at.desc()).limit(2).all()
            if my_bookings:
                b_lines = []
                for b in my_bookings:
                    t_code = b.ticket_code or b.booking_id
                    ship_name = b.cross.name if b.cross else "Vessel"
                    b_date = b.booking_date.strftime('%d %b %Y')
                    b_lines.append(f"• **#{t_code}**: {ship_name} on {b_date} ({b.ticket_status})")
                
                reply = (
                    "🚢 **Aapki Recent Bookings:**\n\n" + "\n".join(b_lines) +
                    "\n\nPass dekhne ke liye code type karein ya Dashboard open karein."
                    if is_hindi else
                    "🚢 **Your Active Bookings:**\n\n" + "\n".join(b_lines) +
                    "\n\nType the ticket code for full details or view passes in Dashboard."
                )
                return {
                    "reply": reply,
                    "actions": [
                        {"label": "Open Dashboard", "url": "/dashboard", "type": "navigate", "variant": "primary"},
                        {"label": "Explore Cruises", "url": "/explore", "type": "navigate", "variant": "outline"}
                    ],
                    "data": {}
                }
            else:
                return {
                    "reply": (
                        "Aapke account me abhi koi active booking nahi hai. Aap public tours ya private luxury yachts browse kar sakte hain! 🚢✨"
                        if is_hindi else
                        "You don't have any active bookings yet. Explore our scheduled public tours or private luxury yacht charters! 🚢✨"
                    ),
                    "actions": [
                        {"label": "Browse Public Tours", "url": "/tours", "type": "navigate", "variant": "primary"},
                        {"label": "Explore Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"}
                    ],
                    "data": {}
                }
        else:
            return {
                "reply": (
                    "Ticket dekhne ke liye apna **Ticket Code** (jaise `CRS-2026-XXXX`) enter karein ya account me **Sign In** karein. 🎫"
                    if is_hindi else
                    "To view your boarding pass, please enter your **Ticket Code** (e.g. `CRS-2026-XXXX`) or **Sign In** to your account. 🎫"
                ),
                "actions": [
                    {"label": "Sign In", "url": "/login", "type": "navigate", "variant": "primary"},
                    {"label": "Browse Cruises", "url": "/tours", "type": "navigate", "variant": "outline"}
                ],
                "data": {}
            }

    # 2. CRUISE-HUNT WALLET & FAST UPI QR TOP-UP
    if any(k in q_lower for k in ["wallet", "add fund", "balance", "upi qr", "payment qr", "paise add", "fund add", "top up", "recharge", "wallet me"]):
        if is_hindi:
            reply = (
                "💳 **Cruise-Hunt Wallet & Fast UPI QR Top-up:**\n\n"
                "• **Fast Top-up:** Navbar ya Dashboard me Wallet icon click karein, amount select karein (+₹500, +₹1,000, +₹2,000, +₹5,000).\n"
                "• **Scan & Pay:** Screen par aane wale dynamic UPI QR ko GPay, PhonePe ya Paytm se scan karein aur **'Payment Done'** dabayein.\n"
                "• **Instant Credit & Refunds:** Funds turant wallet me add hote hain. Cancellation ka refund bhi bina bank delay ke seedhe wallet me aata hai.\n"
                "• **Split Payment:** Booking ke time aap Wallet balance + Online UPI dono mix karke pay kar sakte hain."
            )
        else:
            reply = (
                "💳 **Cruise-Hunt Wallet & Instant UPI Top-up:**\n\n"
                "• **Quick Top-up:** Click the Wallet icon in the top navbar or Dashboard, and select your top-up amount (+₹500, +₹1k, +₹2k, +₹5k).\n"
                "• **Scan & Confirm:** Scan the dynamic UPI QR with any UPI app (GPay, PhonePe, Paytm) and click **'Payment Done'** for instant credit.\n"
                "• **Instant Refunds & Split Pay:** Cancelled trip refunds credit instantly to your wallet. You can also split payments between Wallet and UPI at checkout."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "💳 Open Wallet", "url": "/dashboard", "type": "navigate", "variant": "primary"},
                {"label": "🚢 Explore Voyages", "url": "/tours", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 3. BOARDING PASS SCAN & GATE ENTRY
    if any(k in q_lower for k in ["scan", "pass scan", "gate entry", "camera scan", "ship entry", "entry kaise", "boarding pass scan", "tikit scan", "ticket scan"]):
        if is_hindi:
            reply = (
                "📸 **Boarding Pass & Ship Gate Entry:**\n\n"
                "• **Passenger Pass:** Booking ke turant baad encrypted QR boarding pass generate hota hai, jise aap `/dashboard` ya direct link se open kar sakte hain.\n"
                "• **Gate Entry Scan:** Jetty par ship operator camera scanner se aapka QR code scan karte hain. 1 second me verify hoke status **USED** ho jata hai.\n"
                "• **Owner Command Center:** Ship owners `/owner` dashboard ke top par camera scanner use karke ya image upload karke gate entry karte hain."
            )
        else:
            reply = (
                "📸 **Digital Boarding Pass & Live Gate Scan:**\n\n"
                "• **Dynamic QR Pass:** Generated instantly on booking confirmation. Accessible anytime in `/dashboard` or via your ticket URL.\n"
                "• **1-Second Jetty Entry:** Present your pass QR code at the jetty gate. The ship crew scans it to grant immediate access and mark it **USED**.\n"
                "• **Operator Scanner:** Vessel operators have a real-time Camera QR Scanner on their Command Center (`/owner`) for seamless passenger verification."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🎫 View My Passes", "url": "/dashboard", "type": "navigate", "variant": "primary"},
                {"label": "⚓ Owner Gate Scanner", "url": "/owner", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 4. CANCELLATION & INSTANT WALLET REFUND POLICY
    if any(k in q_lower for k in ["cancel", "refund", "wapas", "policy", "cancellation charges", "paisa wapas"]):
        if is_hindi:
            reply = (
                "🐬 **Cancellation & Instant Wallet Refund Policy:**\n\n"
                "• **Public Tours:** Departure se 48 ghante pehle 100% full refund; 24-48 ghante ke beech 50% refund; 24 ghante ke andar non-refundable.\n"
                "• **Instant Credit:** Cancelled amount seedhe aapke **Cruise-Hunt Wallet** me bina kisi bank wait ke turant credit ho jata hai.\n"
                "• **Kaise Cancel Karein:** `/dashboard` me Upcoming Bookings par jayein aur **'Cancel Booking'** button click karein."
            )
        else:
            reply = (
                "🐬 **Cancellation & Instant Wallet Refund Policy:**\n\n"
                "• **Public Tours:** 100% refund for cancellations >= 48h before departure; 50% between 24-48h; non-refundable within 24h.\n"
                "• **Zero Delay:** Approved refund amount is credited directly to your **Cruise-Hunt Wallet** in real-time.\n"
                "• **How to Cancel:** Open `/dashboard` -> Select your upcoming trip -> Click **'Cancel Booking'**."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "📋 My Dashboard", "url": "/dashboard", "type": "navigate", "variant": "primary"},
                {"label": "💳 Open Wallet", "url": "/dashboard", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 5. REVIEWS & COMPLAINTS POLICY
    if any(k in q_lower for k in ["review", "complaint", "feedback", "rating", "shikayat", "complain"]):
        if is_hindi:
            reply = (
                "⭐ **Reviews & Complaints Policy:**\n\n"
                "• **Only for Completed Trips:** Genuine feedback banaye rakhne ke liye review ya complaint option sirf trip complete hone ke baad visible hota hai.\n"
                "• **Upcoming Trips:** Upcoming voyages par review/complaint options disabled rehte hain.\n"
                "• **Submit Kaise Karein:** Dashboard me **'Past Voyages'** tab me ja kar apna verified review submit karein."
            )
        else:
            reply = (
                "⭐ **Reviews & Feedback Policy:**\n\n"
                "• **Completed Voyages Only:** To ensure genuine passenger feedback, review and complaint options are unlocked only after a trip is marked **COMPLETED**.\n"
                "• **Upcoming Trips:** Uncompleted voyages cannot be reviewed.\n"
                "• **How to Review:** Visit `/dashboard` -> Navigate to **'Past Trips'** -> Click **'Leave Review'**."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🚢 My Trips", "url": "/dashboard", "type": "navigate", "variant": "primary"}
            ],
            "data": {}
        }

    # 6. WHATSAPP ALERTS & UPDATES
    if any(k in q_lower for k in ["whatsapp", "reminder", "updates", "alert", "notification", "message"]):
        if is_hindi:
            reply = (
                "📲 **24-Hour WhatsApp Alerts & Tracking:**\n\n"
                "• **Booking Confirmation:** Booking hote hi WhatsApp par verified pass code aur details receive hoti hain.\n"
                "• **24H Reminder:** Departure se theek 24 ghante pehle jetty location map, weather advisory aur QR pass link bheja jata hai.\n"
                "• **Live Journey Tracking:** Trip status change (Confirmed -> Boarding -> Departed -> Completed) par live update milta hai."
            )
        else:
            reply = (
                "📲 **24-Hour Automated WhatsApp Alerts:**\n\n"
                "• **Instant Alerts:** Booking confirmation and verified pass delivered straight to your registered WhatsApp.\n"
                "• **24-Hour Voyage Reminder:** Automated jetty directions, boarding reporting time, and direct QR link sent 24h before departure.\n"
                "• **Live Status:** Real-time updates as voyage status moves from Confirmed to Boarding to Completed."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🎫 My Bookings", "url": "/dashboard", "type": "navigate", "variant": "primary"}
            ],
            "data": {}
        }

    # 7. WATER SPORTS & MARINE ACTIVITIES
    if any(k in q_lower for k in ["scuba", "diving", "water sport", "water sports", "jet ski", "parasailing", "surfing", "activities", "snorkeling", "speed boat"]):
        act_items = []
        if db:
            activities = db.query(Activity).limit(3).all()
            for a in activities:
                act_items.append(f"• **{a.title}**: {a.location} • ₹{float(a.price):,.0f}/person ({a.duration_minutes} mins)")
        
        if is_hindi:
            act_text = "\n".join(act_items) if act_items else "• **Scuba Diving, Jet Ski & Parasailing**: Certified instructors ke sath Goa & Andaman me available."
            reply = (
                "🏄 **Water Sports & Scuba Adventures:**\n\n"
                f"{act_text}\n\n"
                "• **Safety First:** PADI certified instructors, high-grade life vests aur emergency support har activity ke sath shamil hain.\n"
                "• **Instant Booking:** Niche diye gaye link se slot aur timing book karein."
            )
        else:
            act_text = "\n".join(act_items) if act_items else "• **Scuba Diving, Jet Ski Safari & Parasailing**: Available in Goa, Kochi and Andaman."
            reply = (
                "🏄 **Water Sports & Marine Adventures:**\n\n"
                f"{act_text}\n\n"
                "• **Certified Safety:** Includes PADI instructors, professional gear, safety vests, and photo/video packages.\n"
                "• **Instant Booking:** Browse slots and reserve directly from our activities catalog below."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🏄 Browse Activities", "url": "/activities", "type": "navigate", "variant": "primary"},
                {"label": "🚢 Public Tours", "url": "/tours", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 8. PRIVATE EVENTS & WEDDINGS
    if any(k in q_lower for k in ["wedding", "shaadi", "birthday", "anniversary", "party", "corporate", "event", "celebration", "reception"]):
        purpose = extracted.get("purpose", "Private Celebration")
        if is_hindi:
            reply = (
                f"🎉 **{purpose} on Cruise-Hunt:**\n\n"
                "• **Custom Vessels:** 10 se lekar 200+ guests ke liye party catamarans aur luxury yachts available hain.\n"
                "• **All-in-One Packages:** Live DJ, themed decoration, gourmet dinner catering aur drone videography.\n"
                "• **Easy Booking:** `/events` page par jakar apne requirement customize karein aur direct quote payein."
            )
        else:
            reply = (
                f"🎉 **{purpose} & Marine Events:**\n\n"
                "• **Tailored Fleet:** Options ranging from intimate sunset yachts (10-30 guests) to large party catamarans (100+ guests).\n"
                "• **Turnkey Production:** Live sound, custom culinary menus, flower setups, and maritime crew support.\n"
                "• **Instant Planning:** Customize your date and headcount on our Private Events page below."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🎉 Plan Private Event", "url": "/events", "type": "navigate", "variant": "primary"},
                {"label": "⚓ Explore Yachts", "url": "/explore", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 9. PRIVATE YACHT CHARTERS
    is_private_yacht = any(k in q_lower for k in [
        "private yacht", "yacht", "charter", "hire boat", "private ship",
        "catamaran", "yacht chahiye", "private cruise", "rent boat", "rent yacht",
        "private booking", "private vessel"
    ])
    if is_private_yacht:
        vessel_items = []
        if db:
            q_cross = db.query(Cross).filter(Cross.is_active == True)
            loc = extracted.get("location")
            if loc:
                q_cross = q_cross.filter(or_(Cross.location.ilike(f"%{loc}%"), Cross.departure_port.ilike(f"%{loc}%"), Cross.destination.ilike(f"%{loc}%")))
            vessels = q_cross.limit(3).all()
            for v in vessels:
                rate_str = f"₹{float(v.price):,.0f}" if v.price else "Rate on request"
                vessel_items.append(f"• **{v.name}**: {v.location or 'Goa'} • {v.capacity} Guests • {rate_str}/{v.price_unit or 'hr'}")

        if is_hindi:
            v_text = "\n".join(vessel_items) if vessel_items else "• **Luxury Yachts in Goa & Mumbai**: 10 se 60 guests ke liye private charter available."
            reply = (
                "⚓ **Private Luxury Yacht Charters:**\n\n"
                f"{v_text}\n\n"
                "• **Exclusive Privacy:** Poora vessel aapke group ke liye private hota hai (2h, 4h ya full day).\n"
                "• **Custom Add-ons:** DJ music, chef catering, birthday decoration aur water sports easily add kar sakte hain."
            )
        else:
            v_text = "\n".join(vessel_items) if vessel_items else "• **Luxury Private Yachts**: Available in Goa, Mumbai, and Kochi for 2 to 60+ guests."
            reply = (
                "⚓ **Private Luxury Yacht Charters:**\n\n"
                f"{v_text}\n\n"
                "• **Exclusive Experience:** 100% private vessel hire for hourly cruises, sunset sails, or full-day expeditions.\n"
                "• **Bespoke Extras:** Add gourmet catering, professional DJ sound, floral decor, and drone photography."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "⚓ Explore Private Yachts", "url": "/explore", "type": "navigate", "variant": "primary"},
                {"label": "🎉 Private Events", "url": "/events", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 10. SCHEDULED PUBLIC CRUISES & OCEAN LINERS (Cordelia, Mumbai-Goa, Sunset Tours)
    is_cruise_or_tour = (
        any(k in q_lower for k in [
            "cruise", "cruises", "public tour", "tour", "tours", "cordelia",
            "mumbai to goa", "mumbai se goa", "sunset cruise", "ferry", "liner",
            "scheduled", "lakshadweep", "ship dikhao", "cruise dikhao", "cruise package"
        ]) or
        ("mumbai" in q_lower and "goa" in q_lower) or
        ("goa" in q_lower and any(w in q_lower for w in ["tour", "trip", "sailing", "cruise"]))
    )

    if is_cruise_or_tour:
        tour_items = []
        if db:
            q_filter = db.query(PublicTour).filter(PublicTour.status != "CANCELLED")
            loc = extracted.get("location")
            if loc:
                q_filter = q_filter.filter(or_(
                    PublicTour.departure_port.ilike(f"%{loc}%"),
                    PublicTour.destination.ilike(f"%{loc}%"),
                    PublicTour.tour_title.ilike(f"%{loc}%")
                ))
            tours = q_filter.limit(3).all()
            for t in tours:
                dep_short = t.departure_port.split(",")[0] if t.departure_port else "Departure"
                dest_short = t.destination.split(",")[0] if t.destination else "Destination"
                tour_items.append(f"• **{t.tour_title}**: {dep_short} → {dest_short} • ₹{float(t.adult_price):,.0f}/person")
        
        if is_hindi:
            tour_text = "\n".join(tour_items) if tour_items else "• **Cordelia Mumbai to Goa & Lakshadweep**: Luxury ocean liners with gourmet dining & entertainment."
            reply = (
                "🚢 **Scheduled Public Cruises & Tours:**\n\n"
                f"{tour_text}\n\n"
                "• **Cabin Categories:** Ocean View Suites, Balconies, aur General Staterooms available hain.\n"
                "• **All-Inclusive:** Sabhi gourmet meals, live music aur high tea ticket fare me included rehte hain."
            )
        else:
            tour_text = "\n".join(tour_items) if tour_items else "• **Cordelia Mumbai to Goa & Lakshadweep**: Luxury ocean liner sailings."
            reply = (
                "🚢 **Scheduled Public Cruises & Ocean Liners:**\n\n"
                f"{tour_text}\n\n"
                "• **Staterooms:** Ocean View Suites, Private Balconies, and Luxury Cabins with full amenities.\n"
                "• **Included:** Gourmet dining, live theatre entertainment, and onboard amenities are part of your pass."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🚢 View Public Tours", "url": "/tours", "type": "navigate", "variant": "primary"},
                {"label": "⚓ Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"}
            ],
            "data": {}
        }

    # 11. WEBSITE GUIDE & HOW TO BOOK
    if any(k in q_lower for k in ["guide", "kaha", "kahan", "kaise", "where", "how to", "steps", "website", "kidhar"]):
        if is_hindi:
            reply = (
                "🗺️ **Cruise-Hunt Website Guide:**\n\n"
                "• **Public Tours (`/tours`):** Cordelia cruise aur scheduled sunset tours ke per-seat tickets book karein.\n"
                "• **Private Yachts (`/explore`):** Family aur parties ke liye luxury private yachts hourly book karein.\n"
                "• **Water Sports (`/activities`):** Scuba diving, jet ski aur parasailing adventures reserve karein.\n"
                "• **My Dashboard (`/dashboard`):** Active tickets, QR boarding passes aur Cruise-Hunt Wallet manage karein."
            )
        else:
            reply = (
                "🗺️ **Cruise-Hunt Platform Directory:**\n\n"
                "• **Public Tours (`/tours`):** Scheduled ocean voyages (Cordelia Cruises, sunset river cruises) with cabin selection.\n"
                "• **Private Yachts (`/explore`):** Luxury private vessel charters for intimate cruises, parties, and events.\n"
                "• **Water Sports (`/activities`):** PADI scuba diving, jet ski safaris, parasailing, and surf sessions.\n"
                "• **Passenger Dashboard (`/dashboard`):** Digital QR boarding passes, voyage tracking, and Cruise-Hunt Wallet."
            )
        return {
            "reply": reply,
            "actions": [
                {"label": "🚢 Public Tours", "url": "/tours", "type": "navigate", "variant": "primary"},
                {"label": "⚓ Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"},
                {"label": "🏄 Water Sports", "url": "/activities", "type": "navigate", "variant": "ghost"}
            ],
            "data": {}
        }

    # 12. GENERAL WELCOME & MARITIME ASSISTANCE
    if is_hindi:
        reply = (
            "Namaste! Cruise-Hunt AI Concierge me aapka swagat hai 🐬⚓\n\n"
            "• **Public Cruises:** Cordelia cruises aur scenic river tours (`/tours`).\n"
            "• **Private Yachts:** Goa, Mumbai aur Andaman me private charters (`/explore`).\n"
            "• **Water Sports:** Scuba diving, jet ski aur parasailing (`/activities`).\n"
            "• **Wallet & Passes:** Instant UPI QR top-up aur digital boarding pass dekhne ke liye puch sakte hain!"
        )
    else:
        reply = (
            "Welcome to **Cruise-Hunt**! 🐬⚓\n\n"
            "I am your maritime AI concierge. I can assist you with:\n"
            "• **Public Voyages:** Cordelia ocean liners & scenic sunset cruises (`/tours`).\n"
            "• **Private Yachts:** Luxury charters in Goa, Mumbai, Kochi & Andaman (`/explore`).\n"
            "• **Water Sports:** Scuba diving, jet skiing & parasailing (`/activities`).\n"
            "• **Wallet & Passes:** Fast UPI QR wallet top-ups & digital QR boarding passes."
        )

    return {
        "reply": reply,
        "actions": [
            {"label": "🚢 Public Tours", "url": "/tours", "type": "navigate", "variant": "primary"},
            {"label": "⚓ Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"},
            {"label": "🏄 Water Sports", "url": "/activities", "type": "navigate", "variant": "ghost"},
            {"label": "📋 My Dashboard", "url": "/dashboard", "type": "navigate", "variant": "ghost"}
        ],
        "data": {}
    }


def get_ai_suggestions_list(user: Optional[User] = None) -> List[Dict[str, str]]:
    if user:
        return [
            {"id": "my_tickets", "label": "🎫 My Boarding Pass", "query": "Mera ticket code aur boarding pass check karein"},
            {"id": "my_wallet", "label": "💳 Wallet & UPI Top-up", "query": "Wallet me fund add karne ka UPI QR process bataiye"},
            {"id": "mumbai_goa", "label": "🌊 Mumbai to Goa Cruise", "query": "Mumbai se Goa public cruise ke schedules aur fare kya hain?"},
            {"id": "water_sports", "label": "🏄 Scuba & Water Sports", "query": "Scuba diving aur jet ski ke packages dikhaiye"},
            {"id": "gate_scan", "label": "📸 Ship Gate Pass Scan", "query": "Ship boarding gate par ticket scan kaise hota hai?"},
            {"id": "cancel_refund", "label": "❓ Cancel & Refund Policy", "query": "Booking cancellation charges aur wallet refund policy kya hai?"},
        ]
    return [
        {"id": "find_cruise", "label": "🚢 Explore Public Tours", "query": "Mumbai to Goa luxury ocean cruises dikhaiye"},
        {"id": "private_yacht", "label": "⚓ Private Yacht Charter", "query": "Goa me 20 guests ke liye private yacht charter ke options bataiye"},
        {"id": "water_sports", "label": "🏄 Scuba & Marine Sports", "query": "Scuba diving aur water sports activities kaise book karein?"},
        {"id": "my_wallet", "label": "💳 Cruise-Hunt Wallet", "query": "Cruise-Hunt wallet me UPI QR se paise kaise add karein?"},
        {"id": "lookup_ticket", "label": "🎫 Verify Boarding Pass", "query": "Mera ticket code check karein"},
        {"id": "site_guide", "label": "🗺️ Platform Guide", "query": "Cruise-Hunt par private yacht aur cruise ticket kaise book karein?"},
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

    query = latest_query or "Hello"

    # If OpenAI API Key is configured and accessible, invoke OpenAI with strict medium-length system prompt
    client = get_openai_client()
    if client:
        try:
            # Build conversation history
            openai_msgs = [{"role": "system", "content": CRUISE_HUNT_SYSTEM_PROMPT}]
            for m in messages[-6:]:
                r = m.get("role", "user")
                c = m.get("content", "")
                if r in ("user", "assistant") and c:
                    openai_msgs.append({"role": r, "content": c})

            completion = client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o-mini",
                messages=openai_msgs,
                max_tokens=350,
                temperature=0.4,
            )
            raw_reply = completion.choices[0].message.content.strip()

            # Dynamic actions determination based on query and reply
            reply_lower = (raw_reply + " " + query).lower()
            actions = []
            if "wallet" in reply_lower:
                actions.append({"label": "💳 Open Wallet", "url": "/dashboard", "type": "navigate", "variant": "primary"})
            if "tours" in reply_lower or "public" in reply_lower or "cordelia" in reply_lower:
                actions.append({"label": "🚢 Public Tours", "url": "/tours", "type": "navigate", "variant": "primary" if not actions else "outline"})
            if "yacht" in reply_lower or "charter" in reply_lower or "explore" in reply_lower:
                actions.append({"label": "⚓ Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"})
            if "activity" in reply_lower or "scuba" in reply_lower or "sports" in reply_lower:
                actions.append({"label": "🏄 Water Sports", "url": "/activities", "type": "navigate", "variant": "ghost"})
            if "dashboard" in reply_lower or "ticket" in reply_lower or "pass" in reply_lower:
                actions.append({"label": "📋 My Dashboard", "url": "/dashboard", "type": "navigate", "variant": "ghost"})

            if not actions:
                actions = [
                    {"label": "🚢 Public Tours", "url": "/tours", "type": "navigate", "variant": "primary"},
                    {"label": "⚓ Private Yachts", "url": "/explore", "type": "navigate", "variant": "outline"},
                ]

            return {
                "reply": raw_reply,
                "actions": actions[:3],
                "data": {}
            }
        except Exception:
            # Fall back seamlessly to high-quality local RAG
            pass

    return smart_local_rag_respond(query, user=user, db=db)
