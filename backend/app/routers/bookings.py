import json
import uuid
import hashlib
import socket
import os
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.database.session import get_db, checkpoint_db
from backend.app.models.user import User
from backend.app.models.cross import Cross
from backend.app.models.tour import PublicTour
from backend.app.models.offer import Offer, CrossReview
from backend.app.models.booking import Booking
from backend.app.dependencies.auth import get_optional_user, get_current_user
from backend.app.schemas.booking import CreateBookingPayload, CancelBookingPayload, ReviewPayload, WhatsAppOptPayload
from backend.app.services.serializers import serialize_booking, serialize_invoice
from backend.app.services.wallet_service import refund_booking_to_wallet, debit_wallet
from backend.app.services.whatsapp_service import (
    normalize_whatsapp_number, mask_whatsapp_number, build_tour_reminder_text, send_whatsapp_api_message
)
from backend.app.services.trip_lifecycle_service import run_lifecycle_check_throttled, auto_complete_trips

router = APIRouter(tags=["Bookings & Tickets"])


@router.post("/bookings/create/")
async def api_create_booking(
    payload: CreateBookingPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raw_type = (payload.booking_type or "EVENT").strip().upper()
    booking_type = "TOUR" if "TOUR" in raw_type else "EVENT"

    public_tour: Optional[PublicTour] = None
    cruise: Optional[Cross] = None

    tour_id = payload.public_tour_id
    tour_slug = payload.public_tour_slug

    if booking_type == "TOUR" or tour_id or tour_slug:
        booking_type = "TOUR"
        if tour_id:
            public_tour = db.query(PublicTour).filter(PublicTour.id == tour_id).first()
        elif tour_slug:
            public_tour = db.query(PublicTour).filter(PublicTour.slug == tour_slug).first()

        if not public_tour:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected public cruise tour is not found or no longer available."
            )
        cruise = public_tour.ship
    else:
        cruise_id = payload.cruise_id
        cruise_slug = (payload.cruise_slug or "").strip()
        if cruise_id:
            cruise = db.query(Cross).filter(Cross.id == cruise_id, Cross.is_active == True).first()
        elif cruise_slug:
            cruise = db.query(Cross).filter(Cross.slug == cruise_slug, Cross.is_active == True).first()

        if not cruise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected cruise vessel is not available."
            )

    if cruise.owner_id and cruise.owner_id == user.id and not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cruise operators cannot book their own fleet vessels."
        )

    adults_count = int(payload.adults_count or payload.passengers_count or payload.number_of_people or 1)
    children_count = int(payload.children_count or 0)
    total_people = adults_count + children_count

    if total_people <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passenger count must be at least 1."
        )

    promo_code = (payload.promo_code or "").strip().upper()
    special_request = (payload.special_requests or payload.special_request or "").strip()
    cabin_type = (payload.cabin_type or "Royal Balcony Stateroom").strip()

    raw_whatsapp = (payload.customer_whatsapp or "").strip()
    whatsapp_opt_in = bool(payload.whatsapp_reminder_opt_in if payload.whatsapp_reminder_opt_in is not None else True)

    if not raw_whatsapp:
        raw_whatsapp = user.whatsapp_number or user.phone or ""

    norm_whatsapp = ""
    if raw_whatsapp:
        norm_whatsapp = normalize_whatsapp_number(raw_whatsapp)
        if not norm_whatsapp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit Indian mobile number or international number with country code for WhatsApp tour updates."
            )

    if booking_type == "TOUR":
        if not public_tour.is_bookable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This cruise tour is no longer open for booking."
            )

        if public_tour.remaining_capacity < total_people:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {public_tour.remaining_capacity} seats remain on this tour. You requested {total_people}."
            )

        booking_date = public_tour.departure_date
        start_time = public_tour.departure_time
        end_time = public_tour.return_time
        if public_tour.return_date and public_tour.departure_date:
            actual_tour_days = max(1, (public_tour.return_date - public_tour.departure_date).days)
        else:
            actual_tour_days = max(1, public_tour.duration_days or 1)
        duration_hours = Decimal(str(actual_tour_days * 24))

        adult_total = public_tour.adult_price * Decimal(adults_count)
        child_total = public_tour.child_price * Decimal(children_count)
        base_calc = adult_total + child_total

        cabin_surcharge = Decimal("0.00")
        if "Suite" in cabin_type:
            cabin_surcharge = Decimal("5000.00") * Decimal(adults_count)
        elif "Balcony" in cabin_type:
            cabin_surcharge = Decimal("2500.00") * Decimal(adults_count)

        subtotal = base_calc + cabin_surcharge
        extras_amount = Decimal("0.00")
        selected_extras_list = []
        is_quote = False

        public_tour.booked_capacity += total_people

    else:
        booking_date_str = (payload.booking_date or "").strip()
        start_time_str = (payload.start_time or "16:00").strip()
        end_time_str = (payload.end_time or "22:00").strip()
        event_type = (payload.event_type or "Private Event").strip()
        event_package = (payload.event_package or "").strip()

        try:
            booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD."
            )

        if booking_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot charter a vessel for a past date."
            )

        try:
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time format. Expected HH:MM."
            )

        is_overnight = (start_time >= end_time)
        start_dt = datetime.combine(booking_date, start_time)
        end_dt = datetime.combine(booking_date + timedelta(days=1), end_time) if is_overnight else datetime.combine(booking_date, end_time)

        duration_hours = Decimal(str(round((end_dt - start_dt).total_seconds() / 3600.0, 2)))
        if duration_hours <= Decimal("0.00"):
            duration_hours = Decimal("1.00")

        if not cruise.has_unknown_capacity and total_people > cruise.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Guest count ({total_people}) exceeds maximum vessel capacity ({cruise.capacity})."
            )

        # Conflict checks
        tour_conflict = db.query(PublicTour).filter(
            PublicTour.ship_id == cruise.id,
            PublicTour.status.in_(["SCHEDULED", "BOARDING", "DEPARTED"]),
            PublicTour.departure_date <= booking_date,
            PublicTour.return_date >= booking_date
        ).first()
        if tour_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This vessel is scheduled on an active public cruise tour on {booking_date} and is not available for private charter."
            )

        # Overlapping booking check with mandatory 4-hour turnaround & maintenance buffer
        existing_bookings = db.query(Booking).filter(
            Booking.cross_id == cruise.id,
            Booking.booking_date == booking_date,
            Booking.status.in_(["PENDING", "CONFIRMED"])
        ).all()

        for eb in existing_bookings:
            eb_start = eb.start_time
            eb_end = eb.end_time

            # 1. Direct charter overlap check
            if not is_overnight:
                if eb_start < end_time and eb_end > start_time:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"This vessel is already booked from {eb_start.strftime('%I:%M %p')} to {eb_end.strftime('%I:%M %p')}. Please select another date or time slot."
                    )
            else:
                if eb_start < time(23, 59, 59) and eb_end > start_time:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This vessel is already booked for the selected schedule. Please select another date or time slot."
                    )

            # 2. Mandatory 4-hour post-charter turnaround & maintenance break
            eb_break_end_dt = datetime.combine(booking_date, eb_end) + timedelta(hours=4)
            if eb_break_end_dt.date() == booking_date:
                eb_break_end = eb_break_end_dt.time()
                if eb_end <= start_time < eb_break_end:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Vessel is undergoing mandatory 4-hour turnaround & maintenance break ({eb_end.strftime('%I:%M %p')} - {eb_break_end.strftime('%I:%M %p')}). Ready for next booking from {eb_break_end.strftime('%I:%M %p')} onward."
                    )

        # Base pricing
        is_quote = False
        rate_id = payload.rate_id
        rate = None
        if rate_id:
            for r in cruise.charter_rates:
                if r.id == rate_id:
                    rate = r
                    break

        if booking_type in ("EVENT", "PRIVATE_EVENT") and event_package:
            pkg_map = {
                "diamond": (Decimal("45000.00"), Decimal("1400.00")),
                "emerald": (Decimal("28000.00"), Decimal("950.00")),
                "sapphire": (Decimal("15000.00"), Decimal("650.00")),
            }
            pkg_key = event_package.lower()
            if pkg_key in pkg_map:
                base_fee, per_guest_fee = pkg_map[pkg_key]
                catering_fee = per_guest_fee * Decimal(total_people)
                ship_price = cruise.price if (cruise.price and cruise.price > Decimal("0.00")) else Decimal("65000.00")
                subtotal = ship_price + base_fee + catering_fee
                is_quote = False
            else:
                subtotal = cruise.price or Decimal("65000.00")
        elif rate:
            if rate.is_quote_based or rate.price is None or rate.price_unit == "QUOTE":
                subtotal = Decimal("0.00")
                is_quote = True
            elif rate.price_unit == "PER_BOAT":
                subtotal = rate.price
            elif rate.price_unit == "PER_HOUR":
                subtotal = rate.price * duration_hours
            elif rate.price_unit == "PER_PERSON":
                subtotal = rate.price * Decimal(total_people)
            else:
                subtotal = rate.price
        elif cruise.is_quote_based or cruise.price_unit == "QUOTE" or cruise.price == Decimal("0.00"):
            subtotal = Decimal("0.00")
            is_quote = True
        elif cruise.price_unit == "PER_HOUR":
            subtotal = cruise.price * duration_hours
        elif cruise.price_unit == "PER_PERSON":
            subtotal = cruise.price * Decimal(total_people)
        else:
            subtotal = cruise.price

        raw_extras = payload.selected_extras or []
        selected_extras_list = []
        extras_amount = Decimal("0.00")
        available_extras = {e.name.lower(): e for e in cruise.extras if e.is_available}

        for req_ex in raw_extras:
            ex_name = req_ex if isinstance(req_ex, str) else req_ex.get("name", "")
            matched_extra = available_extras.get(ex_name.lower())
            if matched_extra:
                if matched_extra.pricing_mode == "PER_GUEST":
                    cost = matched_extra.price * Decimal(total_people)
                else:
                    cost = matched_extra.price
                extras_amount += cost
                selected_extras_list.append({
                    "name": matched_extra.name,
                    "price": float(matched_extra.price),
                    "mode": matched_extra.pricing_mode,
                    "calculated_cost": float(cost)
                })

    discount_amount = Decimal("0.00")
    if promo_code and not is_quote:
        offer = db.query(Offer).filter(Offer.code.ilike(promo_code), Offer.is_active == True).first()
        if offer:
            discount_amount = offer.calculate_discount(subtotal + extras_amount)

    taxable_base = max(Decimal("0.00"), subtotal + extras_amount - discount_amount)
    if is_quote:
        tax_amount = Decimal("0.00")
        final_total = Decimal("0.00")
        b_status = "PENDING"
        t_status = "BOOKED"
    else:
        if booking_type in ("EVENT", "PRIVATE_EVENT"):
            tax_amount = Decimal(str(round(float(taxable_base) * 0.18 / 1.18, 2)))
            final_total = taxable_base
            is_paid = bool(payload.payment_gateway_ref or payload.payment_status == "PAID")
            b_status = "CONFIRMED" if is_paid else "PENDING"
            t_status = "CONFIRMED" if is_paid else "BOOKED"
        else:
            tax_amount = Decimal(str(round(float(taxable_base * Decimal("0.18")), 2)))
            final_total = taxable_base + tax_amount
            if not public_tour:
                is_paid = bool(payload.payment_gateway_ref or payload.payment_status == "PAID")
                b_status = "CONFIRMED" if is_paid else "PENDING"
                t_status = "CONFIRMED" if is_paid else "BOOKED"
            else:
                b_status = "CONFIRMED"
                t_status = "CONFIRMED"

    year = date.today().year
    unique_hex = uuid.uuid4().hex[:6].upper()
    booking_id = f"CRS-{year}-{unique_hex}"
    while db.query(Booking).filter(Booking.booking_id == booking_id).first():
        unique_hex = uuid.uuid4().hex[:6].upper()
        booking_id = f"CRS-{year}-{unique_hex}"

    inv_hex = uuid.uuid4().hex[:6].upper()
    invoice_number = f"INV-{year}-{inv_hex}"
    while db.query(Booking).filter(Booking.invoice_number == invoice_number).first():
        inv_hex = uuid.uuid4().hex[:6].upper()
        invoice_number = f"INV-{year}-{inv_hex}"

    qr_hash = hashlib.sha256(f"{booking_id}:{booking_date}:{uuid.uuid4().hex}".encode()).hexdigest()[:16].upper()
    ticket_code = f"TK-{unique_hex}"

    owner_payout = Decimal(str(round(float(subtotal or final_total) * 0.85, 2)))
    platform_comm = Decimal(str(round(float(subtotal or final_total) * 0.15, 2)))
    net_profit = max(Decimal("0.00"), final_total - owner_payout - discount_amount)

    pay_method = payload.payment_method or "UPI / NetBanking"
    pay_ref = payload.payment_gateway_ref or f"PAY-{booking_id}"
    pay_status = payload.payment_status or ("PAID" if not is_quote else "PENDING")

    wallet_txn = None
    if getattr(payload, "use_wallet", False) and not is_quote and final_total > Decimal("0.00"):
        user_bal = Decimal(str(round(float(user.wallet_balance or 0.0), 2)))
        if user_bal > Decimal("0.00"):
            wallet_paid = min(user_bal, final_total)
            if payload.wallet_amount_to_use is not None:
                req_w = Decimal(str(round(float(payload.wallet_amount_to_use), 2)))
                if req_w > Decimal("0.00"):
                    wallet_paid = min(wallet_paid, req_w)
            
            if wallet_paid > Decimal("0.00"):
                wallet_txn = debit_wallet(
                    db=db,
                    user=user,
                    amount=wallet_paid,
                    source="BOOKING_PAYMENT",
                    description=f"Payment for booking #{booking_id}",
                    booking=None,
                    reference_id=f"WLT-{booking_id}"
                )
                if wallet_paid >= final_total:
                    pay_method = "Cruise-Hunt Wallet"
                    pay_status = "PAID"
                    b_status = "CONFIRMED"
                    t_status = "CONFIRMED"
                else:
                    pay_method = f"Wallet (₹{float(wallet_paid):,.2f}) + {payload.payment_method or 'UPI'}"
                    if payload.payment_status == "PAID" or payload.payment_gateway_ref:
                        pay_status = "PAID"
                        b_status = "CONFIRMED"
                        t_status = "CONFIRMED"

    new_booking = Booking(
        booking_id=booking_id,
        invoice_number=invoice_number,
        user_id=user.id,
        cross_id=cruise.id,
        public_tour_id=public_tour.id if public_tour else None,
        booking_type=booking_type,
        cabin_type=cabin_type,
        event_type=payload.event_type if booking_type in ("EVENT", "PRIVATE_EVENT") else None,
        event_package=payload.event_package if booking_type in ("EVENT", "PRIVATE_EVENT") else None,
        qr_code_hash=qr_hash,
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        duration_hours=duration_hours,
        number_of_people=total_people,
        adults_count=adults_count,
        children_count=children_count,
        selected_extras=json.dumps(selected_extras_list),
        base_price=subtotal if booking_type in ("EVENT", "PRIVATE_EVENT") else (public_tour.adult_price if public_tour else cruise.price),
        subtotal=subtotal,
        extras_amount=extras_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_price=final_total,
        promo_code=promo_code,
        owner_payout_amount=owner_payout,
        platform_commission_amount=platform_comm,
        net_platform_profit=net_profit,
        ticket_code=ticket_code,
        ticket_status="VALID" if b_status == "CONFIRMED" else "PENDING",
        special_request=special_request,
        status=b_status,
        tracking_status=t_status,
        customer_whatsapp=norm_whatsapp or "",
        whatsapp_reminder_opt_in=whatsapp_opt_in,
        whatsapp_reminder_status="SCHEDULED" if (norm_whatsapp and whatsapp_opt_in) else ("OPTED_OUT" if not whatsapp_opt_in else "SCHEDULED"),
        payment_status=pay_status,
        payment_method=pay_method,
        payment_gateway_ref=pay_ref,
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    if wallet_txn:
        wallet_txn.booking_id = new_booking.id
        db.commit()

    checkpoint_db()

    msg = f"Inquiry registered successfully! Reference: {new_booking.booking_id}. Operator will provide quotation." if is_quote else f"Reservation confirmed successfully! Reference: {new_booking.booking_id}"

    return {
        "success": True,
        "message": msg,
        "booking": serialize_booking(new_booking)
    }


@router.post("/bookings/sync-lifecycle/")
@router.get("/bookings/sync-lifecycle/")
async def api_sync_lifecycle(db: Session = Depends(get_db)):
    """
    Explicit endpoint to synchronize real-time lifecycle status for all tours and bookings.
    """
    res = auto_complete_trips(db, force=True)
    return {"success": True, **res}


@router.get("/bookings/my-bookings/")
async def api_my_bookings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    run_lifecycle_check_throttled(db)

    bookings = db.query(Booking).filter(Booking.user_id == user.id).order_by(
        desc(Booking.created_at), desc(Booking.id)
    ).all()
    return {
        "total": len(bookings),
        "bookings": [serialize_booking(b) for b in bookings]
    }


@router.get("/bookings/{booking_id}/")
async def api_booking_detail(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    run_lifecycle_check_throttled(db)
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    is_owner = (booking.cross.owner_id == user.id) if booking.cross else False
    if booking.user_id != user.id and not is_owner and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )

    return {"booking": serialize_booking(booking)}


@router.get("/bookings/{booking_id}/invoice/")
async def api_booking_invoice(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    is_owner = (booking.cross.owner_id == user.id) if booking.cross else False
    if booking.user_id != user.id and not is_owner and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )

    return {"invoice": serialize_invoice(booking)}


@router.post("/bookings/{booking_id}/cancel/")
async def api_cancel_booking(
    booking_id: str,
    payload: Optional[CancelBookingPayload] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_id = booking_id.strip()
    clean_no_hash = clean_id.lstrip("#")

    booking = db.query(Booking).filter(
        or_(
            Booking.booking_id == clean_id,
            Booking.booking_id == clean_no_hash,
            Booking.booking_id == f"#{clean_no_hash}",
            Booking.ticket_code == clean_id,
            Booking.ticket_code == clean_no_hash,
            Booking.qr_code_hash == clean_id,
            (Booking.id == int(clean_no_hash)) if clean_no_hash.isdigit() else False
        )
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    is_customer = (booking.user_id == user.id)
    is_owner = (booking.cross and booking.cross.owner_id == user.id)
    is_admin = bool(user.is_admin or user.is_superuser)

    if not (is_customer or is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied. Only the customer, ship owner, or administrator can cancel this reservation."
        )

    # Strictly block cancellation if passenger has already boarded or ride is ongoing / completed
    if booking.status in ("ON_TRIP", "ON_RIDE", "BOARDED", "IN_PROGRESS") or booking.tracking_status in ("ON_TRIP", "ON_RIDE", "BOARDED", "IN_PROGRESS"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reservation cannot be cancelled as the passenger has already boarded the vessel / the ride is currently in progress (On Trip / On Ride)."
        )

    if booking.status == "COMPLETED" or booking.tracking_status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reservation cannot be cancelled as the voyage or ride has already been completed."
        )

    if not booking.is_cancellable and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reservation cannot be cancelled as it is past the allowed cutoff or already cancelled."
        )

    caller_type = "operator / ship owner" if is_owner else ("administrator" if is_admin and not is_customer else "guest")
    default_reason = f"Cancelled by {caller_type}."
    reason = payload.reason if payload and payload.reason else default_reason

    booking.status = "CANCELLED"
    booking.tracking_status = "CANCELLED"
    booking.ticket_status = "CANCELLED"
    booking.cancellation_reason = reason

    if booking.booking_type == "TOUR" and booking.public_tour:
        booking.public_tour.booked_capacity = max(0, booking.public_tour.booked_capacity - booking.number_of_people)

    # Automatically credit refund amount directly into the CUSTOMER's wallet (regardless of who cancelled)
    refund_amount, wallet_tx = refund_booking_to_wallet(
        db=db,
        booking=booking,
        reason=reason,
        source="CANCELLATION_REFUND"
    )

    db.commit()
    db.refresh(booking)
    if is_customer:
        db.refresh(user)
    checkpoint_db()

    customer = booking.user or db.query(User).filter(User.id == booking.user_id).first()
    customer_balance = float(customer.wallet_balance or 0.0) if customer else 0.0

    refund_msg = f" ₹{float(refund_amount):,.2f} has been refunded immediately to the customer's wallet." if refund_amount > Decimal("0.00") else ""

    return {
        "success": True,
        "message": f"Reservation cancelled successfully.{refund_msg}",
        "status": "CANCELLED",
        "refund_amount": float(refund_amount),
        "wallet_balance": customer_balance,
        "customer_wallet_balance": customer_balance,
        "booking": serialize_booking(booking)
    }


@router.post("/bookings/{booking_id}/review/")
async def api_review_booking(
    booking_id: str,
    payload: ReviewPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id, Booking.user_id == user.id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    if booking.status not in ("CONFIRMED", "COMPLETED") or booking.is_upcoming:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviews and complaints can only be submitted after voyage completion."
        )

    existing = db.query(CrossReview).filter(CrossReview.booking_id == booking.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this voyage."
        )

    comment = payload.comment.strip()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review comment cannot be empty."
        )

    has_complaint = bool(payload.has_complaint)
    complaint_category = (payload.complaint_category or "Service & Quality").strip()
    complaint_text = (payload.complaint_text or "").strip()
    if has_complaint and not complaint_text:
        complaint_text = comment

    review = CrossReview(
        cross_id=booking.cross_id,
        user_id=user.id,
        booking_id=booking.id,
        rating=max(1, min(5, payload.rating)),
        comment=comment,
        has_complaint=has_complaint,
        complaint_category=complaint_category if has_complaint else "",
        complaint_text=complaint_text if has_complaint else "",
        complaint_status="PENDING" if has_complaint else "NONE"
    )
    db.add(review)
    db.commit()
    checkpoint_db()

    msg = "Review & Complaint submitted successfully. Platform administration will review your report." if has_complaint else "Review published successfully!"
    return {"success": True, "message": msg, "review": review.to_dict()}


@router.post("/bookings/{booking_id}/whatsapp-opt/")
async def api_booking_whatsapp_opt(
    booking_id: str,
    payload: WhatsAppOptPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    if booking.user_id != user.id and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )

    booking.whatsapp_reminder_opt_in = payload.opt_in
    if not booking.whatsapp_reminder_sent:
        booking.whatsapp_reminder_status = "SCHEDULED" if payload.opt_in else "OPTED_OUT"

    if payload.whatsapp_number is not None:
        raw_num = payload.whatsapp_number.strip()
        if raw_num:
            norm = normalize_whatsapp_number(raw_num)
            if not norm:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid WhatsApp mobile number format. Please provide a valid 10-digit mobile."
                )
            booking.customer_whatsapp = norm
        else:
            booking.customer_whatsapp = ""

    db.commit()
    db.refresh(booking)

    status_msg = "WhatsApp embarkation reminders are now ACTIVE for this voyage." if booking.whatsapp_reminder_opt_in else "You have opted out of WhatsApp reminders for this voyage."
    return {
        "success": True,
        "message": status_msg,
        "booking": serialize_booking(booking)
    }


@router.post("/bookings/{booking_id}/whatsapp-test/")
async def api_booking_whatsapp_test(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    if booking.user_id != user.id and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )

    target_number = booking.customer_whatsapp or (booking.user.whatsapp_number if booking.user else None) or (booking.user.phone if booking.user else None)
    if not target_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No WhatsApp number registered for this booking."
        )

    reminder_text = build_tour_reminder_text(booking)
    res = send_whatsapp_api_message(
        to_number=target_number,
        message_text=reminder_text,
        booking=booking,
        message_type="TOUR_REMINDER_TEST",
        db=db
    )

    is_live = res.get("is_live_api", False)
    provider_name = res.get("provider", "META_CLOUD_SIMULATOR")
    status_label = res.get('status', 'SENT').lower()

    if is_live:
        msg = f"Live WhatsApp reminder dispatched to {res.get('recipient')} via Meta Cloud API."
    else:
        msg = f"WhatsApp reminder generated for {res.get('recipient')}. Use the Direct WhatsApp Link to send immediately."

    return {
        "success": res.get("success", False),
        "message": msg,
        "result": res,
        "wa_link": res.get("wa_link"),
        "is_live_api": is_live,
        "provider": provider_name,
        "booking": serialize_booking(booking)
    }


@router.get("/bookings/{booking_id}/whatsapp-link/")
async def api_booking_whatsapp_link(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import urllib.parse

    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    if booking.user_id != user.id and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )

    target_number = booking.customer_whatsapp or (booking.user.whatsapp_number if booking.user else None) or (booking.user.phone if booking.user else None)
    norm = normalize_whatsapp_number(target_number)
    if not norm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid WhatsApp mobile number associated with this booking."
        )

    clean_digits = norm.replace("+", "")
    reminder_text = build_tour_reminder_text(booking)
    wa_link = f"https://web.whatsapp.com/send?phone={clean_digits}&text={urllib.parse.quote(reminder_text)}"

    return {
        "success": True,
        "booking_id": booking.booking_id,
        "recipient": norm,
        "recipient_masked": mask_whatsapp_number(norm),
        "wa_link": wa_link,
        "message_text": reminder_text
    }


@router.get("/tickets/verify/{code}/")
async def api_ticket_verify(
    code: str,
    request: Request,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    code_clean = code.strip()
    code_no_hash = code_clean.lstrip("#")
    if not code_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing ticket verification token."
        )

    booking = db.query(Booking).filter(
        or_(
            Booking.ticket_code.ilike(code_clean),
            Booking.ticket_code.ilike(code_no_hash),
            Booking.qr_code_hash.ilike(code_clean),
            Booking.qr_code_hash.ilike(code_no_hash),
            Booking.booking_id.ilike(code_clean),
            Booking.booking_id.ilike(code_no_hash),
            Booking.booking_id.ilike(f"#{code_no_hash}")
        )
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verified cruise reservation found for this boarding code."
        )

    today = date.today()
    ticket_status = booking.ticket_status or "VALID"
    booking_status = booking.status
    tracking_status = booking.tracking_status or "BOOKED"

    is_activity = (booking.booking_type == "ACTIVITY" or (booking.cross and getattr(booking.cross, "category", "") == "ACTIVITY"))
    is_private = (booking.booking_type in ("EVENT", "PRIVATE_EVENT", "PRIVATE_CHARTER") or (booking.cross and getattr(booking.cross, "listing_type", "") == "PRIVATE_CHARTER"))
    active_state_label = "ON RIDE" if is_activity else "ON TRIP"
    booking_category = "ACTIVITY" if is_activity else ("PRIVATE_CHARTER" if is_private else "PUBLIC_TOUR")

    if booking_status == "CANCELLED" or ticket_status == "CANCELLED":
        st = "CANCELLED"
        st_display = "INVALID TICKET - RESERVATION CANCELLED"
        valid = False
        trip_phase = "CANCELLED"
    elif booking_status in ("ON_TRIP", "ON_RIDE") or tracking_status in ("ON_TRIP", "ON_RIDE"):
        st = "ON_RIDE" if is_activity else "ON_TRIP"
        st_display = f"GUEST ADMITTED • CURRENTLY {active_state_label}"
        valid = True
        trip_phase = "ACTIVE"
    elif ticket_status == "USED" or booking_status == "COMPLETED" or tracking_status == "COMPLETED":
        st = "USED"
        st_display = f"{'RIDE' if is_activity else 'VOYAGE'} COMPLETED • PASS USED"
        valid = False
        trip_phase = "COMPLETED"
    elif booking.booking_date < today:
        st = "EXPIRED"
        st_display = "EXPIRED BOARDING PASS"
        valid = False
        trip_phase = "EXPIRED"
    elif booking_status in ("CONFIRMED", "PENDING"):
        st = "VALID"
        st_display = f"VALID PASS • READY TO BOARD ({active_state_label})"
        valid = True
        trip_phase = "READY_TO_BOARD"
    else:
        st = "PENDING"
        st_display = "RESERVATION PENDING CONFIRMATION"
        valid = False
        trip_phase = "PENDING"

    can_mark_used = False
    if user:
        if user.is_admin or (booking.cross and booking.cross.owner_id == user.id):
            can_mark_used = (trip_phase in ("READY_TO_BOARD", "ACTIVE"))

    cabin_seat = booking.cabin_type or "General Seating"
    op_name = booking.cross.effective_operator_name if booking.cross else "Official Maritime Carrier"
    dep_port = (booking.public_tour.departure_port if booking.public_tour else None) or (booking.cross.departure_port if booking.cross else "")
    dest = (booking.public_tour.destination if booking.public_tour else None) or (booking.cross.destination if booking.cross else "")

    # Privacy masking for public gate check: do NOT expose raw customer WhatsApp or unmasked phone
    passenger_email = booking.user.email if (user and (user.id == booking.user_id or user.is_admin)) else ""
    passenger_phone = mask_whatsapp_number(booking.user.phone) if (user and (user.id == booking.user_id or user.is_admin)) else ""

    serialized_booking = serialize_booking(booking)

    return {
        "valid": valid,
        "is_valid": valid,
        "status": st,
        "status_display": st_display,
        "trip_phase": trip_phase,
        "booking_category": booking_category,
        "is_activity": is_activity,
        "is_private": is_private,
        "active_state_label": active_state_label,
        "can_board": (trip_phase == "READY_TO_BOARD"),
        "can_complete": (trip_phase == "ACTIVE"),
        "booking_id": booking.booking_id,
        "ticket_id": booking.ticket_code or f"TK-{booking.booking_id.replace('CRS-', '')}",
        "verification_code": booking.qr_code_hash or code_clean,
        "passenger_name": booking.user.full_name if booking.user else "Passenger",
        "passenger_email": passenger_email,
        "passenger_phone": passenger_phone,
        "passengers_count": booking.number_of_people,
        "adults_count": booking.adults_count,
        "children_count": booking.children_count,
        "ship_name": booking.cross.name if booking.cross else "",
        "operator_name": op_name,
        "route": f"{dep_port} → {dest}",
        "departure_port": dep_port,
        "destination": dest,
        "departure_date": booking.booking_date.strftime("%Y-%m-%d"),
        "departure_date_formatted": booking.booking_date.strftime("%A, %B %d, %Y"),
        "departure_time": booking.start_time.strftime("%H:%M") if booking.start_time else "10:00",
        "return_date": serialized_booking.get("return_date"),
        "duration_days": serialized_booking.get("duration_days"),
        "duration_display": serialized_booking.get("duration_display"),
        "cabin_seat": cabin_seat,
        "booking_type": "Water Sports Activity" if is_activity else ("Private Charter" if is_private else "Public Cruise Tour Ticket"),
        "total_price": float(booking.total_price),
        "tracking_status": booking.tracking_status,
        "can_mark_used": can_mark_used,
        "booking": serialized_booking,
    }


@router.post("/tickets/verify/{code}/mark-used/")
async def api_ticket_mark_used(
    code: str,
    action: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code_clean = code.strip()
    code_no_hash = code_clean.lstrip("#")
    booking = db.query(Booking).filter(
        or_(
            Booking.ticket_code.ilike(code_clean),
            Booking.ticket_code.ilike(code_no_hash),
            Booking.qr_code_hash.ilike(code_clean),
            Booking.qr_code_hash.ilike(code_no_hash),
            Booking.booking_id.ilike(code_clean),
            Booking.booking_id.ilike(code_no_hash),
            Booking.booking_id.ilike(f"#{code_no_hash}")
        )
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found."
        )

    is_owner = (booking.cross.owner_id == user.id) if booking.cross else False
    if not is_owner and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the vessel owner or platform admin can validate boarding passes."
        )

    is_activity = (booking.booking_type == "ACTIVITY" or (booking.cross and getattr(booking.cross, "category", "") == "ACTIVITY"))
    on_state = "ON_RIDE" if is_activity else "ON_TRIP"
    action_lower = (action or "").strip().lower()

    if action_lower in ("board", "start", "admit") or (not action_lower and booking.status not in ("ON_TRIP", "ON_RIDE", "COMPLETED")):
        booking.status = on_state
        booking.tracking_status = on_state
        booking.ticket_status = "VALID"
        db.commit()
        db.refresh(booking)
        checkpoint_db()
        return {
            "success": True,
            "message": f"Passenger admitted! Status set to {on_state}. Guest is now active and cancellation is locked.",
            "ticket_status": "VALID",
            "tracking_status": on_state,
            "status": on_state,
            "trip_phase": "ACTIVE",
            "is_activity": is_activity,
            "active_state_label": on_state,
            "booking": serialize_booking(booking)
        }
    elif action_lower in ("complete", "finish", "end") or (not action_lower and booking.status in ("ON_TRIP", "ON_RIDE")):
        booking.status = "COMPLETED"
        booking.tracking_status = "COMPLETED"
        booking.ticket_status = "USED"
        db.commit()
        db.refresh(booking)
        checkpoint_db()
        return {
            "success": True,
            "message": f"{'Water sports ride' if is_activity else 'Voyage'} completed! Pass marked as USED.",
            "ticket_status": "USED",
            "tracking_status": "COMPLETED",
            "status": "COMPLETED",
            "trip_phase": "COMPLETED",
            "is_activity": is_activity,
            "active_state_label": on_state,
            "booking": serialize_booking(booking)
        }
    else:
        booking.ticket_status = "USED"
        booking.tracking_status = "COMPLETED"
        booking.status = "COMPLETED"
        db.commit()
        db.refresh(booking)
        checkpoint_db()
        return {
            "success": True,
            "message": f"Boarding pass #{booking.ticket_code} marked as USED / Completed successfully.",
            "ticket_status": "USED",
            "tracking_status": "COMPLETED",
            "status": "COMPLETED",
            "trip_phase": "COMPLETED",
            "is_activity": is_activity,
            "active_state_label": on_state,
            "booking": serialize_booking(booking)
        }


@router.get("/system/network-info/")
async def api_network_info():
    """Returns local LAN IP and preferred base URL for phone QR code scanning."""
    lan_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.2)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            lan_ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            lan_ip = "127.0.0.1"

    public_url = os.environ.get("PUBLIC_APP_URL") or os.environ.get("VITE_PUBLIC_URL") or ""
    network_url = f"http://{lan_ip}:5173" if lan_ip != "127.0.0.1" else "http://localhost:5173"

    return {
        "lan_ip": lan_ip,
        "frontend_port": 5173,
        "backend_port": 8000,
        "network_url": network_url,
        "public_url": public_url,
        "active_base_url": public_url if public_url else network_url
    }

