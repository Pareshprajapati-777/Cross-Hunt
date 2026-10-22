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

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_current_user, require_operator
from backend.app.models.user import User
from backend.app.models.cross import Cross, ShipExtra
from backend.app.models.tour import PublicTour
from backend.app.models.booking import Booking
from backend.app.services.serializers import serialize_cruise, serialize_tour, serialize_booking, serialize_extra

router = APIRouter(prefix="/operator", tags=["operator"])


@router.get("/dashboard/")
@router.get("/dashboard")
def get_operator_dashboard(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
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
        bookings_query = db.query(Booking).filter(Booking.cross_id.in_(vessel_ids)).order_by(desc(Booking.created_at), desc(Booking.id))
        tours = db.query(PublicTour).options(joinedload(PublicTour.ship), joinedload(PublicTour.operator)).filter(PublicTour.ship_id.in_(vessel_ids)).order_by(desc(PublicTour.created_at), desc(PublicTour.id)).all()

    all_bookings = bookings_query.all()

    # Calculate earnings from confirmed/completed
    confirmed_bookings = [b for b in all_bookings if b.status in ['CONFIRMED', 'COMPLETED']]
    earnings = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings)
    private_rev = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings if b.booking_type == 'EVENT')
    tour_rev = sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings if b.booking_type == 'TOUR')

    serialized_ships = [serialize_cruise(v) for v in vessels]
    available_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'AVAILABLE')
    booked_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'BOOKED')
    on_tour_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'ON_TOUR')
    maintenance_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'MAINTENANCE')

    earnings_dec = Decimal(str(earnings))
    owner_payout_dec = round(earnings_dec * Decimal('0.85'), 2)
    platform_comm_dec = round(earnings_dec * Decimal('0.15'), 2)

    stats = {
        'total_ships': len(serialized_ships),
        'total_vessels': len(serialized_ships),
        'active_ships': sum(1 for v in vessels if v.is_active),
        'available_ships': available_count,
        'booked_ships': booked_count,
        'on_tour_ships': on_tour_count,
        'maintenance_ships': maintenance_count,
        'total_bookings': len(all_bookings),
        'active_bookings': sum(1 for b in all_bookings if b.status in ['PENDING', 'CONFIRMED']),
        'pending_bookings': sum(1 for b in all_bookings if b.status == 'PENDING'),
        'confirmed_bookings': sum(1 for b in all_bookings if b.status == 'CONFIRMED'),
        'completed_trips': sum(1 for b in all_bookings if b.status == 'COMPLETED'),
        'total_revenue': float(earnings_dec),
        'gross_revenue': float(earnings_dec),
        'owner_payout': float(owner_payout_dec),
        'platform_commission': float(platform_comm_dec),
        'payout_rate': 0.85,
        'commission_rate': 0.15,
        'private_revenue': float(private_rev),
        'tour_revenue': float(tour_rev),
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
        'owner_payout': float(owner_payout_dec),
        'platform_commission': float(platform_comm_dec),
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
        is_active=True,
        is_approved=True,
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

    for field in ['name', 'category', 'description', 'location', 'address', 'destination', 'route', 'departure_port', 'facilities']:
        if field in data:
            setattr(ship, field, data[field])

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

    if booking.cross and booking.cross.owner_id != current_user.id and not current_user.is_superuser and current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="You can only manage your own vessels.")

    action_lower = action.lower()
    if action_lower == 'confirm':
        booking.status = 'CONFIRMED'
        booking.tracking_status = 'CONFIRMED'
        booking.ticket_status = 'VALID'
    elif action_lower in ['reject', 'cancel']:
        booking.status = 'CANCELLED'
        booking.tracking_status = 'CANCELLED'
        booking.ticket_status = 'CANCELLED'
    elif action_lower == 'complete':
        booking.status = 'COMPLETED'
        booking.tracking_status = 'COMPLETED'
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
