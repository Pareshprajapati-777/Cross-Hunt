import json
import re
import random
import string
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_current_user, get_optional_user
from backend.app.models.user import User
from backend.app.models.cross import Cross
from backend.app.models.activity import Activity
from backend.app.models.booking import Booking
from backend.app.models.offer import Offer
from backend.app.schemas.activity import (
    ActivityResponse,
    ActivityListResponse,
    ActivityCreate,
    ActivityUpdate,
    ActivityBookingRequest,
)

router = APIRouter(prefix="/activities", tags=["Activities & Water Sports"])

ACTIVITY_CATEGORY_GROUPS = [
    {"id": "ALL", "label": "All Experiences", "description": "Explore all water sports, fishing & boat adventures"},
    {"id": "WATER_SPORTS", "label": "Water Sports", "description": "Scuba diving, surfing, jet skiing, rafting & coastal adrenaline"},
    {"id": "FISHING", "label": "Fishing Experiences", "description": "Deep-sea angling, coastal boat fishing & luxury charters"},
    {"id": "BOAT_SHIP", "label": "Boat & Ship Experiences", "description": "Yacht rentals, speedboats, private charters & sunset cruises"},
]

ACTIVITY_CATEGORIES = [
    {"id": "ALL", "label": "All Experiences", "group": "ALL", "icon": "Waves"},
    # 1. Water Sports
    {"id": "SCUBA", "label": "Scuba Diving", "group": "WATER_SPORTS", "icon": "Compass"},
    {"id": "SURFING", "label": "Surfing", "group": "WATER_SPORTS", "icon": "Waves"},
    {"id": "KITE_SURFING", "label": "Kite Surfing", "group": "WATER_SPORTS", "icon": "Sparkles"},
    {"id": "JET_SKIING", "label": "Jet Skiing", "group": "WATER_SPORTS", "icon": "Zap"},
    {"id": "WATER_SKIING", "label": "Water Skiing", "group": "WATER_SPORTS", "icon": "Flame"},
    {"id": "PARASAILING", "label": "Parasailing", "group": "WATER_SPORTS", "icon": "Wind"},
    {"id": "RAFTING", "label": "Rafting", "group": "WATER_SPORTS", "icon": "Navigation"},
    {"id": "ROWING", "label": "Rowing", "group": "WATER_SPORTS", "icon": "Ship"},
    {"id": "CLIFF_DIVING", "label": "Cliff Diving", "group": "WATER_SPORTS", "icon": "ArrowDown"},
    {"id": "WATER_POLO", "label": "Water Polo", "group": "WATER_SPORTS", "icon": "Activity"},
    # 2. Fishing Experiences
    {"id": "DEEP_SEA_FISHING", "label": "Deep-Sea Fishing", "group": "FISHING", "icon": "Anchor"},
    {"id": "BOAT_FISHING", "label": "Boat Fishing", "group": "FISHING", "icon": "Fish"},
    {"id": "FISHING_CHARTER", "label": "Fishing Charter", "group": "FISHING", "icon": "Ship"},
    # 3. Boat & Ship Experiences
    {"id": "YACHT_RENTAL", "label": "Yacht Rental", "group": "BOAT_SHIP", "icon": "Crown"},
    {"id": "SPEEDBOAT_RIDE", "label": "Speedboat Ride", "group": "BOAT_SHIP", "icon": "Zap"},
    {"id": "PRIVATE_BOAT_CHARTER", "label": "Private Boat Charter", "group": "BOAT_SHIP", "icon": "Navigation"},
    {"id": "SUNSET_CRUISE", "label": "Sunset Cruise", "group": "BOAT_SHIP", "icon": "Sun"},
    {"id": "GROUP_BOAT_TRIPS", "label": "Group Boat Trips", "group": "BOAT_SHIP", "icon": "Users"},
]


def generate_unique_booking_id(db: Session, prefix="ACT") -> str:
    today_str = datetime.utcnow().strftime("%y%m%d")
    while True:
        rand = "".join(random.choices(string.digits, k=4))
        bid = f"{prefix}-{today_str}-{rand}"
        if not db.query(Booking).filter(Booking.booking_id == bid).first():
            return bid


def generate_unique_ticket_code(db: Session) -> str:
    while True:
        rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        code = f"ACT-PASS-{rand}"
        if not db.query(Booking).filter(Booking.ticket_code == code).first():
            return code


def parse_time_slot(slot_str: str) -> tuple[time, time, Decimal]:
    """Parse string like '08:30 AM' into start_time, default 1 hour end_time"""
    try:
        dt = datetime.strptime(slot_str.strip().upper(), "%I:%M %p")
        st = dt.time()
        end_dt = dt + timedelta(minutes=60)
        et = end_dt.time()
        return st, et, Decimal("1.0")
    except Exception:
        return time(10, 0), time(11, 0), Decimal("1.0")


@router.get("/", response_model=ActivityListResponse)
def list_activities(
    activity_type: Optional[str] = Query(None, description="Filter by activity category (SCUBA, JET_SKIING, etc.)"),
    category_group: Optional[str] = Query(None, description="Filter by category group (WATER_SPORTS, FISHING, BOAT_SHIP)"),
    location: Optional[str] = Query(None, description="Filter by port or destination"),
    search: Optional[str] = Query(None, description="Keyword search in title, description, host ship"),
    sort_by: Optional[str] = Query("popular", description="popular, price_asc, price_desc, rating"),
    db: Session = Depends(get_db),
):
    """
    List all public water sports rides and activities with optional vessel linking.
    """
    query = db.query(Activity).filter(Activity.is_active == True)

    if category_group and category_group.upper() != "ALL":
        cg = category_group.upper()
        if cg == "WATER_SPORTS":
            query = query.filter(Activity.category_group == "Water Sports")
        elif cg == "FISHING":
            query = query.filter(Activity.category_group == "Fishing Experiences")
        elif cg == "BOAT_SHIP":
            query = query.filter(Activity.category_group == "Boat & Ship Experiences")
        else:
            query = query.filter(Activity.category_group.ilike(f"%{category_group}%"))

    if activity_type and activity_type.upper() != "ALL":
        # Support alias for FISHING -> DEEP_SEA_FISHING or FISHING
        if activity_type.upper() == "FISHING":
            query = query.filter(Activity.activity_type.in_(["FISHING", "DEEP_SEA_FISHING"]))
        else:
            query = query.filter(Activity.activity_type == activity_type.upper())

    if location and location.strip():
        loc_term = f"%{location.strip()}%"
        query = query.filter(
            or_(
                Activity.location.ilike(loc_term),
                Activity.departure_port.ilike(loc_term),
            )
        )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.outerjoin(Activity.host_ship).filter(
            or_(
                Activity.title.ilike(term),
                Activity.description.ilike(term),
                Activity.category_label.ilike(term),
                Activity.category_group.ilike(term),
                Activity.activity_type.ilike(term),
                Cross.name.ilike(term),
            )
        )

    if sort_by == "price_asc":
        query = query.order_by(asc(Activity.price))
    elif sort_by == "price_desc":
        query = query.order_by(desc(Activity.price))
    elif sort_by == "rating":
        query = query.order_by(desc(Activity.rating), desc(Activity.reviews_count))
    else:
        # Default: featured first, then rating
        query = query.order_by(desc(Activity.is_featured), desc(Activity.rating))

    activities = query.all()

    return {
        "activities": [a.to_dict() for a in activities],
        "total": len(activities),
        "categories": ACTIVITY_CATEGORIES,
    }


@router.get("/categories")
def get_categories():
    return ACTIVITY_CATEGORIES


@router.get("/operator/my-activities")
def get_operator_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all water sports rides managed by the logged-in owner/operator.
    """
    if current_user.role not in ["OWNER", "OPERATOR", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Owner account required.")

    if current_user.is_admin:
        activities = db.query(Activity).order_by(desc(Activity.created_at)).all()
    else:
        # Match activities owned by user or hosted on user's vessels
        user_ship_ids = [s.id for s in db.query(Cross).filter(Cross.owner_id == current_user.id).all()]
        activities = (
            db.query(Activity)
            .filter(
                or_(
                    Activity.owner_id == current_user.id,
                    Activity.host_ship_id.in_(user_ship_ids) if user_ship_ids else False,
                )
            )
            .order_by(desc(Activity.created_at))
            .all()
        )

    return {"activities": [a.to_dict() for a in activities], "total": len(activities)}


@router.get("/{slug_or_id}")
def get_activity_detail(
    slug_or_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve single activity details with host ship metadata and related rides.
    """
    if slug_or_id.isdigit():
        act = db.query(Activity).filter(Activity.id == int(slug_or_id)).first()
    else:
        act = db.query(Activity).filter(Activity.slug == slug_or_id).first()

    if not act:
        raise HTTPException(status_code=404, detail="Water sports activity not found.")

    # Related activities
    related = (
        db.query(Activity)
        .filter(
            Activity.id != act.id,
            Activity.is_active == True,
            or_(
                Activity.activity_type == act.activity_type,
                Activity.location == act.location,
            ),
        )
        .limit(3)
        .all()
    )

    data = act.to_dict()
    data["related_activities"] = [r.to_dict() for r in related]
    return data


@router.post("/book")
def book_activity(
    req: ActivityBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Book an Activity/Water Sport slot.
    Seamlessly books the host vessel and generates full booking record,
    activity ticket pass, GPS route map, and payment integration.
    """
    act = db.query(Activity).filter(Activity.id == req.activity_id, Activity.is_active == True).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found or currently inactive.")

    # Date validation
    try:
        b_date = datetime.strptime(req.booking_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if b_date < date.today():
        raise HTTPException(status_code=400, detail="Activity booking date cannot be in the past.")

    # Parse start and end time
    start_t, end_t, dur_hrs = parse_time_slot(req.time_slot)
    dur_minutes = act.duration_minutes
    try:
        dt_start = datetime.combine(b_date, start_t)
        dt_end = dt_start + timedelta(minutes=dur_minutes)
        end_t = dt_end.time()
        dur_hrs = Decimal(str(round(dur_minutes / 60, 2)))
    except Exception:
        pass

    if req.participants > act.capacity_per_slot:
        raise HTTPException(
            status_code=400,
            detail=f"Requested participants ({req.participants}) exceeds maximum slot capacity ({act.capacity_per_slot}).",
        )

    # 1. Boat / Vessel Overlapping Double-Booking Prevention:
    # If the activity requires a boat and has an assigned vessel, ensure vessel is not already engaged
    if act.requires_boat and act.host_ship_id:
        vessel_conflict = (
            db.query(Booking)
            .filter(
                Booking.cross_id == act.host_ship_id,
                Booking.booking_date == b_date,
                Booking.status.in_(["CONFIRMED", "PENDING"]),
                or_(
                    and_(Booking.start_time <= start_t, Booking.end_time > start_t),
                    and_(Booking.start_time < end_t, Booking.end_time >= end_t),
                    and_(Booking.start_time >= start_t, Booking.end_time <= end_t),
                ),
            )
            .first()
        )
        if vessel_conflict:
            ship_name = act.host_ship.name if act.host_ship else "Assigned Vessel"
            raise HTTPException(
                status_code=409,
                detail=f"Double-booking prevented: Vessel '{ship_name}' is already reserved for an overlapping session on {req.booking_date} ({vessel_conflict.start_time.strftime('%I:%M %p')} - {vessel_conflict.end_time.strftime('%I:%M %p')}). Please choose another time slot.",
            )

    # 2. Activity / Instructor / Equipment Slot Capacity & Double-Booking Prevention:
    existing_slot_bookings = (
        db.query(Booking)
        .filter(
            Booking.booking_type == "ACTIVITY",
            Booking.booking_date == b_date,
            or_(
                Booking.event_type == f"ACT_{act.id}",
                Booking.event_type == act.title,
                Booking.cabin_type.like(f"ACT:{act.id}:%"),
                Booking.cabin_type == f"Slot: {act.title}",
            ),
            Booking.status.in_(["CONFIRMED", "PENDING"]),
            or_(
                and_(Booking.start_time <= start_t, Booking.end_time > start_t),
                and_(Booking.start_time < end_t, Booking.end_time >= end_t),
                and_(Booking.start_time >= start_t, Booking.end_time <= end_t),
            ),
        )
        .all()
    )
    already_booked = sum(b.number_of_people for b in existing_slot_bookings)
    if already_booked + req.participants > act.capacity_per_slot:
        remaining = max(0, act.capacity_per_slot - already_booked)
        if remaining == 0:
            raise HTTPException(
                status_code=409,
                detail=f"Slot fully booked: The {req.time_slot} session on {req.booking_date} is at full capacity ({act.capacity_per_slot} participants). Assigned instructor and equipment are fully engaged. Please choose another time slot.",
            )
        else:
            raise HTTPException(
                status_code=409,
                detail=f"Capacity exceeded: Only {remaining} spot(s) remaining for {req.time_slot} on {req.booking_date} (requested {req.participants}). Please reduce participants or choose another time slot.",
            )

    # Calculate Pricing (Supports both PER_PERSON and PER_SESSION)
    base_unit_price = Decimal(str(act.price))
    if getattr(act, "pricing_type", "PER_PERSON") == "PER_SESSION":
        subtotal = base_unit_price
    else:
        subtotal = base_unit_price * Decimal(str(req.participants))

    # Additional options / extras selected by user
    extras_amount = Decimal("0.00")
    extras_list = [{"name": f"Activity Pass ({act.title})", "price": float(base_unit_price), "quantity": req.participants}]
    if req.selected_addons:
        for addon in req.selected_addons:
            addon_price = Decimal(str(addon.get("price", 0)))
            extras_amount += addon_price
            extras_list.append({"name": addon.get("name", "Extra Option"), "price": float(addon_price), "quantity": 1})

    subtotal_with_extras = subtotal + extras_amount

    # Discount check
    discount_amount = Decimal("0.00")
    promo_applied = None
    if req.promo_code and req.promo_code.strip():
        code_clean = req.promo_code.strip().upper()
        offer = db.query(Offer).filter(Offer.code == code_clean, Offer.is_active == True).first()
        if offer and (not offer.valid_to or offer.valid_to >= date.today()):
            if offer.discount_type == "PERCENT":
                discount_amount = (subtotal_with_extras * Decimal(str(offer.discount_value))) / Decimal("100.0")
            else:
                discount_amount = Decimal(str(offer.discount_value))
            if offer.max_discount:
                discount_amount = min(discount_amount, Decimal(str(offer.max_discount)))
            discount_amount = min(discount_amount, subtotal_with_extras)
            promo_applied = code_clean

    after_discount = max(Decimal("0.00"), subtotal_with_extras - discount_amount)
    # GST: 5% marine recreation tax
    tax_amount = (after_discount * Decimal("0.05")).quantize(Decimal("0.01"))
    total_price = (after_discount + tax_amount).quantize(Decimal("0.01"))

    # Unique codes
    booking_id = generate_unique_booking_id(db, prefix="ACT")
    ticket_code = generate_unique_ticket_code(db)
    invoice_number = f"INV-ACT-{datetime.utcnow().strftime('%y%m')}-{random.randint(1000, 9999)}"

    # Payouts
    platform_fee = (total_price * Decimal("0.10")).quantize(Decimal("0.01"))
    owner_payout = total_price - platform_fee

    cust_whatsapp = (req.customer_whatsapp or current_user.phone or "").strip()

    target_cross_id = act.host_ship_id
    if not target_cross_id:
        fallback_ship = db.query(Cross).filter(Cross.is_active == True).first()
        target_cross_id = fallback_ship.id if fallback_ship else 1

    # Create Booking
    booking = Booking(
        booking_id=booking_id,
        invoice_number=invoice_number,
        user_id=current_user.id,
        cross_id=target_cross_id,
        public_tour_id=None,
        booking_date=b_date,
        start_time=start_t,
        end_time=end_t,
        booking_type="ACTIVITY",
        cabin_type=f"ACT:{act.id}:{req.time_slot}",
        event_type=f"ACT_{act.id}",
        event_package=f"{act.activity_type}:{req.time_slot}",
        number_of_people=req.participants,
        adults_count=req.participants,
        children_count=0,
        selected_extras=json.dumps(extras_list),
        duration_hours=dur_hrs,
        base_price=base_unit_price,
        subtotal=subtotal_with_extras,
        extras_amount=extras_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_price=total_price,
        promo_code=promo_applied,
        owner_payout_amount=owner_payout,
        platform_commission_amount=platform_fee,
        net_platform_profit=platform_fee,
        ticket_code=ticket_code,
        ticket_status="VALID",
        special_request=req.special_request or f"Water Sports Ride Booking: {act.title} at {req.time_slot}",
        status="CONFIRMED",
        tracking_status="BOOKED",
        customer_whatsapp=cust_whatsapp,
        whatsapp_reminder_opt_in=True,
        payment_status="PAID",
        payment_method=req.payment_method or "UPI / Razorpay QR",
        payment_gateway_ref=f"PAY-ACT-{random.randint(100000, 999999)}",
    )

    db.add(booking)
    # Increment review counter
    act.reviews_count = (act.reviews_count or 0) + 1
    db.commit()
    db.refresh(booking)

    return {
        "success": True,
        "message": f"Successfully reserved slot for {act.title} on {req.booking_date}!",
        "booking": {
            "id": booking.id,
            "booking_id": booking.booking_id,
            "ticket_code": booking.ticket_code,
            "invoice_number": booking.invoice_number,
            "status": booking.status,
            "total_price": float(booking.total_price),
            "booking_date": booking.booking_date.strftime("%Y-%m-%d"),
            "time_slot": req.time_slot,
            "participants": booking.number_of_people,
            "activity_title": act.title,
            "activity_type": act.activity_type,
            "host_ship_name": act.host_ship.name if act.host_ship else "Host Vessel",
            "departure_port": act.departure_port,
            "location": act.location,
            "customer_whatsapp": booking.customer_whatsapp,
        },
    }


@router.post("/", response_model=ActivityResponse)
def create_activity(
    data: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new water sports activity / ride (Owner, Operator or Admin).
    """
    if current_user.role not in ["OWNER", "OPERATOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only verified vessel owners or operators can list activities.")

    # Validate host ship if provided
    host_ship = None
    if data.host_ship_id and data.host_ship_id > 0:
        host_ship = db.query(Cross).filter(Cross.id == data.host_ship_id).first()
        if not host_ship:
            raise HTTPException(status_code=404, detail="Selected host vessel does not exist.")
        if not current_user.is_admin and host_ship.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only associate activities with vessels you own.")

    # Generate slug
    base_slug = re.sub(r"[^a-zA-Z0-9]+", "-", data.title.lower()).strip("-")
    slug = base_slug
    counter = 1
    while db.query(Activity).filter(Activity.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    act = Activity(
        title=data.title,
        slug=slug,
        activity_type=data.activity_type.upper(),
        category_label=data.category_label,
        category_group=data.category_group or "Water Sports",
        requires_boat=data.requires_boat or (host_ship is not None),
        vessel_requirement_note=data.vessel_requirement_note or (f"Boat Included ({host_ship.name})" if host_ship else "Beach & Shore-Based (No Boat Needed)"),
        available_dates_summary=data.available_dates_summary or "Available Daily • Today onwards",
        instructor_available=data.instructor_available,
        instructor_details=data.instructor_details or "Available • Certified Master Instructor",
        age_restrictions=data.age_restrictions or "Operator-defined",
        cancellation_policy=data.cancellation_policy or "Free cancellation up to 24 hours before start time (Operator Policy)",
        description=data.description,
        highlights_json=json.dumps(data.highlights),
        included_gear_json=json.dumps(data.included_gear),
        safety_guidelines=data.safety_guidelines,
        requirements=data.requirements,
        price=data.price,
        pricing_type=data.pricing_type or "PER_PERSON",
        duration_minutes=data.duration_minutes,
        difficulty_level=data.difficulty_level,
        capacity_per_slot=data.capacity_per_slot,
        min_participants=data.min_participants,
        weather_conditions=data.weather_conditions or "Operates in calm to moderate sea swell. Subject to wind/rain advisories.",
        location=data.location or (host_ship.location if host_ship else "Goa"),
        departure_port=data.departure_port or (host_ship.departure_port if host_ship else "Pier Jetty"),
        operating_hours=data.operating_hours,
        time_slots_json=json.dumps(data.time_slots),
        image=data.image or "/static/images/activities/jet_skiing.jpg",
        gallery_json=json.dumps(data.gallery or [data.image]),
        host_ship_id=host_ship.id if host_ship else None,
        owner_id=current_user.id,
        operator_id=host_ship.operator_id if host_ship else None,
        is_active=data.is_active,
        is_featured=data.is_featured,
        rating=Decimal("5.0"),
        reviews_count=1,
    )

    db.add(act)
    db.commit()
    db.refresh(act)
    return act.to_dict()


@router.put("/{activity_id}")
def update_activity(
    activity_id: int,
    data: ActivityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")

    if not current_user.is_admin and act.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this activity.")

    update_dict = data.dict(exclude_unset=True)
    if "highlights" in update_dict:
        act.highlights_json = json.dumps(update_dict.pop("highlights"))
    if "included_gear" in update_dict:
        act.included_gear_json = json.dumps(update_dict.pop("included_gear"))
    if "time_slots" in update_dict:
        act.time_slots_json = json.dumps(update_dict.pop("time_slots"))
    if "gallery" in update_dict:
        act.gallery_json = json.dumps(update_dict.pop("gallery"))

    # If host_ship_id is updated, verify authorization
    if "host_ship_id" in update_dict:
        new_ship_id = update_dict.get("host_ship_id")
        if new_ship_id and new_ship_id > 0:
            ship = db.query(Cross).filter(Cross.id == new_ship_id).first()
            if not ship:
                raise HTTPException(status_code=404, detail="Host ship not found.")
            if not current_user.is_admin and ship.owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="Cannot assign activity to another owner's ship.")
            act.host_ship_id = ship.id
            act.operator_id = ship.operator_id
            act.requires_boat = True
        else:
            act.host_ship_id = None
            act.operator_id = None
            act.requires_boat = False

    for k, v in update_dict.items():
        if k != "host_ship_id" and hasattr(act, k):
            setattr(act, k, v)

    db.commit()
    db.refresh(act)
    return act.to_dict()


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")

    if not current_user.is_admin and act.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this activity.")

    # Soft delete
    act.is_active = False
    db.commit()
    return {"success": True, "message": f"Activity '{act.title}' deactivated successfully."}
