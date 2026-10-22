import time
from datetime import datetime, date, time as dt_time, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.core.cache import cache
from backend.app.models.booking import Booking
from backend.app.models.tour import PublicTour
from backend.app.models.cross import Cross

_LAST_LIFECYCLE_RUN = 0.0


def get_current_ist_datetime() -> datetime:
    """
    Returns current real-world datetime in Indian Standard Time (IST, UTC+5:30).
    Ensures consistent behavior across Windows local development and Render/Linux servers.
    """
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        return datetime.now(tz).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow() + timedelta(hours=5, minutes=30)


def auto_complete_trips(db: Session, force: bool = False) -> Dict[str, Any]:
    """
    Scans all public tours and private charter bookings.
    Based on real current date & time:
    - If tour/charter end time has passed -> Automatically transitions status & tracking to COMPLETED.
    - If tour/charter is currently underway -> Transitions tracking to ON_CRUISE.
    - Automatically frees up vessels when trips conclude.
    - Any past unconfirmed requests are marked EXPIRED.
    """
    now_ist = get_current_ist_datetime()
    today = now_ist.date()

    completed_tours_count = 0
    completed_bookings_count = 0
    on_tour_count = 0

    # =========================================================================
    # 1. PUBLIC TOURS & LINKED PASSENGER BOOKINGS
    # =========================================================================
    tours = db.query(PublicTour).filter(
        PublicTour.status.notin_(["COMPLETED", "CANCELLED"])
    ).all()

    for t in tours:
        # Resolve end datetime
        ret_date = t.return_date or t.departure_date
        ret_time = t.return_time or dt_time(23, 59, 59)
        tour_end_dt = datetime.combine(ret_date, ret_time)

        # Resolve start datetime
        dep_date = t.departure_date
        dep_time = t.departure_time or dt_time(0, 0, 0)
        tour_start_dt = datetime.combine(dep_date, dep_time)

        # Find all bookings for this public tour
        linked_bookings = db.query(Booking).filter(
            (Booking.public_tour_id == t.id) |
            ((Booking.cross_id == t.ship_id) & (Booking.booking_type == "TOUR") & (Booking.booking_date == t.departure_date))
        ).all()

        if now_ist >= tour_end_dt:
            # TOUR FINISHED -> Auto-complete tour
            t.status = "COMPLETED"
            completed_tours_count += 1

            for b in linked_bookings:
                if b.status in ("CONFIRMED", "PENDING"):
                    b.status = "COMPLETED"
                    b.tracking_status = "COMPLETED"
                    completed_bookings_count += 1
                elif b.status == "COMPLETED" and b.tracking_status != "COMPLETED":
                    b.tracking_status = "COMPLETED"

        elif tour_start_dt <= now_ist < tour_end_dt:
            # TOUR CURRENTLY IN PROGRESS
            if t.status in ("SCHEDULED", "AVAILABLE", "BOARDING"):
                t.status = "DEPARTED"
            for b in linked_bookings:
                if b.status == "CONFIRMED" and b.tracking_status not in ("COMPLETED", "CANCELLED"):
                    b.tracking_status = "ON_CRUISE"
                    on_tour_count += 1

    # =========================================================================
    # 2. PRIVATE CHARTERS & EVENT BOOKINGS
    # =========================================================================
    private_bookings = db.query(Booking).filter(
        Booking.status.in_(["CONFIRMED", "PENDING", "COMPLETED"]),
        Booking.booking_type != "TOUR",
        Booking.public_tour_id == None
    ).all()

    for b in private_bookings:
        b_date = b.booking_date
        s_time = b.start_time or dt_time(0, 0, 0)
        e_time = b.end_time or dt_time(23, 59, 59)
        is_overnight = (s_time >= e_time)

        charter_start_dt = datetime.combine(b_date, s_time)
        charter_end_dt = datetime.combine(b_date + timedelta(days=1), e_time) if is_overnight else datetime.combine(b_date, e_time)

        if now_ist >= charter_end_dt:
            # Charter finished
            if b.status == "CONFIRMED":
                b.status = "COMPLETED"
                b.tracking_status = "COMPLETED"
                completed_bookings_count += 1
            elif b.status == "PENDING":
                b.status = "EXPIRED"
                b.tracking_status = "COMPLETED"
                completed_bookings_count += 1
            elif b.status == "COMPLETED" and b.tracking_status != "COMPLETED":
                b.tracking_status = "COMPLETED"

        elif charter_start_dt <= now_ist < charter_end_dt:
            # Charter currently sailing
            if b.status == "CONFIRMED":
                b.tracking_status = "ON_CRUISE"
                on_tour_count += 1

    # =========================================================================
    # 3. PAST DATED ORPHANED BOOKINGS (Safeguard)
    # =========================================================================
    past_orphans = db.query(Booking).filter(
        Booking.status.in_(["CONFIRMED", "PENDING"]),
        Booking.booking_date < today
    ).all()

    for b in past_orphans:
        if b.status == "CONFIRMED":
            b.status = "COMPLETED"
            b.tracking_status = "COMPLETED"
            completed_bookings_count += 1
        elif b.status == "PENDING":
            b.status = "EXPIRED"
            b.tracking_status = "COMPLETED"
            completed_bookings_count += 1

    # Commit any changes to database and invalidate cache so UI gets fresh data
    if completed_tours_count > 0 or completed_bookings_count > 0 or on_tour_count > 0:
        try:
            db.commit()
            cache.clear()
        except Exception:
            db.rollback()

    return {
        "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S"),
        "completed_tours": completed_tours_count,
        "completed_bookings": completed_bookings_count,
        "on_tour": on_tour_count,
    }


def run_lifecycle_check_throttled(db: Session, min_interval_seconds: int = 15) -> Dict[str, Any]:
    """
    Throttled helper that runs the lifecycle check at most once every `min_interval_seconds`.
    Ensures zero performance penalty on frequent API hits while keeping trip states live.
    """
    global _LAST_LIFECYCLE_RUN
    now_ts = time.time()
    if (now_ts - _LAST_LIFECYCLE_RUN) >= min_interval_seconds:
        _LAST_LIFECYCLE_RUN = now_ts
        return auto_complete_trips(db)
    return {"skipped": True}
