import os
import re
import uuid
import logging
import requests
from datetime import datetime, date, time, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.core.config import settings
from backend.app.models.booking import Booking, SystemSetting, WhatsAppMessageLog

logger = logging.getLogger(__name__)


def normalize_whatsapp_number(raw_phone: Optional[str], default_country_code: str = "+91") -> Optional[str]:
    """
    Cleans, verifies, and normalizes phone numbers to standard E.164 international format.
    - Handles standard 10-digit Indian numbers (starts with 6, 7, 8, 9) -> adds +91
    - Handles numbers with existing +91 or other international country codes
    - Removes spaces, hyphens, and parentheses
    - Returns normalized E.164 string like '+919876543210' or None if invalid
    """
    if not raw_phone:
        return None

    clean = re.sub(r"[^\d+]", "", str(raw_phone).strip())

    if clean.startswith("+"):
        digits = clean[1:]
        if 10 <= len(digits) <= 15:
            return clean
        return None

    # Handle standard 10-digit Indian mobile numbers
    if len(clean) == 10 and clean[0] in "6789":
        return f"+91{clean}"

    # Handle Indian mobile with leading 0
    if len(clean) == 11 and clean.startswith("0") and clean[1] in "6789":
        return f"+91{clean[1:]}"

    # Handle 12-digit Indian number starting with 91
    if len(clean) == 12 and clean.startswith("91") and clean[2] in "6789":
        return f"+{clean}"

    # General international number without + (11-15 digits)
    if 11 <= len(clean) <= 15 and not clean.startswith("0"):
        return f"+{clean}"

    return None


def mask_whatsapp_number(raw_phone: Optional[str]) -> str:
    """
    Masks a phone number for secure display so customer privacy is protected:
    e.g. '+919876543210' -> '+91 •••••• 3210'
    """
    if not raw_phone:
        return ""
    cleaned = str(raw_phone).strip()
    if len(cleaned) <= 5:
        return "••••"
    prefix = cleaned[:3] if cleaned.startswith("+") else cleaned[:2]
    suffix = cleaned[-4:]
    return f"{prefix} •••••• {suffix}"


def is_valid_whatsapp_mobile(phone_str: Optional[str]) -> bool:
    """Returns True if the string represents a valid WhatsApp mobile number."""
    return normalize_whatsapp_number(phone_str) is not None


def get_configured_reminder_hours(db: Optional[Session] = None) -> int:
    """
    Fetches the admin-configurable reminder hours before departure.
    Defaults to 24 hours.
    """
    if db:
        try:
            setting = db.query(SystemSetting).filter_by(key="whatsapp_reminder_hours_before").first()
            if setting and setting.value.strip().isdigit():
                return int(setting.value.strip())
        except Exception:
            pass
    return settings.WHATSAPP_REMINDER_HOURS_BEFORE


def set_configured_reminder_hours(hours: int, db: Session) -> int:
    """Updates the admin-configurable reminder timing."""
    hours_int = max(1, min(168, int(hours)))  # 1 hour to 7 days
    setting = db.query(SystemSetting).filter_by(key="whatsapp_reminder_hours_before").first()
    if not setting:
        setting = SystemSetting(
            key="whatsapp_reminder_hours_before",
            value=str(hours_int),
            description="Hours before tour departure to automatically dispatch WhatsApp embarkation reminders"
        )
        db.add(setting)
    else:
        setting.value = str(hours_int)
    db.commit()
    return hours_int


def build_tour_reminder_text(booking: Booking) -> str:
    """
    Builds the high-fidelity WhatsApp reminder message template required:
    - Customer name
    - Ship/tour name
    - Date & time
    - Route
    - Ticket/Booking code
    - Boarding information & port jetty instructions
    """
    customer_name = booking.user.full_name if booking.user else "Valued Traveler"
    booking_id = booking.booking_id
    ticket_code = booking.ticket_code or f"TK-{booking_id.replace('CRS-', '')}"

    is_tour = booking.booking_type == "TOUR" and booking.public_tour
    if is_tour:
        tour = booking.public_tour
        ship_name = f"{tour.tour_title} (Vessel: {booking.cross.name})"
        route = f"{tour.departure_port} → {tour.destination}"
        boarding_port = tour.departure_port or booking.cross.departure_port or booking.cross.location
        date_str = tour.departure_date.strftime("%A, %d %B %Y")
        time_str = tour.departure_time.strftime("%I:%M %p")
    else:
        ship_name = f"{booking.cross.name} (Private Charter)"
        dep = booking.cross.departure_port or booking.cross.location or "Base Jetty"
        dest = booking.cross.destination or "Arabian Sea Coastal Circuit"
        route = f"{dep} → {dest}"
        boarding_port = booking.cross.departure_port or booking.cross.address or booking.cross.location
        date_str = booking.booking_date.strftime("%A, %d %B %Y")
        time_str = booking.start_time.strftime("%I:%M %p")

    operator_phone = (
        getattr(booking.cross, "contact_number", None)
        or (getattr(booking.cross.owner, "phone", None) if booking.cross.owner else None)
        or "+91 98200 12345"
    )
    boarding_pass_url = f"https://cross-hunt.in/ticket/verify/{ticket_code}"

    message = (
        f"🚢 *CROSS-HUNT EMBARKATION REMINDER* ⚓\n\n"
        f"Hello *{customer_name}*,\n\n"
        f"Your upcoming maritime voyage is scheduled to depart soon! Here are your official tour & boarding details:\n\n"
        f"📋 *Booking Ref:* #{booking_id}\n"
        f"🎫 *Boarding Pass Code:* *{ticket_code}*\n"
        f"🛳️ *Vessel / Tour:* {ship_name}\n"
        f"📍 *Route:* {route}\n"
        f"📅 *Embarkation Date:* {date_str}\n"
        f"⏰ *Departure Time:* {time_str}\n"
        f"⚓ *Boarding Location:* {boarding_port}\n"
        f"👥 *Party Headcount:* {booking.number_of_people} Passengers\n\n"
        f"ℹ️ *Crucial Boarding Instructions:*\n"
        f"• Please arrive at the jetty at least *30 minutes prior* to scheduled departure.\n"
        f"• Present your Digital Boarding Pass QR or pass code for express gate entry.\n"
        f"• Carry a government-approved photo ID (Aadhaar / Passport / Driving License) for port security.\n\n"
        f"📱 *Digital Boarding Pass:* {boarding_pass_url}\n"
        f"📞 *Ship Operator Assistance:* {operator_phone}\n\n"
        f"We wish you a wonderful and safe voyage across Indian waters!\n"
        f"🌊 *Team Cross-Hunt India*"
    )
    return message


def get_whatsapp_credentials(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Fetches WhatsApp credentials from database SystemSetting table first,
    falling back to settings / .env variables.
    """
    token = settings.WHATSAPP_API_TOKEN or ""
    phone_id = settings.WHATSAPP_PHONE_NUMBER_ID or ""
    biz_id = settings.WHATSAPP_BUSINESS_ACCOUNT_ID or ""

    if db:
        try:
            t = db.query(SystemSetting).filter_by(key="whatsapp_api_token").first()
            if t and t.value and t.value.strip():
                token = t.value.strip()
            p = db.query(SystemSetting).filter_by(key="whatsapp_phone_number_id").first()
            if p and p.value and p.value.strip():
                phone_id = p.value.strip()
            b = db.query(SystemSetting).filter_by(key="whatsapp_business_account_id").first()
            if b and b.value and b.value.strip():
                biz_id = b.value.strip()
        except Exception:
            pass

    is_live = bool(token and phone_id and len(token) > 10)
    return {
        "api_token": token,
        "phone_number_id": phone_id,
        "business_account_id": biz_id,
        "is_live": is_live,
        "provider": "META_CLOUD" if is_live else "META_CLOUD_SIMULATOR"
    }


def send_whatsapp_api_message(
    to_number: str,
    message_text: str,
    booking: Optional[Booking] = None,
    message_type: str = "TOUR_REMINDER",
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    WhatsApp integration service. Executes live Meta Cloud API request if tokens exist,
    or realistic development simulator. Saves audit log in WhatsAppMessageLog and returns
    a direct web.whatsapp.com/send link for instantaneous WhatsApp Web delivery.
    """
    import urllib.parse

    normalized_to = normalize_whatsapp_number(to_number)
    if not normalized_to:
        error_msg = f"Invalid WhatsApp mobile number: {to_number}"
        logger.error(error_msg)
        if booking and db:
            booking.whatsapp_reminder_status = "FAILED"
            booking.whatsapp_reminder_error = error_msg
            db.commit()
        return {"success": False, "error": error_msg}

    creds = get_whatsapp_credentials(db)
    api_token = creds["api_token"]
    phone_number_id = creds["phone_number_id"]
    is_live_api = creds["is_live"]
    provider = creds["provider"]

    customer_name = (booking.user.full_name if booking and booking.user else "")
    clean_digits = normalized_to.replace("+", "")
    wa_link = f"https://web.whatsapp.com/send?phone={clean_digits}&text={urllib.parse.quote(message_text)}"

    msg_id = f"wamid.HBgL{uuid.uuid4().hex[:12].upper()}V1"

    if is_live_api:
        url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_digits,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message_text
            }
        }
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=12)
            if resp.status_code in (200, 201):
                res_data = resp.json()
                msg_id = res_data.get("messages", [{}])[0].get("id", msg_id)
                status = "SENT"
                error_text = ""
            else:
                status = "FAILED"
                error_text = f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            status = "FAILED"
            error_text = f"Connection error: {str(e)}"
    else:
        status = "SENT"
        error_text = ""
        logger.info(f"[WHATSAPP API DISPATCH (SIMULATED)] To: {normalized_to} | ID: {msg_id}")

    log_id = None
    if db:
        log_entry = WhatsAppMessageLog(
            booking_id=booking.id if booking else None,
            recipient=normalized_to,
            customer_name=customer_name,
            message_type=message_type,
            message_body=message_text,
            provider=provider,
            provider_message_id=msg_id,
            status=status,
            error_message=error_text
        )
        db.add(log_entry)
        if booking:
            if status == "SENT":
                booking.whatsapp_reminder_sent = True
                booking.whatsapp_reminder_sent_at = datetime.utcnow()
                booking.whatsapp_reminder_status = "SENT"
                booking.whatsapp_reminder_message_id = msg_id
                booking.whatsapp_reminder_error = ""
            else:
                booking.whatsapp_reminder_status = "FAILED"
                booking.whatsapp_reminder_error = error_text
        db.commit()
        log_id = log_entry.id

    return {
        "success": status == "SENT",
        "message_id": msg_id,
        "provider": provider,
        "is_live_api": is_live_api,
        "recipient": normalized_to,
        "status": status,
        "log_id": log_id,
        "wa_link": wa_link,
        "message_body": message_text,
        "error": error_text if error_text else None
    }


def dispatch_tour_reminders_batch(db: Session, hours_before: Optional[int] = None, dry_run: bool = False) -> Dict[str, Any]:
    """
    Automated batch reminder engine.
    Finds all bookings departing within the configured window (e.g. 24 hours),
    verifies customer opt-in and valid WhatsApp mobile, and sends reminders.
    """
    if hours_before is None:
        hours_before = get_configured_reminder_hours(db)
    now = datetime.now()
    window_start = now
    window_end = now + timedelta(hours=hours_before)

    candidates = db.query(Booking).filter(
        Booking.status.in_(["CONFIRMED", "PENDING"]),
        Booking.whatsapp_reminder_sent == False,
        Booking.whatsapp_reminder_opt_in == True,
    ).all()

    eligible_bookings = []
    for b in candidates:
        dep_time = b.start_time or time(10, 0)
        dep_date = b.booking_date
        dep_dt = datetime.combine(dep_date, dep_time)

        if window_start <= dep_dt <= window_end:
            eligible_bookings.append(b)

    results = []
    sent_count = 0
    failed_count = 0

    for b in eligible_bookings:
        raw_number = b.customer_whatsapp or (b.user.whatsapp_number if b.user else None) or (b.user.phone if b.user else None)
        norm_number = normalize_whatsapp_number(raw_number)

        if not norm_number:
            b.whatsapp_reminder_status = "FAILED"
            b.whatsapp_reminder_error = f"Invalid WhatsApp number stored: {raw_number}"
            db.commit()
            failed_count += 1
            results.append({
                "booking_id": b.booking_id,
                "customer": b.user.full_name if b.user else "",
                "status": "FAILED",
                "error": "Invalid phone number format"
            })
            continue

        reminder_text = build_tour_reminder_text(b)

        if dry_run:
            results.append({
                "booking_id": b.booking_id,
                "customer": b.user.full_name if b.user else "",
                "recipient": norm_number,
                "status": "DRY_RUN_ELIGIBLE",
                "text_preview": reminder_text[:120] + "..."
            })
            sent_count += 1
        else:
            send_res = send_whatsapp_api_message(
                to_number=norm_number,
                message_text=reminder_text,
                booking=b,
                message_type="TOUR_REMINDER",
                db=db
            )
            if send_res.get("success"):
                sent_count += 1
                results.append({
                    "booking_id": b.booking_id,
                    "customer": b.user.full_name if b.user else "",
                    "recipient": norm_number,
                    "status": "SENT",
                    "message_id": send_res.get("message_id")
                })
            else:
                failed_count += 1
                results.append({
                    "booking_id": b.booking_id,
                    "customer": b.user.full_name if b.user else "",
                    "recipient": norm_number,
                    "status": "FAILED",
                    "error": send_res.get("error")
                })

    return {
        "hours_before": hours_before,
        "dry_run": dry_run,
        "total_evaluated": len(candidates),
        "eligible_in_window": len(eligible_bookings),
        "sent": sent_count,
        "failed": failed_count,
        "results": results
    }
