from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional

from backend.app.services.whatsapp_service import is_valid_whatsapp_mobile, mask_whatsapp_number


def serialize_extra(extra) -> Dict[str, Any]:
    return {
        "id": extra.id,
        "name": extra.name,
        "description": extra.description or "",
        "price": float(extra.price),
        "pricing_mode": extra.pricing_mode,
        "is_available": bool(extra.is_available),
    }


def serialize_charter_rate(r) -> Dict[str, Any]:
    return {
        "id": r.id,
        "duration": r.duration,
        "duration_hours": float(r.duration_hours),
        "price": float(r.price) if r.price is not None else None,
        "currency": r.currency,
        "price_unit": r.price_unit,
        "is_quote_based": bool(r.is_quote_based),
        "formatted_display": r.formatted_display,
        "minimum_guests": r.minimum_guests,
        "maximum_guests": r.maximum_guests,
        "included": r.included or "",
        "extra_charges": r.extra_charges or "",
        "validity": r.validity or "",
        "source": r.source or "",
    }


def serialize_cruise(cruise) -> Dict[str, Any]:
    extras = [serialize_extra(e) for e in cruise.extras if e.is_available]
    charter_rates = [serialize_charter_rate(r) for r in cruise.charter_rates]

    management_type = "PLATFORM"
    op_name = cruise.effective_operator_name
    op_id = cruise.operator.id if cruise.operator else (cruise.owner.id if cruise.owner else None)
    op_phone = ""
    op_wa = ""
    op_email = ""
    op_website = ""
    op_booking_url = ""

    if cruise.operator:
        management_type = "OPERATOR"
        op_name = cruise.operator.name
        op_phone = cruise.contact_number or cruise.operator.phone or ""
        candidate_wa = cruise.whatsapp_number or cruise.operator.whatsapp_number or ""
        if is_valid_whatsapp_mobile(candidate_wa):
            op_wa = candidate_wa
        elif not cruise.whatsapp_number and is_valid_whatsapp_mobile(op_phone):
            op_wa = op_phone
        else:
            op_wa = ""
        op_email = cruise.email or cruise.operator.email or ""
        op_website = cruise.website or cruise.operator.website or ""
        op_booking_url = cruise.booking_url or cruise.operator.booking_url or ""
    elif cruise.owner:
        is_registered_owner = bool(cruise.owner.role in ("OWNER", "CROSS_OWNER") or cruise.owner.is_owner)
        if is_registered_owner:
            management_type = "OWNER"
            op_name = cruise.owner.full_name
            op_phone = cruise.owner.phone or cruise.contact_number or ""
            candidate_wa = cruise.owner.whatsapp_number or cruise.whatsapp_number or ""
            if is_valid_whatsapp_mobile(candidate_wa):
                op_wa = candidate_wa
            elif is_valid_whatsapp_mobile(op_phone):
                op_wa = op_phone
            else:
                op_wa = ""
            op_email = cruise.owner.email or cruise.email or ""
            op_website = cruise.website or ""
            op_booking_url = cruise.booking_url or ""
        else:
            management_type = "PLATFORM"
            op_name = "Cross-Hunt Fleet Concierge"
            op_phone = ""
            op_wa = ""
            op_email = ""
    else:
        op_phone = cruise.contact_number or ""
        if is_valid_whatsapp_mobile(cruise.whatsapp_number):
            op_wa = cruise.whatsapp_number
        elif is_valid_whatsapp_mobile(op_phone):
            op_wa = op_phone
        else:
            op_wa = ""
        op_email = cruise.email or ""
        op_website = cruise.website or ""
        op_booking_url = cruise.booking_url or ""

    today = date.today()
    is_in_maintenance = any(
        m.is_active and m.start_date <= today <= m.end_date
        for m in getattr(cruise, "maintenance_periods", [])
    )
    now_time = datetime.now().time()
    is_booked_today = any(
        b.status == "CONFIRMED" and b.booking_date == today and (b.end_time is None or b.end_time > now_time)
        for b in getattr(cruise, "bookings", [])
    )
    is_on_tour_today = any(
        t.is_published and t.status in ("SCHEDULED", "BOARDING", "DEPARTED", "ON_TOUR") and t.departure_date <= today <= t.return_date
        for t in getattr(cruise, "public_tours", [])
    )

    if is_in_maintenance or not cruise.is_active or cruise.availability_status == "MAINTENANCE":
        operational_status = "MAINTENANCE"
    elif is_booked_today or cruise.availability_status == "BOOKED":
        operational_status = "BOOKED"
    elif is_on_tour_today:
        operational_status = "ON_TOUR"
    else:
        operational_status = "AVAILABLE"

    return {
        "id": cruise.id,
        "title": cruise.name,
        "name": cruise.name,
        "slug": cruise.slug,
        "operational_status": operational_status,
        "category": cruise.effective_category,
        "vessel_category": cruise.effective_category,
        "listing_type": cruise.listing_type,
        "destination": cruise.destination,
        "route": cruise.route,
        "departure_port": cruise.departure_port,
        "location": cruise.location,
        "address": cruise.address,
        "price": float(cruise.price),
        "price_per_day": float(cruise.price),
        "price_unit": cruise.price_unit,
        "is_quote_based": bool(cruise.is_quote_based),
        "duration_display": cruise.duration_display or (f"{cruise.duration_days} Days" if cruise.duration_days > 1 else "per charter"),
        "formatted_price_basis": cruise.formatted_price_basis,
        "capacity": cruise.capacity,
        "capacity_note": cruise.capacity_note or "",
        "has_unknown_capacity": bool(cruise.has_unknown_capacity),
        "display_capacity_text": cruise.display_capacity_text,
        "tax_note": cruise.tax_note,
        "permit_note": cruise.permit_note,
        "fuel_surcharge_note": cruise.fuel_surcharge_note,
        "included": cruise.included,
        "extra_charges": cruise.extra_charges,
        "duration_days": cruise.duration_days,
        "ship_length_meters": cruise.ship_length_meters,
        "beam_meters": cruise.beam_meters,
        "decks_count": cruise.decks_count,
        "cabin_count": cruise.cabin_count,
        "supports_private_charter": bool(cruise.supports_private_charter),
        "supports_public_tours": bool(cruise.supports_public_tours),
        "supports_weddings": bool(cruise.supports_weddings),
        "supports_birthdays": bool(cruise.supports_birthdays),
        "supports_corporate": bool(cruise.supports_corporate),
        "supports_conferences": bool(cruise.supports_conferences),
        "supports_parties": bool(cruise.supports_parties),
        "supports_dinners": bool(cruise.supports_dinners),
        "image": cruise.display_image_url,
        "image_url": cruise.display_image_url,
        "description": cruise.description,
        "facilities": cruise.get_facilities_list(),
        "rules": cruise.rules,
        "cancellation_policy": cruise.cancellation_policy,
        "average_rating": cruise.average_rating,
        "review_count": cruise.review_count,
        "management_type": management_type,
        "management_name": op_name,
        "operator_name": op_name,
        "operator_id": op_id,
        "operator_phone": op_phone,
        "operator_email": op_email,
        "operator_website": op_website,
        "operator_booking_url": op_booking_url,
        "source_url": cruise.source_url,
        "source_checked": bool(cruise.source_checked),
        "last_verified_at": cruise.last_verified_at.strftime("%Y-%m-%d") if cruise.last_verified_at else None,
        "availability_status": cruise.availability_status,
        "vessel_model": cruise.vessel_model or "",
        "ac_status": cruise.ac_status,
        "food_service": cruise.food_service,
        "dj_music": bool(cruise.dj_music),
        "decoration_service": bool(cruise.decoration_service),
        "photography_service": bool(cruise.photography_service),
        "water_sports": bool(cruise.water_sports),
        "extra_services": cruise.extra_services,
        "contact_number": op_phone,
        "whatsapp_number": op_wa,
        "is_whatsapp_available": bool(op_wa and is_valid_whatsapp_mobile(op_wa)),
        "email": op_email,
        "website": op_website,
        "booking_url": op_booking_url,
        "is_external_operator": bool(cruise.is_external_operator),
        "source_price": float(cruise.source_price) if cruise.source_price is not None else float(cruise.price),
        "valid_from": cruise.valid_from.strftime("%Y-%m-%d") if cruise.valid_from else None,
        "valid_to": cruise.valid_to.strftime("%Y-%m-%d") if cruise.valid_to else None,
        "price_review_flag": bool(cruise.price_review_flag),
        "price_review_reason": cruise.price_review_reason or "",
        "is_active": bool(cruise.is_active),
        "is_approved": bool(cruise.is_approved),
        "is_available": bool(cruise.is_active and cruise.is_approved and cruise.availability_status == "AVAILABLE"),
        "extras": extras,
        "charter_rates": charter_rates,
        "gallery_images": cruise.get_all_gallery_urls(),
        "maintenance_periods": [
            {
                "start_date": m.start_date.strftime("%Y-%m-%d"),
                "end_date": m.end_date.strftime("%Y-%m-%d"),
                "reason": m.reason
            } for m in getattr(cruise, "maintenance_periods", []) if m.is_active
        ],
    }


def serialize_tour(tour) -> Dict[str, Any]:
    ship_data = serialize_cruise(tour.ship)
    cabins = [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "price_per_person": float(c.price_per_person),
            "total_capacity": c.total_capacity,
            "booked_capacity": c.booked_capacity,
            "remaining_capacity": c.remaining_capacity,
        } for c in tour.cabins
    ]

    fares = [
        {
            "id": f.id,
            "cabin_type": f.cabin_type,
            "price": float(f.price) if f.price is not None else None,
            "currency": f.currency,
            "price_unit": f.price_unit,
            "taxes": f.taxes,
            "validity": f.validity,
            "source": f.source,
        } for f in tour.fares
    ]

    if not cabins and not fares:
        cabins = [
            {"id": 1, "name": "Presidential Sea Suite", "description": "Private veranda, luxury butler, ocean panorama", "price_per_person": float(tour.adult_price + Decimal("5000.00")), "total_capacity": 20, "booked_capacity": 0, "remaining_capacity": 20},
            {"id": 2, "name": "Royal Ocean Balcony", "description": "Private balcony, unobstructed sunset oceanview", "price_per_person": float(tour.adult_price + Decimal("2500.00")), "total_capacity": 60, "booked_capacity": 0, "remaining_capacity": 60},
            {"id": 3, "name": "Premium Oceanview Stateroom", "description": "Large picture window with sweeping sea views", "price_per_person": float(tour.adult_price), "total_capacity": 80, "booked_capacity": 0, "remaining_capacity": 80},
            {"id": 4, "name": "Deluxe Interior Haven", "description": "Smart ambient lighting, comfortable quiet retreat", "price_per_person": float(max(Decimal("1000.00"), tour.adult_price - Decimal("1500.00"))), "total_capacity": 40, "booked_capacity": 0, "remaining_capacity": 40},
        ]

    op_name = tour.operator.name if tour.operator else tour.ship.effective_operator_name

    calc_days = max(1, (tour.return_date - tour.departure_date).days) if (tour.return_date and tour.departure_date and (tour.return_date - tour.departure_date).days > 0) else (tour.duration_days or 1)
    calc_display = tour.duration_display or (f"{calc_days} Days" if calc_days > 1 else "1 Day")

    return {
        "id": tour.id,
        "tour_title": tour.tour_title,
        "title": tour.tour_title,
        "slug": tour.slug,
        "ship_id": tour.ship.id,
        "ship_name": tour.ship.name,
        "ship_slug": tour.ship.slug,
        "ship_image": (tour.image_url.strip() if tour.image_url else None) or tour.ship.display_image_url,
        "tour_image": (tour.image_url.strip() if tour.image_url else None) or tour.ship.display_image_url,
        "operator_name": op_name,
        "operator_id": tour.operator.id if tour.operator else None,
        "departure_port": tour.departure_port,
        "destination": tour.destination,
        "departure_date": tour.departure_date.strftime("%Y-%m-%d"),
        "departure_date_formatted": tour.departure_date.strftime("%A, %B %d, %Y"),
        "departure_time": tour.departure_time.strftime("%H:%M"),
        "return_date": tour.return_date.strftime("%Y-%m-%d"),
        "return_date_formatted": tour.return_date.strftime("%A, %B %d, %Y"),
        "return_time": tour.return_time.strftime("%H:%M"),
        "duration_days": calc_days,
        "duration_display": calc_display,
        "total_capacity": tour.total_capacity,
        "booked_capacity": tour.booked_capacity,
        "remaining_capacity": tour.remaining_capacity,
        "adult_price": float(tour.adult_price),
        "child_price": float(tour.child_price),
        "price_unit": tour.price_unit,
        "is_live_pricing": bool(tour.is_live_pricing),
        "itinerary": tour.itinerary,
        "itinerary_highlights": [line.strip() for line in tour.itinerary.split("\n") if line.strip()],
        "ports_of_call": tour.ports_of_call,
        "meals_included": tour.meals_included,
        "tax_note": tour.tax_note,
        "status": tour.status,
        "is_published": bool(tour.is_published),
        "is_bookable": bool(tour.is_bookable),
        "source_url": tour.source_url,
        "source_checked": bool(tour.source_checked),
        "last_verified_at": tour.last_verified_at.strftime("%Y-%m-%d") if tour.last_verified_at else None,
        "ship": ship_data,
        "cabins": cabins,
        "fares": fares,
    }


def serialize_booking(b) -> Dict[str, Any]:
    user_full_name = b.user.full_name if b.user else "Passenger"
    user_email = b.user.email if b.user else ""
    user_phone = b.user.phone or "" if b.user else ""

    ticket_code = b.ticket_code or f"TK-{b.booking_id.replace('CRS-', '')}"

    tour = b.public_tour
    if tour:
        if tour.return_date and tour.departure_date:
            diff_days = (tour.return_date - tour.departure_date).days
            tour_duration_days = max(1, diff_days if diff_days > 0 else (tour.duration_days or 1))
        else:
            tour_duration_days = max(1, tour.duration_days or 1)

        tour_duration_display = tour.duration_display or (f"{tour_duration_days} Days" if tour_duration_days > 1 else "1 Day")
        tour_departure_port = tour.departure_port or (b.cross.departure_port if b.cross else "")
        tour_destination = tour.destination or (b.cross.destination if b.cross else "")
        tour_title = tour.tour_title or (b.cross.name if b.cross else "Cruise Tour")
        tour_route = f"{tour_departure_port} → {tour_destination}" if tour_departure_port and tour_destination else (b.cross.route if b.cross else "")
        tour_return_date = tour.return_date.strftime("%Y-%m-%d") if tour.return_date else None
        tour_return_date_formatted = tour.return_date.strftime("%A, %B %d, %Y") if tour.return_date else None
    else:
        tour_duration_days = b.cross.duration_days if b.cross else 1
        tour_duration_display = f"{float(b.duration_hours):g} Hours" if (b.booking_type == "EVENT" and float(b.duration_hours) > 0) else (f"{tour_duration_days} Days" if tour_duration_days > 1 else "1 Day")
        tour_departure_port = b.cross.departure_port if b.cross else ""
        tour_destination = b.cross.destination if b.cross else ""
        tour_title = b.cross.name if b.cross else ""
        tour_route = b.cross.route if b.cross else ""
        tour_return_date = None
        tour_return_date_formatted = None

    return {
        "id": b.id,
        "booking_id": b.booking_id,
        "invoice_number": b.invoice_number,
        "booking_type": b.booking_type,
        "cabin_type": b.cabin_type,
        "cabin_name": b.cabin_type,
        "event_type": b.event_type or "",
        "event_package": b.event_package or "",
        "qr_code_hash": b.qr_code_hash or b.booking_id,
        "cruise_id": b.cross.id if b.cross else 0,
        "cruise_name": b.cross.name if b.cross else "",
        "cruise_title": tour_title,
        "cruise_slug": b.cross.slug if b.cross else "",
        "cruise_image": (tour.image_url.strip() if tour and getattr(tour, 'image_url', None) and tour.image_url.strip() else None) or (b.cross.display_image_url if b.cross else ""),
        "destination": tour_destination,
        "departure_port": tour_departure_port,
        "route": tour_route,
        "booking_date": b.booking_date.strftime("%Y-%m-%d"),
        "booking_date_formatted": b.booking_date.strftime("%A, %B %d, %Y"),
        "return_date": tour_return_date,
        "return_date_formatted": tour_return_date_formatted,
        "start_time": b.start_time.strftime("%H:%M") if b.start_time else "10:00",
        "end_time": b.end_time.strftime("%H:%M") if b.end_time else "12:00",
        "duration_hours": float(b.duration_hours),
        "duration_days": tour_duration_days,
        "duration_display": tour_duration_display,
        "number_of_people": b.number_of_people,
        "passengers_count": b.number_of_people,
        "adults_count": b.adults_count,
        "children_count": b.children_count,
        "selected_extras": b.extras_list,
        "promo_code": b.promo_code or "",
        "base_price": float(b.base_price),
        "subtotal": float(b.subtotal),
        "extras_amount": float(b.extras_amount),
        "discount_amount": float(b.discount_amount),
        "tax_amount": float(b.tax_amount),
        "total_price": float(b.total_price),
        "status": b.status,
        "tracking_status": b.tracking_status,
        "special_request": b.special_request or "",
        "special_requests": b.special_request or "",
        "cancellation_reason": b.cancellation_reason or "",
        "is_cancellable": b.is_cancellable,
        "can_review": b.can_be_reviewed,
        "created_at": b.created_at.strftime("%B %d, %Y") if b.created_at else "",
        "customer_name": user_full_name,
        "customer_email": user_email,
        "customer_phone": user_phone,
        "operator_name": b.cross.effective_operator_name if b.cross else "",
        "public_tour_id": b.public_tour.id if b.public_tour else None,
        "public_tour_title": b.public_tour.tour_title if b.public_tour else None,
        "ticket_code": ticket_code,
        "ticket_status": b.ticket_status,
        "owner_payout_amount": float(b.owner_payout_amount or 0),
        "platform_commission_amount": float(b.platform_commission_amount or 0),
        "net_platform_profit": float(b.net_platform_profit or 0),
        "customer_whatsapp": b.customer_whatsapp or "",
        "customer_whatsapp_masked": mask_whatsapp_number(b.customer_whatsapp) if b.customer_whatsapp else "",
        "whatsapp_reminder_opt_in": bool(b.whatsapp_reminder_opt_in),
        "whatsapp_reminder_sent": bool(b.whatsapp_reminder_sent),
        "whatsapp_reminder_sent_at": b.whatsapp_reminder_sent_at.isoformat() if b.whatsapp_reminder_sent_at else None,
        "whatsapp_reminder_status": b.whatsapp_reminder_status,
        "whatsapp_reminder_message_id": b.whatsapp_reminder_message_id or "",
        "whatsapp_reminder_error": b.whatsapp_reminder_error or "",
        "payment_status": b.payment_status,
        "payout_status": b.payout_status,
        "payment_method": b.payment_method or "UPI / NetBanking",
        "payment_gateway_ref": b.payment_gateway_ref or f"PAY-{b.booking_id}",
        "refund_amount": float(b.refund_amount or 0),
        "refund_reason": b.refund_reason or "",
        "refund_date": b.refund_date.strftime("%Y-%m-%d %H:%M") if b.refund_date else None,
        "failure_reason": b.failure_reason or "",
        "review": b.review.to_dict() if getattr(b, "review", None) else None,
    }


def serialize_invoice(b) -> Dict[str, Any]:
    line_items = []
    if b.booking_type == "TOUR":
        line_items.append({
            "description": f"Passenger Tickets - {b.cabin_type or 'General Cabin'}",
            "quantity": b.number_of_people,
            "unit_price": float(b.base_price),
            "total": float(b.subtotal),
        })
    else:
        line_items.append({
            "description": f"Private Charter Rental ({float(b.duration_hours):.1f} Hours)",
            "quantity": 1,
            "unit_price": float(b.base_price),
            "total": float(b.subtotal),
        })

    for ex in b.extras_list:
        name = ex.get("name", "Extra Service") if isinstance(ex, dict) else str(ex)
        cost = float(ex.get("price", 0)) if isinstance(ex, dict) else 0.0
        line_items.append({
            "description": f"Add-on: {name}",
            "quantity": 1,
            "unit_price": cost,
            "total": cost,
        })

    tour = b.public_tour
    if tour:
        if tour.return_date and tour.departure_date:
            diff_days = (tour.return_date - tour.departure_date).days
            calc_days = max(1, diff_days if diff_days > 0 else (tour.duration_days or 1))
        else:
            calc_days = max(1, tour.duration_days or 1)
        invoice_dur = tour.duration_display or (f"{calc_days} Days" if calc_days > 1 else "1 Day")
        inv_ship = tour.tour_title or (b.cross.name if b.cross else "")
        inv_dep = tour.departure_port or (b.cross.departure_port if b.cross else "")
        inv_dest = tour.destination or (b.cross.destination if b.cross else "")
    else:
        invoice_dur = f"{float(b.duration_hours):.1f} Hours" if float(b.duration_hours) > 0 else (f"{b.cross.duration_days} Days" if b.cross and b.cross.duration_days > 1 else "1 Day")
        inv_ship = b.cross.name if b.cross else ""
        inv_dep = b.cross.departure_port if b.cross else ""
        inv_dest = b.cross.destination if b.cross else ""

    return {
        "invoice_number": b.invoice_number or f"INV-{b.booking_id}",
        "booking_id": b.booking_id,
        "issue_date": b.created_at.strftime("%Y-%m-%d") if b.created_at else date.today().strftime("%Y-%m-%d"),
        "customer_name": b.user.full_name if b.user else "Passenger",
        "customer_email": b.user.email if b.user else "",
        "customer_phone": b.user.phone or "" if b.user else "",
        "operator_name": b.cross.effective_operator_name if b.cross else "Cross-Hunt Fleet",
        "operator_company": b.cross.effective_operator_name if b.cross else "Cross-Hunt Fleet",
        "ship_name": inv_ship,
        "departure_port": inv_dep,
        "destination": inv_dest,
        "booking_date": b.booking_date.strftime("%Y-%m-%d"),
        "duration": invoice_dur,
        "currency": "INR (₹)",
        "currency_symbol": "₹",
        "line_items": line_items,
        "subtotal": float(b.subtotal),
        "extras_amount": float(b.extras_amount),
        "discount_amount": float(b.discount_amount),
        "tax_amount": float(b.tax_amount),
        "total_price": float(b.total_price),
        "status": b.status,
        "payment_status": b.payment_status,
    }


def serialize_transaction(b) -> Dict[str, Any]:
    gross = float(b.total_price) if b.total_price is not None else 0.0
    subtotal = float(b.subtotal) if b.subtotal is not None else gross
    discount = float(b.discount_amount) if b.discount_amount is not None else 0.0
    tax = float(b.tax_amount) if b.tax_amount is not None else 0.0
    payout = float(b.owner_payout_amount) if b.owner_payout_amount is not None else 0.0
    commission = float(b.platform_commission_amount) if b.platform_commission_amount is not None else 0.0
    net_profit = float(b.net_platform_profit) if b.net_platform_profit is not None else 0.0
    refund = float(b.refund_amount or 0)

    return {
        "id": b.id,
        "booking_id": b.booking_id,
        "invoice_number": b.invoice_number or f"INV-{b.booking_id}",
        "transaction_id": f"TXN-{b.booking_id}",
        "customer_name": b.user.full_name if b.user else "Guest",
        "customer_email": b.user.email if b.user else "",
        "customer_phone": b.user.phone or "" if b.user else "",
        "ship_name": b.cross.name if b.cross else "N/A",
        "booking_type": b.booking_type,
        "booking_date": b.booking_date.strftime("%Y-%m-%d"),
        "gross_amount": gross,
        "subtotal": subtotal,
        "discount_amount": discount,
        "tax_amount": tax,
        "owner_payout_amount": payout,
        "platform_commission_amount": commission,
        "net_platform_profit": net_profit,
        "commission_rate": 15,
        "payout_rate": 85,
        "payment_method": b.payment_method or "UPI / NetBanking",
        "payment_gateway_ref": b.payment_gateway_ref or f"PAY-{b.booking_id}",
        "payment_status": b.payment_status,
        "payout_status": b.payout_status,
        "refund_amount": refund,
        "refund_reason": b.refund_reason or "",
        "refund_date": b.refund_date.strftime("%Y-%m-%d %H:%M") if b.refund_date else None,
        "failure_reason": b.failure_reason or "",
        "created_at": b.created_at.strftime("%Y-%m-%d %H:%M") if b.created_at else ""
    }


def serialize_offer(offer) -> Dict[str, Any]:
    return {
        "id": offer.id,
        "code": offer.code,
        "title": offer.title,
        "description": offer.description or "",
        "discount_type": offer.discount_type,
        "discount_value": float(offer.discount_value),
        "min_booking_amount": float(offer.min_booking_amount or 0),
        "max_discount_amount": float(offer.max_discount_amount) if offer.max_discount_amount else None,
        "valid_from": offer.valid_from.strftime("%Y-%m-%d") if offer.valid_from else "",
        "valid_to": offer.valid_to.strftime("%Y-%m-%d") if offer.valid_to else "",
        "is_active": bool(offer.is_active),
    }
