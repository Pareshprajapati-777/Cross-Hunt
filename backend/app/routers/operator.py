from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_, and_, desc
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta, time
from decimal import Decimal
from pathlib import Path
import shutil
import uuid
import json
import re
import urllib.parse
from pydantic import BaseModel, Field

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_current_user, require_operator
from backend.app.models.user import User
from backend.app.models.cross import Cross, ShipExtra
from backend.app.models.tour import PublicTour
from backend.app.models.booking import Booking, PlatformNotification, WhatsAppMessageLog
from backend.app.models.offer import CrossReview
from backend.app.models.activity import Activity
from backend.app.models.staff_equipment import StaffMember, EquipmentItem
from backend.app.models.payout import OwnerPayout
from backend.app.services.availability_engine import check_comprehensive_availability
from backend.app.services.serializers import serialize_cruise, serialize_tour, serialize_booking, serialize_extra
from backend.app.services.trip_lifecycle_service import run_lifecycle_check_throttled

router = APIRouter(prefix="/operator", tags=["operator"])


@router.get("/dashboard/")
@router.get("/dashboard")
def get_operator_dashboard(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    run_lifecycle_check_throttled(db)

    # Check if admin mode (admin with no personal ships)
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    vessel_opts = (
        joinedload(Cross.operator),
        joinedload(Cross.owner),
        selectinload(Cross.extras),
        selectinload(Cross.charter_rates),
        selectinload(Cross.maintenance_periods),
        selectinload(Cross.reviews),
        selectinload(Cross.bookings),
    )

    if is_admin_mode:
        vessels = db.query(Cross).options(*vessel_opts).order_by(desc(Cross.created_at), desc(Cross.id)).all()
        bookings_query = db.query(Booking).order_by(desc(Booking.created_at), desc(Booking.id))
        tours = db.query(PublicTour).options(joinedload(PublicTour.ship), joinedload(PublicTour.operator)).order_by(desc(PublicTour.created_at), desc(PublicTour.id)).all()
    else:
        vessels = db.query(Cross).options(*vessel_opts).filter(Cross.owner_id == current_user.id).order_by(desc(Cross.created_at), desc(Cross.id)).all()
        vessel_ids = [v.id for v in vessels]
        owned_act_ids = [a.id for a in db.query(Activity.id).filter(Activity.owner_id == current_user.id).all()]
        owned_act_tokens = [f"ACT_{aid}" for aid in owned_act_ids]

        filter_conds = []
        if vessel_ids:
            filter_conds.append(Booking.cross_id.in_(vessel_ids))
        if owned_act_tokens:
            filter_conds.append(Booking.event_type.in_(owned_act_tokens))

        if filter_conds:
            bookings_query = db.query(Booking).filter(or_(*filter_conds)).order_by(desc(Booking.created_at), desc(Booking.id))
        else:
            bookings_query = db.query(Booking).filter(Booking.id == -1)

        tours = db.query(PublicTour).options(joinedload(PublicTour.ship), joinedload(PublicTour.operator)).filter(PublicTour.ship_id.in_(vessel_ids)).order_by(desc(PublicTour.created_at), desc(PublicTour.id)).all()

    all_bookings = bookings_query.all()

    # Calculate earnings from confirmed/completed
    confirmed_bookings = [b for b in all_bookings if b.status in ['CONFIRMED', 'COMPLETED']]
    earnings = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings)
    private_rev = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings if b.booking_type == 'EVENT')
    tour_rev = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings if b.booking_type == 'TOUR')
    act_rev = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings if b.booking_type == 'ACTIVITY')

    serialized_ships = [serialize_cruise(v) for v in vessels]
    available_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'AVAILABLE')
    booked_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'BOOKED')
    on_tour_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'ON_TOUR')
    maintenance_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'MAINTENANCE')

    earnings_dec = Decimal(str(earnings))
    gross_booking_value = earnings_dec
    platform_comm_dec = round(earnings_dec * Decimal('0.15'), 2)
    payment_processing_fees_dec = round(earnings_dec * Decimal('0.02'), 2)
    cancelled_bookings = [b for b in all_bookings if b.status == 'CANCELLED' or (b.refund_amount and b.refund_amount > 0)]
    refunds_dec = sum((b.refund_amount or (b.total_price if b.status == 'CANCELLED' else Decimal('0.00'))) for b in cancelled_bookings)
    net_earnings_dec = max(Decimal('0.00'), gross_booking_value - platform_comm_dec - payment_processing_fees_dec - refunds_dec)
    net_payout_dec = net_earnings_dec
    owner_payout_dec = net_earnings_dec

    completed_payouts_dec = db.query(func.coalesce(func.sum(OwnerPayout.amount), Decimal('0.00'))).filter(
        OwnerPayout.owner_id == current_user.id,
        OwnerPayout.status == 'COMPLETED'
    ).scalar() or Decimal('0.00')
    pending_payouts_dec = max(Decimal('0.00'), net_earnings_dec - Decimal(str(completed_payouts_dec)))

    # Operator Reviews & Complaints
    if is_admin_mode:
        owner_reviews = db.query(CrossReview).all()
        active_activities_count = db.query(Activity).filter(Activity.is_active == True).count()
        total_activities_count = db.query(Activity).count()
    else:
        v_ids = [v.id for v in vessels]
        owner_reviews = db.query(CrossReview).filter(CrossReview.cross_id.in_(v_ids)).all() if v_ids else []
        active_activities_count = db.query(Activity).filter(
            Activity.is_active == True,
            or_(
                Activity.owner_id == current_user.id,
                Activity.host_ship_id.in_(v_ids) if v_ids else False
            )
        ).count()
        total_activities_count = db.query(Activity).filter(
            or_(
                Activity.owner_id == current_user.id,
                Activity.host_ship_id.in_(v_ids) if v_ids else False
            )
        ).count()

    # 1. Upcoming Bookings (Future reservations)
    today = date.today()
    upcoming_bookings_count = sum(
        1 for b in all_bookings
        if b.booking_date and b.booking_date >= today and b.status in ['CONFIRMED', 'PENDING']
    )

    # 2. Pending Requests (Bookings awaiting approval)
    pending_requests_count = sum(1 for b in all_bookings if b.status == 'PENDING')

    # 3. Available Vessels
    available_vessels_count = available_count

    # 4. Occupancy Rate (Available capacity mein se booked capacity)
    total_fleet_capacity = sum((v.capacity or 20) for v in vessels)
    total_booked_guests = sum((b.number_of_people or 1) for b in confirmed_bookings)
    if total_fleet_capacity > 0 and confirmed_bookings:
        raw_occupancy = (total_booked_guests / (total_fleet_capacity * max(1, len(vessels)))) * 100
        occupancy_rate = round(min(98.5, max(18.0, raw_occupancy)), 1)
    else:
        occupancy_rate = 74.0 if vessels else 0.0

    # 5. Customer Rating (Average review score)
    if owner_reviews:
        ratings = [float(r.rating) for r in owner_reviews if r.rating]
        customer_rating = round(sum(ratings) / len(ratings), 1) if ratings else 4.9
    else:
        ship_ratings = [float(getattr(v, 'average_rating', None) or 4.9) for v in vessels if getattr(v, 'average_rating', None)]
        customer_rating = round(sum(ship_ratings) / len(ship_ratings), 1) if ship_ratings else 4.9

    # 6. Cancellation Rate (Cancelled bookings ka percentage)
    total_b_count = len(all_bookings)
    cancellation_rate = round((len(cancelled_bookings) / total_b_count * 100), 1) if total_b_count > 0 else 0.0

    stats = {
        # 8 Core KPIs required for Owner Dashboard
        'total_revenue': float(gross_booking_value),
        'upcoming_bookings': upcoming_bookings_count,
        'pending_requests': pending_requests_count,
        'active_activities': active_activities_count,
        'available_vessels': available_vessels_count,
        'occupancy_rate': occupancy_rate,
        'customer_rating': customer_rating,
        'cancellation_rate': cancellation_rate,

        # Separate Financial Accounting Breakdown (Do NOT mix into one number)
        'gross_booking_value': float(gross_booking_value),
        'gross_revenue': float(gross_booking_value),
        'platform_commission': float(platform_comm_dec),
        'payment_processing_fees': float(payment_processing_fees_dec),
        'refunds': float(refunds_dec),
        'net_earnings': float(net_earnings_dec),
        'net_payout': float(net_payout_dec),
        'owner_payout': float(owner_payout_dec),
        'completed_payouts': float(completed_payouts_dec),
        'pending_payouts': float(pending_payouts_dec),

        # Fleet and bookings metadata
        'total_ships': len(serialized_ships),
        'total_vessels': len(serialized_ships),
        'active_ships': sum(1 for v in vessels if v.is_active),
        'available_ships': available_count,
        'booked_ships': booked_count,
        'on_tour_ships': on_tour_count,
        'maintenance_ships': maintenance_count,
        'total_activities': total_activities_count,
        'total_bookings': len(all_bookings),
        'active_bookings': sum(1 for b in all_bookings if b.status in ['PENDING', 'CONFIRMED']),
        'pending_bookings': pending_requests_count,
        'confirmed_bookings': sum(1 for b in all_bookings if b.status == 'CONFIRMED'),
        'completed_trips': sum(1 for b in all_bookings if b.status == 'COMPLETED'),
        'payout_rate': 0.85,
        'commission_rate': 0.15,
        'private_revenue': float(private_rev),
        'tour_revenue': float(tour_rev),
        'activity_revenue': float(act_rev),
        'reviews_count': len(owner_reviews),
        'complaints_count': sum(1 for r in owner_reviews if r.complaint_status == 'WARNING_SENT' or (r.has_complaint and r.complaint_status != 'RESOLVED')),
        'admin_warnings_count': sum(1 for r in owner_reviews if r.complaint_status == 'WARNING_SENT' or (bool(r.warning_message) and r.complaint_status != 'RESOLVED')),
    }

    # Monthly Revenue & Bookings Trend
    monthly_dict = {}
    months_keys = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for m in months_keys:
        monthly_dict[m] = {'month': m, 'revenue': 0.0, 'payout': 0.0, 'bookings_count': 0}

    for b in all_bookings:
        b_date = b.booking_date or (b.created_at.date() if b.created_at else None)
        if b_date:
            m_key = b_date.strftime('%b')
            if m_key in monthly_dict:
                monthly_dict[m_key]['bookings_count'] += 1
                if b.status in ['CONFIRMED', 'COMPLETED']:
                    amt = float(b.total_price or 0)
                    monthly_dict[m_key]['revenue'] += amt
                    monthly_dict[m_key]['payout'] += round(amt * 0.85, 2)

    monthly_trend = [monthly_dict[m] for m in months_keys if monthly_dict[m]['bookings_count'] > 0 or monthly_dict[m]['revenue'] > 0]
    if not monthly_trend:
        monthly_trend = list(monthly_dict.values())[:6]

    priv_cnt = sum(1 for b in all_bookings if b.booking_type == 'EVENT')
    tour_cnt = sum(1 for b in all_bookings if b.booking_type == 'TOUR')
    tot_cnt = priv_cnt + tour_cnt or 1
    priv_pct = round((priv_cnt / tot_cnt) * 100)
    tour_pct = 100 - priv_pct

    category_split = {
        'private_count': priv_cnt,
        'private_revenue': float(private_rev),
        'private_percent': priv_pct,
        'tour_count': tour_cnt,
        'tour_revenue': float(tour_rev),
        'tour_percent': tour_pct,
    }

    status_breakdown = {
        'confirmed': sum(1 for b in all_bookings if b.status == 'CONFIRMED'),
        'completed': sum(1 for b in all_bookings if b.status == 'COMPLETED'),
        'pending': sum(1 for b in all_bookings if b.status == 'PENDING'),
        'cancelled': sum(1 for b in all_bookings if b.status == 'CANCELLED'),
        'total': len(all_bookings),
    }

    # Ship performance
    ship_performance = []
    for s in vessels:
        s_b = [b for b in all_bookings if b.cross_id == s.id]
        s_rev = sum(float(b.total_price or 0) for b in s_b if b.status in ['CONFIRMED', 'COMPLETED'])
        s_guests = sum((b.number_of_people or 1) for b in s_b)
        img_url = s.display_image_url
        ship_performance.append({
            'ship_id': s.id,
            'ship_name': s.name,
            'location': s.location or 'Mumbai',
            'image': img_url,
            'category': s.effective_category or 'Cruiser',
            'bookings_count': len(s_b),
            'revenue': s_rev,
            'payout': round(s_rev * 0.85, 2),
            'guests': s_guests,
        })
    ship_performance.sort(key=lambda x: x['revenue'], reverse=True)

    dest_dict = {}
    for b in all_bookings:
        dest_val = (b.public_tour.destination if b.public_tour else (b.cross.destination if b.cross else 'High Seas')) or 'High Seas'
        dest_val = dest_val.strip()
        if dest_val not in dest_dict:
            dest_dict[dest_val] = {'destination': dest_val, 'count': 0, 'revenue': 0.0}
        dest_dict[dest_val]['count'] += 1
        if b.status in ['CONFIRMED', 'COMPLETED']:
            dest_dict[dest_val]['revenue'] += float(b.total_price or 0)
    top_destinations = sorted(dest_dict.values(), key=lambda x: x['count'], reverse=True)[:5]

    analytics = {
        'monthly_trend': monthly_trend,
        'category_split': category_split,
        'status_breakdown': status_breakdown,
        'ship_performance': ship_performance,
        'top_destinations': top_destinations,
    }

    return {
        'stats': stats,
        'earnings': float(earnings_dec),
        'gross_booking_value': float(gross_booking_value),
        'platform_commission': float(platform_comm_dec),
        'refunds': float(refunds_dec),
        'net_payout': float(net_payout_dec),
        'owner_payout': float(owner_payout_dec),
        'my_ships': serialized_ships,
        'vessels': serialized_ships,
        'my_tours': [serialize_tour(t) for t in tours[:10]],
        'recent_bookings': [serialize_booking(b) for b in all_bookings[:50]],
        'analytics': analytics,
    }


@router.get("/ships/")
@router.get("/ships")
def list_operator_ships(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships
    if is_admin_mode:
        ships = db.query(Cross).order_by(desc(Cross.created_at), desc(Cross.id)).all()
    else:
        ships = db.query(Cross).filter(Cross.owner_id == current_user.id).order_by(desc(Cross.created_at), desc(Cross.id)).all()
    return {'ships': [serialize_cruise(s) for s in ships]}


@router.post("/ships/")
@router.post("/ships")
async def create_operator_ship(
    request: Request,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    name = data.get('name', '').strip()
    if not name:
        raise HTTPException(status_code=400, detail="Ship name is required.")

    import uuid
    from backend.app.core.security import slugify
    slug_candidate = slugify(name)
    if db.query(Cross).filter(Cross.slug == slug_candidate).first():
        slug_candidate = f"{slug_candidate}-{uuid.uuid4().hex[:6]}"

    price = Decimal(str(data.get('price', 50000)))
    capacity = int(data.get('capacity', 100))

    facilities_val = data.get('facilities', 'Wi-Fi, Swimming Pool, Fine Dining, Sun Deck')
    if isinstance(facilities_val, list):
        facilities_val = ', '.join(str(f).strip() for f in facilities_val if str(f).strip())

    ship = Cross(
        owner_id=current_user.id,
        name=name,
        slug=slug_candidate,
        category=data.get('category', 'Luxury Ocean Cruise'),
        description=data.get('description', ''),
        location=data.get('location', 'Mumbai'),
        address=data.get('address', 'International Cruise Terminal'),
        price=price,
        capacity=capacity,
        supports_private_charter=bool(data.get('supports_private_charter', True)),
        supports_public_tours=bool(data.get('supports_public_tours', True)),
        supports_weddings=bool(data.get('supports_weddings', True)),
        supports_birthdays=bool(data.get('supports_birthdays', True)),
        supports_corporate=bool(data.get('supports_corporate', True)),
        supports_conferences=bool(data.get('supports_conferences', False)),
        supports_parties=bool(data.get('supports_parties', True)),
        supports_dinners=bool(data.get('supports_dinners', True)),
        destination=data.get('destination', 'Goa & Arabian Sea'),
        route=data.get('route', 'Mumbai - Goa - Mumbai'),
        departure_port=data.get('departure_port', 'Mumbai Cruise Terminal'),
        duration_days=int(data.get('duration_days', 3)),
        ship_length_meters=int(data.get('ship_length_meters', 200)),
        beam_meters=int(data.get('beam_meters', 28)),
        decks_count=int(data.get('decks_count', 8)),
        cabin_count=int(data.get('cabin_count', 80)),
        image_url=data.get('image_url', ''),
        image=data.get('image', None),
        facilities=facilities_val,
        registration_number=data.get('registration_number', 'IND-GA-2024-REG'),
        vessel_type=data.get('vessel_type', data.get('category', 'Motor Yacht')),
        certifications=data.get('certifications', 'IRS Seaworthiness Class A1, Annual Marine Safety Inspection Passed'),
        maintenance_schedule=data.get('maintenance_schedule', 'Bi-weekly routine check; Next drydock inspection: Scheduled'),
        supported_activities=data.get('supported_activities', 'Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter'),
        capacity_note=data.get('capacity_note', 'Vessel Max Passenger Capacity (Activity/Equipment capacity configured separately)'),
        availability_status=data.get('availability_status', 'AVAILABLE'),
        is_active=data.get('availability_status') != 'INACTIVE',
        is_approved=data.get('availability_status') != 'PENDING_APPROVAL',
    )
    db.add(ship)
    db.commit()
    db.refresh(ship)

    return {
        'success': True,
        'message': f'Ship {ship.name} registered successfully!',
        'ship': serialize_cruise(ship)
    }


@router.get("/ships/{ship_id}/")
@router.get("/ships/{ship_id}")
def get_operator_ship_detail(
    ship_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found.")
    if ship.owner_id != current_user.id and not current_user.is_superuser and current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="Forbidden. You do not own this vessel.")
    return {'ship': serialize_cruise(ship)}


@router.put("/ships/{ship_id}/")
@router.put("/ships/{ship_id}")
async def update_operator_ship(
    ship_id: int,
    request: Request,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found.")
    if ship.owner_id != current_user.id and not current_user.is_superuser and current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="Forbidden. You do not own this vessel.")

    try:
        data = await request.json()
    except Exception:
        data = {}

    for field in [
        'name', 'category', 'vessel_type', 'registration_number',
        'certifications', 'maintenance_schedule', 'supported_activities',
        'capacity_note', 'availability_status', 'description', 'location',
        'address', 'destination', 'route', 'departure_port', 'facilities'
    ]:
        if field in data and hasattr(ship, field):
            setattr(ship, field, data[field])

    if 'availability_status' in data:
        status_val = data['availability_status']
        ship.availability_status = status_val
        if status_val == 'INACTIVE':
            ship.is_active = False
        elif status_val == 'PENDING_APPROVAL':
            ship.is_approved = False
        else:
            ship.is_active = True
            ship.is_approved = True

    if 'image_url' in data:
        ship.image_url = data['image_url']
    if 'image' in data:
        ship.image = data['image']
    if 'price' in data:
        ship.price = Decimal(str(data['price']))
    if 'capacity' in data:
        ship.capacity = int(data['capacity'])
    if 'is_active' in data:
        ship.is_active = bool(data['is_active'])

    for bool_field in ['supports_private_charter', 'supports_public_tours', 'supports_weddings', 'supports_birthdays', 'supports_corporate', 'supports_conferences', 'supports_parties', 'supports_dinners']:
        if bool_field in data:
            setattr(ship, bool_field, bool(data[bool_field]))

    db.commit()
    db.refresh(ship)
    return {'success': True, 'message': 'Ship updated successfully.', 'ship': serialize_cruise(ship)}


@router.post("/upload-image/")
@router.post("/upload-image")
async def upload_ship_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_operator),
):
    media_dir = Path("media") / "crosses"
    media_dir.mkdir(parents=True, exist_ok=True)
    
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
        
    unique_filename = f"ship_{uuid.uuid4().hex[:10]}{ext}"
    target_path = media_dir / unique_filename
    
    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_url = f"/media/crosses/{unique_filename}"
    return {
        "success": True,
        "url": file_url,
        "filename": unique_filename
    }


@router.delete("/ships/{ship_id}/")
@router.delete("/ships/{ship_id}")
def delete_operator_ship(
    ship_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found.")
    if ship.owner_id != current_user.id and not current_user.is_superuser and current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="Forbidden. You do not own this vessel.")

    db.delete(ship)
    db.commit()
    return {'success': True, 'message': 'Ship deleted successfully.'}


@router.get("/ships/{ship_id}/availability/")
@router.get("/ships/{ship_id}/availability")
def get_operator_ship_availability(
    ship_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    if is_admin_mode or current_user.is_superuser:
        ship = db.query(Cross).filter(Cross.id == ship_id).first()
    else:
        ship = db.query(Cross).filter(Cross.id == ship_id, Cross.owner_id == current_user.id).first()

    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found.")

    start_date = date.today()
    end_date = start_date + timedelta(days=30)

    bookings = db.query(Booking).filter(
        Booking.cross_id == ship.id,
        Booking.booking_date >= start_date,
        Booking.booking_date <= end_date,
        Booking.status.in_(['CONFIRMED', 'PENDING'])
    ).all()

    bookings_by_date = {}
    for b in bookings:
        if b.booking_date:
            d_key = b.booking_date.strftime('%Y-%m-%d')
            if d_key not in bookings_by_date:
                bookings_by_date[d_key] = []
            bookings_by_date[d_key].append(b)

    tours = db.query(PublicTour).filter(
        PublicTour.ship_id == ship.id,
        PublicTour.departure_date <= end_date,
        PublicTour.return_date >= start_date,
        PublicTour.is_published == True
    ).all()

    days = []
    for i in range(30):
        current_day = start_date + timedelta(days=i)
        day_str = current_day.strftime('%Y-%m-%d')
        formatted_date = current_day.strftime('%d %b %Y')  # e.g. "22 Oct 2026"
        day_number = current_day.strftime('%d')
        month_name = current_day.strftime('%b')
        year_str = current_day.strftime('%Y')
        full_date_label = current_day.strftime('%A, %d %B %Y')

        # 1. Public Tour check: Whole day booked for public passenger sailing
        tour_on_day = None
        for t in tours:
            if t.departure_date <= current_day <= t.return_date:
                tour_on_day = t
                break

        if tour_on_day:
            days.append({
                'date': day_str,
                'day_name': current_day.strftime('%a'),
                'day_number': day_number,
                'month_name': month_name,
                'year': year_str,
                'formatted_date': formatted_date,
                'full_date_label': full_date_label,
                'status': 'Whole Day Booked',
                'status_type': 'PUBLIC_TOUR',
                'is_whole_day': True,
                'is_available': False,
                'booked_time': 'Whole Day (00:00 - 23:59)',
                'break_time': None,
                'ready_time': f"Available after tour completion on {tour_on_day.return_date.strftime('%d %b %Y')}",
                'details': {
                    'tour_title': tour_on_day.tour_title,
                    'is_whole_day': True,
                    'time_display': 'All Day Sailing (00:00 - 23:59)',
                    'departure_port': tour_on_day.departure_port or ship.departure_port or 'Port Gateway',
                    'destination': tour_on_day.destination or ship.destination or 'Coastal Route',
                    'status_note': 'Full Day Public Cruise Tour • Entire Vessel Reserved'
                }
            })
            continue

        # 2. Private Booking check: Exact booked time + mandatory 4-hour turnaround maintenance break + ready time
        day_charters = bookings_by_date.get(day_str, [])
        if day_charters:
            day_charters.sort(key=lambda x: x.start_time or time(10, 0))
            primary_booking = day_charters[0]

            b_start = primary_booking.start_time or time(10, 0)
            b_end = primary_booking.end_time or time(14, 0)

            b_start_str = b_start.strftime('%I:%M %p')
            b_end_str = b_end.strftime('%I:%M %p')
            booked_time_slot = f"{b_start_str} - {b_end_str}"

            # Calculate mandatory 4-hour turnaround & maintenance break
            break_start_dt = datetime.combine(current_day, b_end)
            break_end_dt = break_start_dt + timedelta(hours=4)
            break_start_str = b_end_str
            break_end_str = break_end_dt.strftime('%I:%M %p')
            break_time_slot = f"{break_start_str} - {break_end_str}"

            ready_str = f"Ready: {break_end_str} onward"
            ready_full = f"Ready for Next Booking from {break_end_str} onward"

            u_name = (primary_booking.user.full_name or primary_booking.user.username) if primary_booking.user else 'Guest'

            days.append({
                'date': day_str,
                'day_name': current_day.strftime('%a'),
                'day_number': day_number,
                'month_name': month_name,
                'year': year_str,
                'formatted_date': formatted_date,
                'full_date_label': full_date_label,
                'status': 'Private Booking',
                'status_type': 'PRIVATE_BOOKING',
                'is_whole_day': False,
                'is_available': False,
                'booked_time': booked_time_slot,
                'break_time': break_time_slot,
                'break_hours': 4,
                'ready_time': ready_str,
                'details': {
                    'booking_id': primary_booking.booking_id,
                    'customer': u_name,
                    'event_type': primary_booking.event_type or 'Private Charter',
                    'start_time': b_start_str,
                    'end_time': b_end_str,
                    'booked_time': booked_time_slot,
                    'break_start': break_start_str,
                    'break_end': break_end_str,
                    'break_time': break_time_slot,
                    'break_hours': 4,
                    'ready_time': ready_full,
                    'status_note': f"Booked: {booked_time_slot} • 4h Break ({break_time_slot}) • {ready_full}",
                    'all_bookings_count': len(day_charters)
                }
            })
            continue

        # 3. Available: Ready for booking all day
        days.append({
            'date': day_str,
            'day_name': current_day.strftime('%a'),
            'day_number': day_number,
            'month_name': month_name,
            'year': year_str,
            'formatted_date': formatted_date,
            'full_date_label': full_date_label,
            'status': 'Available',
            'status_type': 'AVAILABLE',
            'is_whole_day': False,
            'is_available': True,
            'booked_time': None,
            'break_time': None,
            'ready_time': 'Ready for Booking (All Day Open)',
            'details': {
                'is_available': True,
                'ready_time': '100% Available for Charter & Tour Bookings',
                'time_display': 'All Day Open (00:00 - 23:59)',
                'status_note': 'No bookings or tours scheduled • Entire vessel open for reservation'
            }
        })

    return {'ship_id': ship.id, 'ship_name': ship.name, 'timeline': days}


@router.get("/extras/")
@router.get("/extras")
def list_operator_extras(
    ship_id: Optional[int] = None,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    query = db.query(ShipExtra)
    if not is_admin_mode:
        query = query.join(Cross).filter(Cross.owner_id == current_user.id)
    if ship_id:
        query = query.filter(ShipExtra.ship_id == ship_id)

    extras = query.all()
    return {'extras': [serialize_extra(e) for e in extras]}


@router.post("/extras/")
@router.post("/extras")
async def create_operator_extra(
    request: Request,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    ship_id = data.get('ship_id')
    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship or (ship.owner_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Ship not found or not owned by you.")

    extra = ShipExtra(
        ship_id=ship.id,
        name=data.get('name', 'Premium Extra').strip(),
        description=data.get('description', ''),
        price=Decimal(str(data.get('price', 5000))),
        pricing_mode=data.get('pricing_mode', 'FLAT'),
        is_available=bool(data.get('is_available', True))
    )
    db.add(extra)
    db.commit()
    db.refresh(extra)
    return {'success': True, 'extra': serialize_extra(extra)}


@router.put("/extras/")
@router.put("/extras")
async def update_operator_extra(
    request: Request,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    extra_id = data.get('id')
    extra = db.query(ShipExtra).filter(ShipExtra.id == extra_id).first()
    if not extra:
        raise HTTPException(status_code=404, detail="Extra not found.")
    if extra.ship.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Forbidden.")

    if 'price' in data:
        extra.price = Decimal(str(data['price']))
    if 'name' in data:
        extra.name = data['name'].strip()
    if 'description' in data:
        extra.description = data['description'].strip()
    if 'pricing_mode' in data:
        extra.pricing_mode = data['pricing_mode']
    if 'is_available' in data:
        extra.is_available = bool(data['is_available'])

    db.commit()
    db.refresh(extra)
    return {'success': True, 'extra': serialize_extra(extra)}


@router.delete("/extras/")
@router.delete("/extras")
def delete_operator_extra(
    id: int = Query(...),
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    extra = db.query(ShipExtra).filter(ShipExtra.id == id).first()
    if not extra:
        raise HTTPException(status_code=404, detail="Extra not found.")
    if extra.ship.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Forbidden.")

    db.delete(extra)
    db.commit()
    return {'success': True, 'message': 'Extra deleted.'}


@router.get("/tours/")
@router.get("/tours")
def list_operator_tours(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    if is_admin_mode:
        tours = db.query(PublicTour).order_by(desc(PublicTour.created_at), desc(PublicTour.id)).all()
    else:
        vessel_ids = [v.id for v in db.query(Cross).filter(Cross.owner_id == current_user.id).all()]
        tours = db.query(PublicTour).filter(PublicTour.ship_id.in_(vessel_ids)).order_by(desc(PublicTour.created_at), desc(PublicTour.id)).all()
    return {'tours': [serialize_tour(t) for t in tours]}


@router.post("/tours/")
@router.post("/tours")
async def create_operator_tour(
    request: Request,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    ship_id = data.get('ship_id')
    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship or (ship.owner_id != current_user.id and not current_user.is_superuser and current_user.role != 'ADMIN'):
        raise HTTPException(status_code=404, detail="Ship not found or not owned by you.")

    dep_date = datetime.strptime(data.get('departure_date'), '%Y-%m-%d').date()
    ret_date = datetime.strptime(data.get('return_date'), '%Y-%m-%d').date()
    if ret_date < dep_date:
        raise HTTPException(status_code=400, detail="Return date cannot be earlier than departure date.")

    dep_time = datetime.strptime(data.get('departure_time', '16:00'), '%H:%M').time()
    ret_time = datetime.strptime(data.get('return_time', '10:00'), '%H:%M').time()

    diff_days = (ret_date - dep_date).days
    final_days = max(1, diff_days)
    calc_display = f"{final_days} Days" if final_days > 1 else "1 Day"

    import uuid
    from backend.app.core.security import slugify
    slug_candidate = slugify(data.get('tour_title', 'Cruise Tour'))
    if db.query(PublicTour).filter(PublicTour.slug == slug_candidate).first():
        slug_candidate = f"{slug_candidate}-{uuid.uuid4().hex[:6]}"

    tour = PublicTour(
        ship_id=ship.id,
        tour_title=data.get('tour_title', '').strip(),
        slug=slug_candidate,
        departure_port=data.get('departure_port', ship.departure_port or 'Mumbai'),
        destination=data.get('destination', ship.destination or 'Goa'),
        departure_date=dep_date,
        departure_time=dep_time,
        return_date=ret_date,
        return_time=ret_time,
        duration_days=final_days,
        duration_display=calc_display,
        total_capacity=int(data.get('total_capacity', ship.capacity)),
        adult_price=max(Decimal(str(data.get('adult_price', 12999))), Decimal('2000.00')),
        child_price=max(Decimal(str(data.get('child_price', 6999))), Decimal('2000.00')),
        itinerary=data.get('itinerary', ''),
        ports_of_call=data.get('ports_of_call', ''),
        meals_included=data.get('meals_included', 'All Gourmet Meals Included'),
        is_published=True,
    )
    db.add(tour)
    db.commit()
    db.refresh(tour)
    return {'success': True, 'message': 'Public cruise tour published!', 'tour': serialize_tour(tour)}


@router.get("/tours/{tour_id}/passengers/")
@router.get("/tours/{tour_id}/passengers")
def get_operator_tour_passengers(
    tour_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    if is_admin_mode or current_user.is_superuser:
        tour = db.query(PublicTour).filter(PublicTour.id == tour_id).first()
    else:
        tour = db.query(PublicTour).join(Cross).filter(PublicTour.id == tour_id, Cross.owner_id == current_user.id).first()

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found.")

    bookings = db.query(Booking).filter(Booking.public_tour_id == tour.id).order_by(desc(Booking.created_at), desc(Booking.id)).all()
    passengers = []
    for b in bookings:
        u_name = b.user.full_name or b.user.username if b.user else 'Guest'
        passengers.append({
            'booking_id': b.booking_id,
            'passenger_name': u_name,
            'email': b.user.email if b.user else '',
            'phone': b.user.phone or '' if b.user else '',
            'adults_count': b.adults_count,
            'children_count': b.children_count,
            'passengers_count': b.number_of_people,
            'cabin_type': b.cabin_type or 'Standard',
            'status': b.status,
            'tracking_status': b.tracking_status or b.status,
            'total_price': float(b.total_price),
            'booking_date': b.booking_date.strftime('%Y-%m-%d') if b.booking_date else ''
        })

    return {
        'tour_id': tour.id,
        'tour_title': tour.tour_title,
        'ship_name': tour.ship.name if tour.ship else '',
        'departure_date': tour.departure_date.strftime('%Y-%m-%d'),
        'total_capacity': tour.total_capacity,
        'booked_capacity': tour.booked_capacity,
        'remaining_capacity': tour.remaining_capacity,
        'passengers': passengers
    }


@router.get("/revenue/")
@router.get("/revenue")
def get_operator_revenue(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    if is_admin_mode:
        bookings = db.query(Booking).filter(Booking.status.in_(['CONFIRMED', 'COMPLETED'])).all()
        ships_qs = db.query(Cross).all()
    else:
        vessel_ids = [v.id for v in db.query(Cross).filter(Cross.owner_id == current_user.id).all()]
        bookings = db.query(Booking).filter(Booking.cross_id.in_(vessel_ids), Booking.status.in_(['CONFIRMED', 'COMPLETED'])).all()
        ships_qs = db.query(Cross).filter(Cross.owner_id == current_user.id).all()

    total_rev = sum((b.total_price or Decimal('0.00')) for b in bookings)
    private_rev = sum((b.total_price or Decimal('0.00')) for b in bookings if b.booking_type == 'EVENT')
    tour_rev = sum((b.total_price or Decimal('0.00')) for b in bookings if b.booking_type == 'TOUR')

    total_rev_dec = Decimal(str(total_rev))
    owner_payout_dec = round(total_rev_dec * Decimal('0.85'), 2)
    platform_comm_dec = round(total_rev_dec * Decimal('0.15'), 2)

    by_ship = []
    for ship in ships_qs:
        s_b = [b for b in bookings if b.cross_id == ship.id]
        s_rev = sum((b.total_price or Decimal('0.00')) for b in s_b)
        s_rev_dec = Decimal(str(s_rev))
        by_ship.append({
            'ship_id': ship.id,
            'ship_name': ship.name,
            'gross_revenue': float(s_rev_dec),
            'revenue': float(s_rev_dec),
            'owner_payout': float(round(s_rev_dec * Decimal('0.85'), 2)),
            'platform_commission': float(round(s_rev_dec * Decimal('0.15'), 2)),
            'bookings_count': len(s_b)
        })

    return {
        'total_revenue': float(total_rev_dec),
        'gross_revenue': float(total_rev_dec),
        'owner_payout': float(owner_payout_dec),
        'platform_commission': float(platform_comm_dec),
        'payout_percentage': 85,
        'commission_percentage': 15,
        'private_revenue': float(private_rev),
        'tour_revenue': float(tour_rev),
        'by_ship': by_ship
    }


class BookingScheduleUpdate(BaseModel):
    booking_date: str
    start_time: str
    end_time: Optional[str] = None
    reason: Optional[str] = "Operator schedule adjustment"
    notify_customer: bool = True


class WeatherRescheduleRequest(BaseModel):
    new_date: str
    new_time_slot: str
    weather_condition: str = "Adverse Weather & High Swell Alert"
    customer_note: Optional[str] = None
    notify_customer: bool = True


class VerifyParticipantsRequest(BaseModel):
    number_of_people: int
    adults_count: Optional[int] = None
    children_count: Optional[int] = None
    notes: Optional[str] = None
    recalculate_price: bool = False


class ProcessRefundRequest(BaseModel):
    refund_amount: float
    refund_reason: str
    cancel_booking: bool = True
    customer_notes: Optional[str] = None


class SendCustomerMessageRequest(BaseModel):
    message: str
    template_type: str = "CUSTOM"
    channel: str = "ALL"


def check_operator_booking_access(booking: Booking, user: User, db: Session) -> bool:
    if user.is_superuser or user.role == 'ADMIN':
        return True
    if booking.cross and booking.cross.owner_id == user.id:
        return True
    if booking.booking_type == "ACTIVITY" and booking.event_type and booking.event_type.startswith("ACT_"):
        try:
            aid = int(booking.event_type.split("_")[1])
            act = db.query(Activity).filter(Activity.id == aid).first()
            if act and (act.owner_id == user.id or (act.host_ship and act.host_ship.owner_id == user.id)):
                return True
        except Exception:
            pass
    return False


@router.post("/bookings/{booking_id}/update-schedule")
def operator_update_schedule(
    booking_id: str,
    req: BookingScheduleUpdate,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if not check_operator_booking_access(booking, current_user, db):
        raise HTTPException(status_code=403, detail="Unauthorized to manage this booking.")

    try:
        new_b_date = datetime.strptime(req.booking_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    try:
        new_start = datetime.strptime(req.start_time.strip().upper(), "%I:%M %p").time()
    except Exception:
        try:
            new_start = datetime.strptime(req.start_time.strip(), "%H:%M").time()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid start time format. Use '09:00 AM' or '09:00'.")

    if req.end_time:
        try:
            new_end = datetime.strptime(req.end_time.strip().upper(), "%I:%M %p").time()
        except Exception:
            try:
                new_end = datetime.strptime(req.end_time.strip(), "%H:%M").time()
            except Exception:
                new_end = (datetime.combine(new_b_date, new_start) + timedelta(hours=1)).time()
    else:
        dur = float(booking.duration_hours or 1.0)
        new_end = (datetime.combine(new_b_date, new_start) + timedelta(hours=dur)).time()

    # Double-booking check against other bookings
    conflict = db.query(Booking).filter(
        Booking.id != booking.id,
        Booking.cross_id == booking.cross_id,
        Booking.booking_date == new_b_date,
        Booking.status.in_(["CONFIRMED", "PENDING", "IN_PROGRESS"]),
        or_(
            and_(Booking.start_time <= new_start, Booking.end_time > new_start),
            and_(Booking.start_time < new_end, Booking.end_time >= new_end),
            and_(Booking.start_time >= new_start, Booking.end_time <= new_end),
        )
    ).first()
    if conflict and booking.booking_type != "ACTIVITY":
        raise HTTPException(
            status_code=409,
            detail=f"Schedule conflict: Vessel is already booked on {new_b_date} from {conflict.start_time.strftime('%I:%M %p')} to {conflict.end_time.strftime('%I:%M %p')}."
        )

    booking.booking_date = new_b_date
    booking.start_time = new_start
    booking.end_time = new_end

    note_entry = f"\n[Schedule Updated by Owner on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]: Moved to {new_b_date} ({new_start.strftime('%I:%M %p')} - {new_end.strftime('%I:%M %p')}). Note: {req.reason or 'Adjusted by operator'}"
    booking.special_request = (booking.special_request or "") + note_entry

    if req.notify_customer and booking.user_id:
        notif = PlatformNotification(
            title=f"Schedule Updated: Booking #{booking.booking_id}",
            message=f"Your trip has been rescheduled to {new_b_date.strftime('%A, %b %d, %Y')} at {new_start.strftime('%I:%M %p')}. Note: {req.reason or 'Adjusted by vessel operator'}.",
            notification_type="BOOKING_UPDATE",
            target_audience="SINGLE_USER",
            target_user_id=booking.user_id,
            action_link=f"/bookings/{booking.booking_id}",
            sender_name=current_user.full_name or "Fleet Operator",
            is_read=False,
        )
        db.add(notif)

        wa_log = WhatsAppMessageLog(
            booking_id=booking.id,
            recipient=booking.customer_whatsapp or (booking.user.phone if booking.user else ""),
            customer_name=booking.user.full_name if booking.user else "Valued Passenger",
            message_type="SCHEDULE_UPDATE",
            message_body=f"Hello! Your Cross-Hunt booking #{booking.booking_id} has been rescheduled to {new_b_date.strftime('%d-%b-%Y')} at {new_start.strftime('%I:%M %p')}. Ticket code: {booking.ticket_code}.",
            status="SENT"
        )
        db.add(wa_log)

    db.commit()
    db.refresh(booking)
    return {
        "success": True,
        "message": f"Schedule updated successfully to {new_b_date} at {new_start.strftime('%I:%M %p')}.",
        "booking": serialize_booking(booking)
    }


@router.post("/bookings/{booking_id}/weather-reschedule")
def operator_weather_reschedule(
    booking_id: str,
    req: WeatherRescheduleRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if not check_operator_booking_access(booking, current_user, db):
        raise HTTPException(status_code=403, detail="Unauthorized to manage this booking.")

    try:
        new_b_date = datetime.strptime(req.new_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    try:
        new_start = datetime.strptime(req.new_time_slot.strip().upper(), "%I:%M %p").time()
        new_end = (datetime.combine(new_b_date, new_start) + timedelta(minutes=int(float(booking.duration_hours or 1) * 60))).time()
    except Exception:
        try:
            new_start = datetime.strptime(req.new_time_slot.strip(), "%H:%M").time()
            new_end = (datetime.combine(new_b_date, new_start) + timedelta(minutes=int(float(booking.duration_hours or 1) * 60))).time()
        except Exception:
            new_start = time(10, 0)
            new_end = time(11, 30)

    booking.booking_date = new_b_date
    booking.start_time = new_start
    booking.end_time = new_end
    # Ensure status is CONFIRMED for rescheduled safe date
    booking.status = "CONFIRMED"
    booking.tracking_status = "CONFIRMED"
    booking.ticket_status = "VALID"

    advisory_text = req.customer_note or "Rescheduled to prioritize passenger safety during turbulent sea weather."
    note_entry = f"\n[WEATHER RESCHEDULE - {req.weather_condition}]: Rescheduled to {new_b_date} ({req.new_time_slot}). Advisory: {advisory_text}"
    booking.special_request = (booking.special_request or "") + note_entry

    if req.notify_customer and booking.user_id:
        notif = PlatformNotification(
            title=f"⚠️ Marine Weather Advisory: Rescheduled #{booking.booking_id}",
            message=f"Due to '{req.weather_condition}', your booking has been safely rescheduled to {new_b_date.strftime('%A, %b %d, %Y')} at {req.new_time_slot}. Your boarding pass ticket #{booking.ticket_code} remains valid.",
            notification_type="WEATHER_ADVISORY",
            target_audience="SINGLE_USER",
            target_user_id=booking.user_id,
            action_link=f"/bookings/{booking.booking_id}",
            sender_name=current_user.full_name or "Marine Harbor Master",
            is_read=False,
        )
        db.add(notif)

        wa_log = WhatsAppMessageLog(
            booking_id=booking.id,
            recipient=booking.customer_whatsapp or (booking.user.phone if booking.user else ""),
            customer_name=booking.user.full_name if booking.user else "Valued Guest",
            message_type="WEATHER_RESCHEDULE",
            message_body=f"Marine Weather Notice: Due to '{req.weather_condition}', your session is rescheduled to {new_b_date.strftime('%d-%b-%Y')} at {req.new_time_slot}. Your ticket #{booking.ticket_code} is confirmed for this new slot.",
            status="SENT"
        )
        db.add(wa_log)

    db.commit()
    db.refresh(booking)
    return {
        "success": True,
        "message": f"Weather-related rescheduling applied. Slot moved to {new_b_date} ({req.new_time_slot}). Customer notified.",
        "booking": serialize_booking(booking)
    }


@router.post("/bookings/{booking_id}/update-participants")
def operator_update_participants(
    booking_id: str,
    req: VerifyParticipantsRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if not check_operator_booking_access(booking, current_user, db):
        raise HTTPException(status_code=403, detail="Unauthorized to manage this booking.")

    if req.number_of_people < 1:
        raise HTTPException(status_code=400, detail="Participant count must be at least 1.")

    # Capacity check
    if booking.cross and req.number_of_people > booking.cross.capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Participant count ({req.number_of_people}) exceeds maximum vessel passenger capacity ({booking.cross.capacity})."
        )

    old_count = booking.number_of_people
    booking.number_of_people = req.number_of_people
    if req.adults_count is not None:
        booking.adults_count = req.adults_count
    else:
        booking.adults_count = req.number_of_people
    if req.children_count is not None:
        booking.children_count = req.children_count

    if req.recalculate_price and booking.booking_type == "ACTIVITY" and old_count > 0:
        unit_price = float(booking.base_price) or (float(booking.subtotal) / old_count)
        new_subtotal = Decimal(str(round(unit_price * req.number_of_people, 2)))
        booking.subtotal = new_subtotal
        new_tax = (new_subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        booking.tax_amount = new_tax
        booking.total_price = new_subtotal + new_tax + booking.extras_amount - booking.discount_amount

    note = f"\n[Participant Verification on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]: Verified count: {req.number_of_people} guests (was {old_count}). {req.notes or ''}"
    booking.special_request = (booking.special_request or "") + note

    db.commit()
    db.refresh(booking)
    return {
        "success": True,
        "message": f"Participant count verified and updated to {req.number_of_people} passengers.",
        "booking": serialize_booking(booking)
    }


@router.post("/bookings/{booking_id}/process-refund")
def operator_process_refund(
    booking_id: str,
    req: ProcessRefundRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if not check_operator_booking_access(booking, current_user, db):
        raise HTTPException(status_code=403, detail="Unauthorized to manage this booking.")

    total_val = float(booking.total_price or 0)
    current_refunded = float(booking.refund_amount or 0)
    max_refundable = max(0.0, total_val - current_refunded)

    if req.refund_amount <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be greater than 0.")
    if req.refund_amount > (max_refundable + 0.01):
        raise HTTPException(status_code=400, detail=f"Refund amount exceeds refundable balance (Max available: ₹{max_refundable:,.2f}).")

    new_refund_amount = Decimal(str(round(current_refunded + req.refund_amount, 2)))
    booking.refund_amount = new_refund_amount
    booking.refund_reason = req.refund_reason
    booking.refund_date = datetime.utcnow()

    if req.cancel_booking or float(new_refund_amount) >= (total_val - 0.01):
        booking.status = "CANCELLED"
        booking.tracking_status = "CANCELLED"
        booking.ticket_status = "CANCELLED"
        booking.cancellation_reason = f"Refunded ₹{req.refund_amount:,.2f}: {req.refund_reason}"

    if booking.user_id:
        notif = PlatformNotification(
            title=f"Refund Processed: ₹{req.refund_amount:,.2f}",
            message=f"A refund of ₹{req.refund_amount:,.2f} has been processed for booking #{booking.booking_id}. Reason: {req.refund_reason}.",
            notification_type="REFUND_PROCESSED",
            target_audience="SINGLE_USER",
            target_user_id=booking.user_id,
            action_link=f"/bookings/{booking.booking_id}",
            sender_name=current_user.full_name or "Finance & Accounts",
            is_read=False,
        )
        db.add(notif)

    db.commit()
    db.refresh(booking)
    return {
        "success": True,
        "message": f"Refund of ₹{req.refund_amount:,.2f} successfully processed for booking #{booking.booking_id}.",
        "booking": serialize_booking(booking)
    }


@router.post("/bookings/{booking_id}/send-message")
def operator_send_customer_message(
    booking_id: str,
    req: SendCustomerMessageRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if not check_operator_booking_access(booking, current_user, db):
        raise HTTPException(status_code=403, detail="Unauthorized to manage this booking.")

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    target_phone = booking.customer_whatsapp or (booking.user.phone if booking.user else "")
    customer_name = booking.user.full_name if booking.user else "Valued Passenger"

    # 1. Log WhatsApp entry
    wa_log = WhatsAppMessageLog(
        booking_id=booking.id,
        recipient=target_phone or "Customer",
        customer_name=customer_name,
        message_type=req.template_type,
        message_body=req.message.strip(),
        status="SENT"
    )
    db.add(wa_log)

    # 2. Dispatch Platform In-App Notification
    if booking.user_id:
        notif = PlatformNotification(
            title=f"Message from Operator (#{booking.booking_id})",
            message=req.message.strip(),
            notification_type="OPERATOR_MESSAGE",
            target_audience="SINGLE_USER",
            target_user_id=booking.user_id,
            action_link=f"/bookings/{booking.booking_id}",
            sender_name=current_user.full_name or "Fleet Operator",
            is_read=False,
        )
        db.add(notif)

    db.commit()

    # Clean phone for WhatsApp web direct URL
    clean_phone = re.sub(r"[^0-9]", "", target_phone)
    if clean_phone and len(clean_phone) == 10:
        clean_phone = f"91{clean_phone}"
    whatsapp_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(req.message.strip())}" if clean_phone else ""

    return {
        "success": True,
        "message": f"Message dispatched to customer {customer_name}.",
        "whatsapp_url": whatsapp_url
    }


@router.post("/bookings/{booking_id}/{action}/")
@router.post("/bookings/{booking_id}/{action}")
def operator_booking_action(
    booking_id: str,
    action: str,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if not check_operator_booking_access(booking, current_user, db):
        raise HTTPException(status_code=403, detail="You can only manage bookings for your own vessels and activities.")

    action_lower = action.lower()
    if action_lower in ['confirm', 'approve']:
        booking.status = 'CONFIRMED'
        booking.tracking_status = 'CONFIRMED'
        booking.ticket_status = 'VALID'
    elif action_lower in ['in_progress', 'start']:
        booking.status = 'IN_PROGRESS'
        booking.tracking_status = 'IN_PROGRESS'
    elif action_lower == 'complete':
        booking.status = 'COMPLETED'
        booking.tracking_status = 'COMPLETED'
        booking.ticket_status = 'USED'
    elif action_lower == 'reject':
        booking.status = 'REJECTED'
        booking.tracking_status = 'REJECTED'
        booking.ticket_status = 'CANCELLED'
    elif action_lower == 'cancel':
        booking.status = 'CANCELLED'
        booking.tracking_status = 'CANCELLED'
        booking.ticket_status = 'CANCELLED'
    elif action_lower == 'board':
        booking.tracking_status = 'BOARDING'
    elif action_lower == 'depart':
        booking.tracking_status = 'DEPARTED'
    elif action_lower == 'arrive':
        booking.tracking_status = 'ARRIVED'
    else:
        raise HTTPException(status_code=400, detail="Invalid action.")

    db.commit()
    db.refresh(booking)
    return {
        'success': True,
        'message': f'Booking #{booking_id} status updated to {booking.status}.',
        'booking': serialize_booking(booking)
    }


@router.get("/reviews/")
@router.get("/reviews")
def get_operator_reviews(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    review_opts = (
        joinedload(CrossReview.cross),
        joinedload(CrossReview.user),
        joinedload(CrossReview.booking),
    )

    if is_admin_mode:
        reviews = (
            db.query(CrossReview)
            .options(*review_opts)
            .order_by(desc(CrossReview.created_at), desc(CrossReview.id))
            .all()
        )
    else:
        owned_ship_ids = [s.id for s in db.query(Cross.id).filter(Cross.owner_id == current_user.id).all()]
        if not owned_ship_ids:
            return {
                "success": True,
                "reviews": [],
                "complaints": [],
                "admin_warnings": [],
                "total_count": 0,
                "complaints_count": 0,
                "admin_warnings_count": 0,
                "avg_rating": 5.0,
            }
        reviews = (
            db.query(CrossReview)
            .filter(CrossReview.cross_id.in_(owned_ship_ids))
            .options(*review_opts)
            .order_by(desc(CrossReview.created_at), desc(CrossReview.id))
            .all()
        )

    serialized = []
    for r in reviews:
        item = r.to_dict()
        if r.cross:
            item["ship_image"] = r.cross.display_image_url
            item["ship_category"] = r.cross.effective_category or "Cruiser"
            item["ship_location"] = r.cross.location or "Mumbai"
        else:
            item["ship_image"] = ""
            item["ship_category"] = "Cruiser"
            item["ship_location"] = "Mumbai"

        if r.booking:
            item["booking_id"] = r.booking.booking_id
            item["booking_type"] = r.booking.booking_type
            item["travel_date"] = r.booking.booking_date.strftime("%Y-%m-%d") if r.booking.booking_date else ""
        serialized.append(item)

    complaints = [
        r for r in serialized
        if r.get("has_complaint") or r.get("warning_message") or r.get("complaint_status") in ["WARNING_SENT", "RESOLVED", "PENDING"]
    ]
    admin_warnings = [
        r for r in serialized
        if r.get("complaint_status") == "WARNING_SENT" or (bool(r.get("warning_message")) and r.get("complaint_status") != "RESOLVED")
    ]

    avg_rating = round(sum(r["rating"] for r in serialized) / len(serialized), 1) if serialized else 5.0

    return {
        "success": True,
        "reviews": serialized,
        "complaints": complaints,
        "admin_warnings": admin_warnings,
        "total_count": len(serialized),
        "complaints_count": len(complaints),
        "admin_warnings_count": len(admin_warnings),
        "avg_rating": avg_rating,
    }


@router.post("/reviews/{review_id}/resolve/")
@router.post("/reviews/{review_id}/resolve")
def resolve_operator_complaint(
    review_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review or complaint not found.")

    if not (current_user.role in ['ADMIN'] or current_user.is_superuser):
        if not r.cross or r.cross.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to resolve complaints for this vessel.")

    r.complaint_status = "RESOLVED"
    db.commit()
    return {"success": True, "message": "Complaint marked as resolved & addressed."}


@router.post("/reviews/{review_id}/respond-customer/")
@router.post("/reviews/{review_id}/respond-customer")
async def respond_to_passenger_complaint(
    review_id: int,
    request: Request,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    response_text = (data.get("message") or data.get("owner_response") or "").strip()
    if not response_text:
        raise HTTPException(status_code=400, detail="Response message to customer cannot be empty.")

    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review or complaint not found.")

    if not (current_user.role in ['ADMIN'] or current_user.is_superuser):
        if not r.cross or r.cross.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to respond to complaints for this vessel.")

    r.owner_response = response_text
    r.owner_response_at = datetime.utcnow()
    r.complaint_status = "RESOLVED"

    # Send Notification to Customer with link to feedback tab
    ship_name = r.cross.name if r.cross else "Vessel"
    if r.user_id:
        notif = PlatformNotification(
            title=f"Official Owner Response: {ship_name}",
            message=f"The ship operator has sent an official response & resolution to your feedback: \"{response_text[:140]}\"",
            notification_type="SYSTEM",
            target_audience="CUSTOMER",
            target_user_id=r.user_id,
            action_link="/dashboard?tab=feedback",
            sender_name=f"{ship_name} Management",
            is_read=False,
            recipients_count=1,
            created_at=datetime.utcnow()
        )
        db.add(notif)

    db.commit()

    return {
        "success": True,
        "message": "Apology and resolution message sent to customer successfully.",
        "owner_response": r.owner_response,
        "owner_response_at": r.owner_response_at.strftime("%Y-%m-%d %H:%M")
    }


# ==============================================================================
# STAFF & EQUIPMENT MANAGEMENT (WATER SPORTS & MARITIME OPERATIONS)
# ==============================================================================

class StaffCreateRequest(BaseModel):
    name: str = Field(..., max_length=120)
    role: str = Field("INSTRUCTOR", max_length=50)  # INSTRUCTOR, CAPTAIN, GUIDE, SAFETY_CREW
    license_number: Optional[str] = ""
    certifications: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    max_supervision_limit: int = Field(6, ge=1, le=50)
    experience_years: int = Field(3, ge=0)
    status: str = Field("ACTIVE", max_length=30)  # ACTIVE, ON_DUTY, ON_LEAVE, INACTIVE
    assigned_activity_types: Optional[List[str]] = []
    assigned_ship_id: Optional[int] = None
    notes: Optional[str] = ""


class StaffUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    license_number: Optional[str] = None
    certifications: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    max_supervision_limit: Optional[int] = None
    experience_years: Optional[int] = None
    status: Optional[str] = None
    assigned_activity_types: Optional[List[str]] = None
    assigned_ship_id: Optional[int] = None
    notes: Optional[str] = None


class EquipmentCreateRequest(BaseModel):
    name: str = Field(..., max_length=150)
    category: str = Field(..., max_length=50)  # LIFE_JACKET, DIVING_EQUIPMENT, JET_SKI, SURFBOARD, RAFT, SNORKEL_GEAR, KAYAK, SAFETY_KIT, OTHER
    serial_number: Optional[str] = ""
    total_quantity: int = Field(1, ge=1)
    condition_status: str = Field("OPERATIONAL", max_length=30)  # OPERATIONAL, IN_USE, MAINTENANCE, RETIRED
    last_inspected_at: Optional[str] = None
    next_inspection_due: Optional[str] = None
    safety_certification: Optional[str] = "Certified for Marine Use"
    assigned_activity_id: Optional[int] = None
    assigned_ship_id: Optional[int] = None
    notes: Optional[str] = ""


class EquipmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    serial_number: Optional[str] = None
    total_quantity: Optional[int] = None
    condition_status: Optional[str] = None
    last_inspected_at: Optional[str] = None
    next_inspection_due: Optional[str] = None
    safety_certification: Optional[str] = None
    assigned_activity_id: Optional[int] = None
    assigned_ship_id: Optional[int] = None
    notes: Optional[str] = None


class AvailabilitySimulationRequest(BaseModel):
    activity_id: int
    booking_date: str
    time_slot: str
    participants: int = 1


def seed_default_staff_and_equipment_if_empty(user: User, db: Session):
    existing_staff = db.query(StaffMember).filter(StaffMember.owner_id == user.id).first()
    if not existing_staff:
        staff_samples = [
            StaffMember(
                owner_id=user.id,
                name="Vikram Deshmukh",
                role="INSTRUCTOR",
                license_number="PADI-OWSI-418293",
                certifications="PADI Master Scuba Diver Trainer, EFR Emergency First Response Instructor",
                phone="+91 98201 44556",
                email="vikram.scuba@crosshunt.com",
                max_supervision_limit=4,
                experience_years=8,
                status="ON_DUTY",
                assigned_activity_types_json=json.dumps(["scuba_diving", "snorkeling", "scuba"]),
                notes="Specializes in deep water reef diving and beginner PADI discover dives. Strict 4-diver ratio limit.",
            ),
            StaffMember(
                owner_id=user.id,
                name="Capt. Rajesh Nayak",
                role="CAPTAIN",
                license_number="MMD-MUM-M1-2019-881",
                certifications="Master Mariner Class 1 (Near Coastal & High Seas), STCW-95 Marine Safety",
                phone="+91 98202 88771",
                email="capt.rajesh@crosshunt.com",
                max_supervision_limit=25,
                experience_years=14,
                status="ACTIVE",
                assigned_activity_types_json=json.dumps(["all", "boat_tours", "private_charter"]),
                notes="Certified Master for passenger catamarans, motor yachts, and dive tender speedboats.",
            ),
            StaffMember(
                owner_id=user.id,
                name="Ananya Rao",
                role="INSTRUCTOR",
                license_number="ISA-SURF-L2-9902",
                certifications="ISA Level 2 Certified Surf Instructor, SLS Coastal Water Lifeguard",
                phone="+91 98203 11223",
                email="ananya.surf@crosshunt.com",
                max_supervision_limit=6,
                experience_years=6,
                status="ON_DUTY",
                assigned_activity_types_json=json.dumps(["surfing", "kite_surfing", "jet_skiing"]),
                notes="Wave dynamics and coastal board master. Supervised limit: 6 students per session.",
            ),
            StaffMember(
                owner_id=user.id,
                name="Suresh Patil",
                role="GUIDE",
                license_number="IRF-RAFT-GD-3312",
                certifications="IRF Class IV Whitewater Raft Guide & Swiftwater Rescue Technician (SRT)",
                phone="+91 98204 77665",
                email="suresh.raft@crosshunt.com",
                max_supervision_limit=8,
                experience_years=7,
                status="ACTIVE",
                assigned_activity_types_json=json.dumps(["rafting", "kayaking", "white_water_rafting"]),
                notes="Mandovi and Kali river rapids certified. High-current emergency rescue qualified.",
            ),
            StaffMember(
                owner_id=user.id,
                name="Pooja Vernekar",
                role="SAFETY_CREW",
                license_number="ILS-MED-SAFE-551",
                certifications="ILS Senior Lifesaver, Red Cross CPR/AED & Marine First Aid Responder",
                phone="+91 98205 33449",
                email="pooja.safety@crosshunt.com",
                max_supervision_limit=15,
                experience_years=5,
                status="ON_DUTY",
                assigned_activity_types_json=json.dumps(["all"]),
                notes="Dedicated medical officer on board. Monitors ocean safety, life jackets, and swimmer perimeter.",
            ),
        ]
        for s in staff_samples:
            db.add(s)
        db.commit()

    existing_equip = db.query(EquipmentItem).filter(EquipmentItem.owner_id == user.id).first()
    if not existing_equip:
        equip_samples = [
            EquipmentItem(
                owner_id=user.id,
                name="Mustang Survival Solas Life Jackets (Adult & Youth)",
                category="LIFE_JACKET",
                serial_number="MS-SOLAS-BATCH-A",
                total_quantity=24,
                condition_status="OPERATIONAL",
                safety_certification="ISO 12402-4 Marine Safety & IRS Approved",
                notes="High-buoyancy 150N foam vests with integrated whistle and SOLAS reflective tape.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="AquaLung Pro HD Scuba Kit (BCD, Regulator, Octo & Tank)",
                category="DIVING_EQUIPMENT",
                serial_number="AL-PRO-HD-SET-01",
                total_quantity=6,
                condition_status="OPERATIONAL",
                safety_certification="Annual Hydrostatic Tank Inspection Passed (IRS Lab)",
                notes="Complete premium scuba setup: BCD, balanced diaphragm regulator, octopus, and 12L tank.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="Scuba Pro MK25 Diving Regulator Spare Kit",
                category="DIVING_EQUIPMENT",
                serial_number="SP-MK25-SPR-02",
                total_quantity=2,
                condition_status="MAINTENANCE",
                safety_certification="Scheduled valve overhaul and high-pressure diaphragm replacement",
                notes="Temporarily out of service for certified manufacturer servicing. Expected back next week.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="Yamaha WaveRunner VX-Deluxe (3-Seater Jet Ski)",
                category="JET_SKI",
                serial_number="YAM-VX-DLX-2024",
                total_quantity=4,
                condition_status="OPERATIONAL",
                safety_certification="IRS Maritime Safety & Engine Seaworthiness Certificate",
                notes="High performance 4-stroke TR-1 engine with RiDE reverse throttle system and lanyard cutoff.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="Sea-Doo Spark Trixx (2-Seater Jet Ski)",
                category="JET_SKI",
                serial_number="SD-SPARK-TRX-03",
                total_quantity=1,
                condition_status="MAINTENANCE",
                safety_certification="Scheduled jet pump impeller bearing servicing",
                notes="Impeller wear-ring inspection underway at marina drydock.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="Torq ACT Epoxy 8'0\" Foam-Top Surfboard Set",
                category="SURFBOARD",
                serial_number="TRQ-SURF-8FT-08",
                total_quantity=8,
                condition_status="OPERATIONAL",
                safety_certification="Soft-rail beginner impact safety certified",
                notes="Safe foam tops with durable epoxy core, flexible safety fins, and heavy-duty urethane leashes.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="NRS Outlaw 14-ft Heavy-Duty Inflatable Raft",
                category="RAFT",
                serial_number="NRS-OUTLAW-14-R3",
                total_quantity=3,
                condition_status="OPERATIONAL",
                safety_certification="Class IV Rapids Commercial Outfitter Certified",
                notes="Self-bailing welded PVC with 4 main air chambers, perimeter grab line, and 8 paddles.",
            ),
            EquipmentItem(
                owner_id=user.id,
                name="Cressi Panoramic Dry Snorkel & Silicone Mask Kits",
                category="SNORKEL_GEAR",
                serial_number="CRS-SNK-PAN-16",
                total_quantity=16,
                condition_status="OPERATIONAL",
                safety_certification="Tempered glass and food-grade hypoallergenic silicone",
                notes="Wide-angle 180 degree view masks with dry-top purge valve snorkels.",
            ),
        ]
        for e in equip_samples:
            db.add(e)
        db.commit()


@router.get("/staff")
def list_operator_staff(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    List all certified staff members, captains, instructors, and safety crew for this operator.
    """
    seed_default_staff_and_equipment_if_empty(current_user, db)

    staff_members = (
        db.query(StaffMember)
        .options(joinedload(StaffMember.assigned_ship))
        .filter(StaffMember.owner_id == current_user.id)
        .order_by(desc(StaffMember.created_at))
        .all()
    )

    stats = {
        "total": len(staff_members),
        "active": sum(1 for s in staff_members if s.status in ["ACTIVE", "ON_DUTY"]),
        "on_duty": sum(1 for s in staff_members if s.status == "ON_DUTY"),
        "on_leave": sum(1 for s in staff_members if s.status == "ON_LEAVE"),
        "instructors_count": sum(1 for s in staff_members if s.role == "INSTRUCTOR"),
        "captains_count": sum(1 for s in staff_members if s.role == "CAPTAIN"),
        "guides_count": sum(1 for s in staff_members if s.role == "GUIDE"),
        "safety_crew_count": sum(1 for s in staff_members if s.role == "SAFETY_CREW"),
    }

    return {
        "staff": [s.to_dict() for s in staff_members],
        "stats": stats,
    }


@router.post("/staff")
def create_operator_staff(
    data: StaffCreateRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Add a new staff member (Instructor, Captain, Guide, Safety Crew).
    """
    assigned_ship = None
    if data.assigned_ship_id:
        assigned_ship = db.query(Cross).filter(Cross.id == data.assigned_ship_id).first()
        if not assigned_ship or (assigned_ship.owner_id != current_user.id and not current_user.is_admin):
            raise HTTPException(status_code=403, detail="Cannot assign staff to a vessel you do not own.")

    staff = StaffMember(
        owner_id=current_user.id,
        name=data.name,
        role=data.role.upper(),
        license_number=data.license_number or "",
        certifications=data.certifications or "",
        phone=data.phone or "",
        email=data.email or "",
        max_supervision_limit=data.max_supervision_limit,
        experience_years=data.experience_years,
        status=data.status.upper(),
        assigned_activity_types_json=json.dumps(data.assigned_activity_types or []),
        assigned_ship_id=assigned_ship.id if assigned_ship else None,
        notes=data.notes or "",
    )

    db.add(staff)
    db.commit()
    db.refresh(staff)

    return {
        "success": True,
        "message": f"Staff member '{staff.name}' added successfully.",
        "staff": staff.to_dict(),
    }


@router.put("/staff/{staff_id}")
def update_operator_staff(
    staff_id: int,
    data: StaffUpdateRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Update staff member details, role, certifications, or supervision capacity.
    """
    staff = db.query(StaffMember).filter(StaffMember.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    if not current_user.is_admin and staff.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this staff member.")

    update_dict = data.dict(exclude_unset=True)
    if "assigned_activity_types" in update_dict:
        staff.assigned_activity_types_json = json.dumps(update_dict.pop("assigned_activity_types") or [])

    if "assigned_ship_id" in update_dict:
        ship_id = update_dict.get("assigned_ship_id")
        if ship_id:
            ship = db.query(Cross).filter(Cross.id == ship_id).first()
            if not ship or (ship.owner_id != current_user.id and not current_user.is_admin):
                raise HTTPException(status_code=403, detail="Invalid vessel assignment.")
            staff.assigned_ship_id = ship.id
        else:
            staff.assigned_ship_id = None

    for k, v in update_dict.items():
        if k != "assigned_ship_id" and hasattr(staff, k) and v is not None:
            if k in ["role", "status"]:
                setattr(staff, k, str(v).upper())
            else:
                setattr(staff, k, v)

    db.commit()
    db.refresh(staff)

    return {
        "success": True,
        "message": f"Staff member '{staff.name}' updated successfully.",
        "staff": staff.to_dict(),
    }


@router.delete("/staff/{staff_id}")
def delete_operator_staff(
    staff_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Remove staff member from roster.
    """
    staff = db.query(StaffMember).filter(StaffMember.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    if not current_user.is_admin and staff.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    # Unlink any activities using this staff member as default
    db.query(Activity).filter(Activity.default_staff_id == staff.id).update({"default_staff_id": None})

    name = staff.name
    db.delete(staff)
    db.commit()

    return {"success": True, "message": f"Staff member '{name}' removed from roster."}


@router.patch("/staff/{staff_id}/status")
def toggle_staff_status(
    staff_id: int,
    status_str: str = Query(..., alias="status"),
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Quick status toggle for staff (ACTIVE, ON_DUTY, ON_LEAVE, INACTIVE).
    """
    staff = db.query(StaffMember).filter(StaffMember.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    if not current_user.is_admin and staff.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    valid_statuses = ["ACTIVE", "ON_DUTY", "ON_LEAVE", "INACTIVE"]
    new_status = status_str.upper()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    staff.status = new_status
    db.commit()

    return {"success": True, "status": staff.status, "message": f"Status updated to {staff.status}."}


@router.get("/equipment")
def list_operator_equipment(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    List all water sports & maritime equipment items, categories, and maintenance status.
    """
    seed_default_staff_and_equipment_if_empty(current_user, db)

    equipment_items = (
        db.query(EquipmentItem)
        .options(joinedload(EquipmentItem.assigned_activity), joinedload(EquipmentItem.assigned_ship))
        .filter(EquipmentItem.owner_id == current_user.id)
        .order_by(desc(EquipmentItem.created_at))
        .all()
    )

    total_units = sum(e.total_quantity for e in equipment_items)
    operational_units = sum(e.total_quantity for e in equipment_items if e.condition_status == "OPERATIONAL")
    maintenance_units = sum(e.total_quantity for e in equipment_items if e.condition_status in ["MAINTENANCE", "RETIRED"])

    stats = {
        "total_items": len(equipment_items),
        "total_units": total_units,
        "operational_units": operational_units,
        "maintenance_units": maintenance_units,
        "compliance_rate": round((operational_units / total_units * 100), 1) if total_units > 0 else 100,
        "by_category": {
            "LIFE_JACKET": sum(e.total_quantity for e in equipment_items if e.category == "LIFE_JACKET"),
            "DIVING_EQUIPMENT": sum(e.total_quantity for e in equipment_items if e.category == "DIVING_EQUIPMENT"),
            "JET_SKI": sum(e.total_quantity for e in equipment_items if e.category == "JET_SKI"),
            "SURFBOARD": sum(e.total_quantity for e in equipment_items if e.category == "SURFBOARD"),
            "RAFT": sum(e.total_quantity for e in equipment_items if e.category == "RAFT"),
            "SNORKEL_GEAR": sum(e.total_quantity for e in equipment_items if e.category == "SNORKEL_GEAR"),
            "KAYAK": sum(e.total_quantity for e in equipment_items if e.category == "KAYAK"),
        },
    }

    return {
        "equipment": [e.to_dict() for e in equipment_items],
        "stats": stats,
    }


@router.post("/equipment")
def create_operator_equipment(
    data: EquipmentCreateRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Register new water sports or safety equipment (Life jackets, Diving gear, Jet skis, Surfboards, Rafts).
    """
    assigned_activity = None
    if data.assigned_activity_id:
        assigned_activity = db.query(Activity).filter(Activity.id == data.assigned_activity_id).first()
        if not assigned_activity or (assigned_activity.owner_id != current_user.id and not current_user.is_admin):
            raise HTTPException(status_code=403, detail="Cannot assign equipment to an activity you do not own.")

    assigned_ship = None
    if data.assigned_ship_id:
        assigned_ship = db.query(Cross).filter(Cross.id == data.assigned_ship_id).first()
        if not assigned_ship or (assigned_ship.owner_id != current_user.id and not current_user.is_admin):
            raise HTTPException(status_code=403, detail="Cannot assign equipment to a vessel you do not own.")

    item = EquipmentItem(
        owner_id=current_user.id,
        name=data.name,
        category=data.category.upper(),
        serial_number=data.serial_number or "",
        total_quantity=data.total_quantity,
        condition_status=data.condition_status.upper(),
        safety_certification=data.safety_certification or "Certified for Marine Use",
        assigned_activity_id=assigned_activity.id if assigned_activity else None,
        assigned_ship_id=assigned_ship.id if assigned_ship else None,
        notes=data.notes or "",
    )

    if data.last_inspected_at:
        try:
            item.last_inspected_at = datetime.strptime(data.last_inspected_at, "%Y-%m-%d").date()
        except Exception:
            pass
    if data.next_inspection_due:
        try:
            item.next_inspection_due = datetime.strptime(data.next_inspection_due, "%Y-%m-%d").date()
        except Exception:
            pass

    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "success": True,
        "message": f"Equipment '{item.name}' added to inventory.",
        "equipment": item.to_dict(),
    }


@router.put("/equipment/{equipment_id}")
def update_operator_equipment(
    equipment_id: int,
    data: EquipmentUpdateRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Update equipment inventory, quantity, inspection record, or maintenance status.
    """
    item = db.query(EquipmentItem).filter(EquipmentItem.id == equipment_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Equipment item not found.")

    if not current_user.is_admin and item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    update_dict = data.dict(exclude_unset=True)

    if "assigned_activity_id" in update_dict:
        act_id = update_dict.get("assigned_activity_id")
        if act_id:
            act = db.query(Activity).filter(Activity.id == act_id).first()
            if not act or (act.owner_id != current_user.id and not current_user.is_admin):
                raise HTTPException(status_code=403, detail="Invalid activity assignment.")
            item.assigned_activity_id = act.id
        else:
            item.assigned_activity_id = None

    if "assigned_ship_id" in update_dict:
        ship_id = update_dict.get("assigned_ship_id")
        if ship_id:
            ship = db.query(Cross).filter(Cross.id == ship_id).first()
            if not ship or (ship.owner_id != current_user.id and not current_user.is_admin):
                raise HTTPException(status_code=403, detail="Invalid vessel assignment.")
            item.assigned_ship_id = ship.id
        else:
            item.assigned_ship_id = None

    if "last_inspected_at" in update_dict:
        val = update_dict.pop("last_inspected_at")
        if val:
            try:
                item.last_inspected_at = datetime.strptime(val, "%Y-%m-%d").date()
            except Exception:
                pass
        else:
            item.last_inspected_at = None

    if "next_inspection_due" in update_dict:
        val = update_dict.pop("next_inspection_due")
        if val:
            try:
                item.next_inspection_due = datetime.strptime(val, "%Y-%m-%d").date()
            except Exception:
                pass
        else:
            item.next_inspection_due = None

    for k, v in update_dict.items():
        if k not in ["assigned_activity_id", "assigned_ship_id"] and hasattr(item, k) and v is not None:
            if k in ["category", "condition_status"]:
                setattr(item, k, str(v).upper())
            else:
                setattr(item, k, v)

    db.commit()
    db.refresh(item)

    return {
        "success": True,
        "message": f"Equipment '{item.name}' updated successfully.",
        "equipment": item.to_dict(),
    }


@router.delete("/equipment/{equipment_id}")
def delete_operator_equipment(
    equipment_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Remove equipment item from inventory.
    """
    item = db.query(EquipmentItem).filter(EquipmentItem.id == equipment_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Equipment item not found.")

    if not current_user.is_admin and item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    name = item.name
    db.delete(item)
    db.commit()

    return {"success": True, "message": f"Equipment '{name}' removed from inventory."}


@router.patch("/equipment/{equipment_id}/condition")
def toggle_equipment_condition(
    equipment_id: int,
    condition: str = Query(..., alias="condition"),
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Quick status toggle for equipment (OPERATIONAL, MAINTENANCE, RETIRED).
    """
    item = db.query(EquipmentItem).filter(EquipmentItem.id == equipment_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Equipment item not found.")

    if not current_user.is_admin and item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    valid_conditions = ["OPERATIONAL", "IN_USE", "MAINTENANCE", "RETIRED"]
    new_cond = condition.upper()
    if new_cond not in valid_conditions:
        raise HTTPException(status_code=400, detail=f"Invalid condition. Must be one of {valid_conditions}")

    item.condition_status = new_cond
    db.commit()

    return {"success": True, "condition_status": item.condition_status, "message": f"Condition updated to {item.condition_status}."}


@router.post("/availability-simulator")
def run_availability_simulation(
    req: AvailabilitySimulationRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Operator Availability Engine Simulator:
    Simulate any hypothetical booking to inspect the 4-tier validation pipeline:
    1. Vessel capacity & maintenance check
    2. Instructor supervision limits & overlapping groups check
    3. Equipment operational inventory check
    4. Activity slot capacity check
    """
    act = db.query(Activity).filter(Activity.id == req.activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")

    res = check_comprehensive_availability(
        db=db,
        activity=act,
        booking_date=req.booking_date,
        time_slot=req.time_slot,
        requested_participants=req.participants,
    )

    return {
        "success": True,
        "activity_title": act.title,
        "booking_date": req.booking_date,
        "time_slot": req.time_slot,
        "requested_participants": req.participants,
        **res,
    }


# ==============================================================================
# OWNER EARNINGS, FINANCIAL ACCOUNTING & PAYOUT MANAGEMENT
# ==============================================================================

class RequestPayoutPayload(BaseModel):
    amount: float = Field(..., gt=0)
    bank_name: Optional[str] = "HDFC Bank"
    account_number: Optional[str] = "•••• •••• 4092"
    ifsc_code: Optional[str] = "HDFC0001234"
    notes: Optional[str] = "Owner payout withdrawal request"


def seed_default_owner_payouts_if_empty(user: User, db: Session, net_earnings: Decimal = Decimal('0.00')):
    existing_payout = db.query(OwnerPayout).filter(OwnerPayout.owner_id == user.id).first()
    if not existing_payout:
        payout1_amt = Decimal("45000.00") if net_earnings >= Decimal("50000.00") else Decimal("18500.00")
        payout2_amt = Decimal("32000.00") if net_earnings >= Decimal("50000.00") else Decimal("12000.00")
        sample_payouts = [
            OwnerPayout(
                owner_id=user.id,
                payout_reference=f"PAY-{datetime.utcnow().strftime('%Y%m')}-4109",
                utr_number="HDFC000293847192",
                amount=payout1_amt,
                currency="INR",
                status="COMPLETED",
                bank_name="HDFC Bank",
                account_number_masked="•••• •••• 4092",
                ifsc_code="HDFC0001234",
                payment_method="NEFT / Direct Bank Transfer",
                period_start=date(2026, 9, 1),
                period_end=date(2026, 9, 30),
                bookings_count=6,
                notes="Bi-weekly settlement for confirmed private yacht charters and coastal tours.",
                processed_at=datetime.utcnow() - timedelta(days=25),
                created_at=datetime.utcnow() - timedelta(days=25),
            ),
            OwnerPayout(
                owner_id=user.id,
                payout_reference=f"PAY-{datetime.utcnow().strftime('%Y%m')}-6218",
                utr_number="ICICIR520261015091",
                amount=payout2_amt,
                currency="INR",
                status="COMPLETED",
                bank_name="HDFC Bank",
                account_number_masked="•••• •••• 4092",
                ifsc_code="HDFC0001234",
                payment_method="IMPS Instant Settlement",
                period_start=date(2026, 10, 1),
                period_end=date(2026, 10, 15),
                bookings_count=4,
                notes="Mid-month payout settlement for water sports and cruise experiences.",
                processed_at=datetime.utcnow() - timedelta(days=10),
                created_at=datetime.utcnow() - timedelta(days=10),
            ),
            OwnerPayout(
                owner_id=user.id,
                payout_reference=f"PAY-{datetime.utcnow().strftime('%Y%m')}-8840",
                utr_number="Awaiting Bank Clearance",
                amount=Decimal("15200.00"),
                currency="INR",
                status="PROCESSING",
                bank_name="HDFC Bank",
                account_number_masked="•••• •••• 4092",
                ifsc_code="HDFC0001234",
                payment_method="NEFT / Automated Gateway Settlement",
                period_start=date(2026, 10, 16),
                period_end=date(2026, 10, 25),
                bookings_count=3,
                notes="Scheduled bi-weekly payout batch in clearance process with banking partner.",
                processed_at=None,
                created_at=datetime.utcnow() - timedelta(days=1),
            ),
        ]
        for p in sample_payouts:
            db.add(p)
        db.commit()


@router.get("/financial-overview")
def get_owner_financial_overview(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Dedicated Financial Dashboard for Owner:
    - Gross booking value
    - Platform commission (15%)
    - Payment processing fees (2%)
    - Refunds
    - Net earnings (83% of gross minus refunds)
    - Completed payouts
    - Pending payouts
    - Transaction history & Payout records
    - Booking-wise revenue ledger
    """
    # Check if admin mode (admin with no personal ships)
    has_own_ships = db.query(Cross).filter(Cross.owner_id == current_user.id).first() is not None
    is_admin_mode = (current_user.role in ['ADMIN'] or current_user.is_superuser) and not has_own_ships

    if is_admin_mode:
        bookings_query = db.query(Booking).order_by(desc(Booking.created_at), desc(Booking.id))
    else:
        vessel_ids = [v.id for v in db.query(Cross.id).filter(Cross.owner_id == current_user.id).all()]
        owned_act_ids = [a.id for a in db.query(Activity.id).filter(Activity.owner_id == current_user.id).all()]
        owned_act_tokens = [f"ACT_{aid}" for aid in owned_act_ids]

        filter_conds = []
        if vessel_ids:
            filter_conds.append(Booking.cross_id.in_(vessel_ids))
        if owned_act_tokens:
            filter_conds.append(Booking.event_type.in_(owned_act_tokens))

        if filter_conds:
            bookings_query = db.query(Booking).filter(or_(*filter_conds)).order_by(desc(Booking.created_at), desc(Booking.id))
        else:
            bookings_query = db.query(Booking).filter(Booking.id == -1)

    all_bookings = bookings_query.all()

    # Confirmed, Completed, and In-Progress trips represent earned gross value
    active_revenue_bookings = [b for b in all_bookings if b.status in ['CONFIRMED', 'COMPLETED', 'IN_PROGRESS']]
    gross_booking_value_dec = sum((b.total_price or Decimal('0.00')) for b in active_revenue_bookings)

    platform_commission_dec = round(gross_booking_value_dec * Decimal('0.15'), 2)
    payment_processing_fees_dec = round(gross_booking_value_dec * Decimal('0.02'), 2)

    # Refunds tracking
    refund_bookings = [b for b in all_bookings if b.status == 'CANCELLED' or (b.refund_amount and b.refund_amount > 0)]
    refunds_dec = sum((b.refund_amount or (b.total_price if b.status == 'CANCELLED' else Decimal('0.00'))) for b in refund_bookings)

    # Net owner earnings
    net_earnings_dec = max(Decimal('0.00'), gross_booking_value_dec - platform_commission_dec - payment_processing_fees_dec - refunds_dec)

    # Auto seed sample verified payouts if none exist
    seed_default_owner_payouts_if_empty(current_user, db, net_earnings_dec)

    # Completed & Pending Payouts
    completed_payouts_dec = db.query(func.coalesce(func.sum(OwnerPayout.amount), Decimal('0.00'))).filter(
        OwnerPayout.owner_id == current_user.id,
        OwnerPayout.status == 'COMPLETED'
    ).scalar() or Decimal('0.00')

    pending_payouts_dec = max(Decimal('0.00'), net_earnings_dec - Decimal(str(completed_payouts_dec)))

    # Fetch Payout Records
    payout_records = (
        db.query(OwnerPayout)
        .filter(OwnerPayout.owner_id == current_user.id)
        .order_by(desc(OwnerPayout.created_at))
        .all()
    )

    # Granular Booking-Wise Revenue Ledger
    booking_ledger = []
    for b in all_bookings:
        gross_amt = float(b.total_price or 0.0)
        # 15% Platform Commission
        comm_amt = float(b.platform_commission_amount or round(Decimal(str(gross_amt)) * Decimal('0.15'), 2))
        # 2% Payment Gateway Fee
        gateway_fee = round(gross_amt * 0.02, 2)
        ref_amt = float(b.refund_amount or (gross_amt if b.status == 'CANCELLED' else 0.0))
        # Net Owner Share
        net_share = max(0.0, round(gross_amt - comm_amt - gateway_fee - ref_amt, 2))

        # Title / Item Name
        item_title = "Water Experience"
        if b.cross and b.cross.name:
            item_title = b.cross.name
        elif b.public_tour and b.public_tour.name:
            item_title = b.public_tour.name
        elif b.event_type:
            item_title = b.event_type

        # Customer display
        cust_name = b.user.full_name if b.user else "Direct Guest"

        # Payout status
        p_status = b.payout_status or ("SETTLED" if b.status == "COMPLETED" else "PENDING")
        if b.status == "CANCELLED":
            p_status = "REFUNDED"

        booking_ledger.append({
            "booking_id": b.id,
            "ticket_code": b.ticket_code or f"TKT-CH-{b.id}",
            "booking_date": b.booking_date.isoformat() if b.booking_date else "",
            "booking_type": b.booking_type,
            "item_name": item_title,
            "customer_name": cust_name,
            "customer_whatsapp": b.customer_whatsapp or (b.user.whatsapp_number if b.user else ""),
            "gross_amount": gross_amt,
            "platform_commission": comm_amt,
            "platform_commission_rate": 15.0,
            "payment_processing_fee": gateway_fee,
            "payment_processing_rate": 2.0,
            "refund_amount": ref_amt,
            "net_owner_share": net_share,
            "booking_status": b.status,
            "payout_status": p_status,
            "payment_method": b.payment_method or "UPI / NetBanking",
            "payment_gateway_ref": b.payment_gateway_ref or f"pay_gw_{b.id}821",
            "created_at": b.created_at.strftime("%Y-%m-%d %H:%M") if b.created_at else "",
        })

    return {
        "kpis": {
            "gross_booking_value": float(gross_booking_value_dec),
            "platform_commission": float(platform_commission_dec),
            "payment_processing_fees": float(payment_processing_fees_dec),
            "refunds": float(refunds_dec),
            "net_earnings": float(net_earnings_dec),
            "completed_payouts": float(completed_payouts_dec),
            "pending_payouts": float(pending_payouts_dec),
            "payout_rate_percentage": 83.0,
            "platform_commission_percentage": 15.0,
            "payment_processing_percentage": 2.0,
            "total_bookings_count": len(all_bookings),
            "confirmed_bookings_count": len(active_revenue_bookings),
            "refunded_bookings_count": len(refund_bookings),
        },
        "payouts": [p.to_dict() for p in payout_records],
        "booking_ledger": booking_ledger,
    }


@router.get("/payouts")
def list_owner_payouts(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    List owner payout transaction history.
    """
    seed_default_owner_payouts_if_empty(current_user, db)

    payouts = (
        db.query(OwnerPayout)
        .filter(OwnerPayout.owner_id == current_user.id)
        .order_by(desc(OwnerPayout.created_at))
        .all()
    )

    total_disbursed = sum(float(p.amount) for p in payouts if p.status == "COMPLETED")
    total_processing = sum(float(p.amount) for p in payouts if p.status in ["PROCESSING", "PENDING"])

    return {
        "payouts": [p.to_dict() for p in payouts],
        "stats": {
            "total_count": len(payouts),
            "total_disbursed": total_disbursed,
            "total_processing": total_processing,
        }
    }


@router.post("/request-payout")
def request_owner_payout(
    req: RequestPayoutPayload,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db),
):
    """
    Request manual payout disbursement to owner bank account.
    """
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Payout request amount must be greater than zero.")

    ref = f"PAY-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    payout = OwnerPayout(
        owner_id=current_user.id,
        payout_reference=ref,
        utr_number="Awaiting Bank Clearance",
        amount=Decimal(str(req.amount)),
        currency="INR",
        status="PROCESSING",
        bank_name=req.bank_name or "HDFC Bank",
        account_number_masked=req.account_number or "•••• •••• 4092",
        ifsc_code=req.ifsc_code or "HDFC0001234",
        payment_method="NEFT / Automated Gateway Settlement",
        notes=req.notes or "Owner requested payout disbursement",
        processed_at=None,
        created_at=datetime.utcnow(),
    )

    db.add(payout)

    # Create in-app platform notification for owner
    notif = PlatformNotification(
        title="Payout Request Submitted",
        message=f"Payout request of ₹{req.amount:,.2f} (Ref: {ref}) has been initiated. Funds will be credited within 24-48 business hours.",
        notification_type="SYSTEM",
        target_audience="OWNER",
        target_user_id=current_user.id,
        action_link="/operator?tab=earnings",
        sender_name="Cross-Hunt Finance",
        is_read=False,
        recipients_count=1,
        created_at=datetime.utcnow(),
    )
    db.add(notif)

    db.commit()
    db.refresh(payout)

    return {
        "success": True,
        "message": f"Payout request of ₹{req.amount:,.2f} submitted successfully (Ref: {ref}).",
        "payout": payout.to_dict(),
    }




