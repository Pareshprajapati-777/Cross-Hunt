import uuid
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from backend.app.models.booking import Booking
from backend.app.models.tour import PublicTour
from backend.app.models.cross import Cross
from backend.app.models.user import User
from backend.app.services.trip_lifecycle_service import auto_complete_trips, get_current_ist_datetime


def test_auto_complete_past_public_tour_and_bookings(db_session):
    now_ist = get_current_ist_datetime()
    today = now_ist.date()
    uid = uuid.uuid4().hex[:8]

    # Create dummy user & vessel
    user = User(
        username=f"user_{uid}",
        email=f"user_{uid}@test.com",
        password="hash",
        role="USER"
    )
    ship = Cross(
        name=f"Vessel {uid}",
        slug=f"vessel-{uid}",
        price=Decimal("10000"),
        capacity=50,
        departure_port="Goa",
        destination="Mandovi",
        is_active=True,
        is_approved=True
    )
    db_session.add(user)
    db_session.add(ship)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(ship)

    # 1. Create a past public tour that concluded yesterday
    past_tour = PublicTour(
        ship_id=ship.id,
        tour_title="Concluded Sunset Tour",
        slug=f"concluded-sunset-tour-{uid}",
        departure_port="Panaji",
        destination="Mandovi",
        departure_date=today - timedelta(days=2),
        departure_time=time(16, 0),
        return_date=today - timedelta(days=1),
        return_time=time(18, 0),
        status="SCHEDULED",
        is_published=True
    )
    db_session.add(past_tour)
    db_session.commit()
    db_session.refresh(past_tour)

    # Add a confirmed booking for this tour
    tour_booking = Booking(
        booking_id=f"CRS-PAST-TOUR-{uid}",
        user_id=user.id,
        cross_id=ship.id,
        public_tour_id=past_tour.id,
        booking_date=past_tour.departure_date,
        start_time=past_tour.departure_time,
        end_time=past_tour.return_time,
        booking_type="TOUR",
        base_price=Decimal("1500"),
        total_price=Decimal("1500"),
        status="CONFIRMED",
        tracking_status="BOOKED"
    )
    db_session.add(tour_booking)

    # 2. Create a past private charter that ended yesterday
    past_charter = Booking(
        booking_id=f"CRS-PAST-CHARTER-{uid}",
        user_id=user.id,
        cross_id=ship.id,
        booking_date=today - timedelta(days=1),
        start_time=time(14, 0),
        end_time=time(18, 0),
        booking_type="EVENT",
        base_price=Decimal("25000"),
        total_price=Decimal("25000"),
        status="CONFIRMED",
        tracking_status="BOOKED"
    )
    db_session.add(past_charter)

    # 3. Create a future private charter tomorrow
    future_charter = Booking(
        booking_id=f"CRS-FUT-CHARTER-{uid}",
        user_id=user.id,
        cross_id=ship.id,
        booking_date=today + timedelta(days=2),
        start_time=time(16, 0),
        end_time=time(20, 0),
        booking_type="EVENT",
        base_price=Decimal("30000"),
        total_price=Decimal("30000"),
        status="CONFIRMED",
        tracking_status="BOOKED"
    )
    db_session.add(future_charter)
    db_session.commit()

    # Run auto_complete_trips
    res = auto_complete_trips(db_session, force=True)

    db_session.refresh(past_tour)
    db_session.refresh(tour_booking)
    db_session.refresh(past_charter)
    db_session.refresh(future_charter)

    # Verify Past Public Tour was marked COMPLETED
    assert past_tour.status == "COMPLETED"
    assert tour_booking.status == "COMPLETED"
    assert tour_booking.tracking_status == "COMPLETED"

    # Verify Past Private Charter was marked COMPLETED
    assert past_charter.status == "COMPLETED"
    assert past_charter.tracking_status == "COMPLETED"

    # Verify Future Charter remains CONFIRMED
    assert future_charter.status == "CONFIRMED"
    assert future_charter.tracking_status == "BOOKED"
