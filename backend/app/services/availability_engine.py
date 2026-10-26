import re
from datetime import datetime, date, time
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from backend.app.models.activity import Activity
from backend.app.models.cross import Cross, ShipMaintenance
from backend.app.models.booking import Booking
from backend.app.models.staff_equipment import StaffMember, EquipmentItem


def parse_time_slot(time_slot_str: str) -> tuple[time, time]:
    """
    Parse strings like '10:30 AM', '10:30 AM - 12:30 PM', '14:00' into start_time and end_time.
    Defaults to 60-90 minute window if single time is passed.
    """
    cleaned = (time_slot_str or "10:00 AM").strip()
    # Check for range: '10:00 AM - 12:00 PM'
    if "-" in cleaned:
        parts = cleaned.split("-")
        try:
            start_t = datetime.strptime(parts[0].strip(), "%I:%M %p").time()
            end_t = datetime.strptime(parts[1].strip(), "%I:%M %p").time()
            return start_t, end_t
        except Exception:
            pass

    # Single time
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M"):
        try:
            start_dt = datetime.strptime(cleaned, fmt)
            start_t = start_dt.time()
            # default 75 minutes duration
            end_dt = datetime.combine(date.today(), start_t) + datetime.timedelta(minutes=75)
            return start_t, end_dt.time()
        except Exception:
            continue

    return time(10, 0), time(11, 30)


# Smart mapping from activity_type to default required equipment
ACTIVITY_EQUIPMENT_MAP = {
    "SCUBA_DIVING": "DIVING_EQUIPMENT",
    "SCUBA": "DIVING_EQUIPMENT",
    "JET_SKI": "JET_SKI",
    "JET_SKIING": "JET_SKI",
    "SURFING": "SURFBOARD",
    "KITE_SURFING": "SURFBOARD",
    "RAFTING": "RAFT",
    "WHITEWATER_RAFTING": "RAFT",
    "SNORKELING": "SNORKEL_GEAR",
    "KAYAKING": "KAYAK",
    "PARASAILING": "LIFE_JACKET",
    "WATER_POLO": "LIFE_JACKET",
    "CLIFF_DIVING": "LIFE_JACKET",
    "FISHING": "LIFE_JACKET",
    "DEEP_SEA_FISHING": "LIFE_JACKET",
}


def check_comprehensive_availability(
    db: Session,
    activity: Activity,
    booking_date: date | str,
    time_slot: str,
    requested_participants: int = 1,
    exclude_booking_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Multi-dimensional availability engine verifying:
    1. Activity slot capacity & min/max bounds
    2. Vessel availability, passenger capacity & drydock maintenance (if boat required)
    3. Instructor / Staff supervision limits (e.g. Scuba instructor max 4 participants per slot across overlapping groups)
    4. Equipment inventory condition (operational vs maintenance) and required gear stock

    Returns a comprehensive audit breakdown and flags any bottlenecks.
    """
    if isinstance(booking_date, str):
        try:
            b_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
        except Exception:
            b_date = date.today()
    else:
        b_date = booking_date

    start_t, end_t = parse_time_slot(time_slot)

    breakdown: Dict[str, Any] = {
        "activity_slot": None,
        "vessel": None,
        "instructor": None,
        "equipment": None,
        "life_jackets": None,
    }

    # -------------------------------------------------------------
    # 1. ACTIVITY SLOT CAPACITY CHECK
    # -------------------------------------------------------------
    # Check minimum participants
    if requested_participants < activity.min_participants:
        return {
            "is_available": False,
            "max_available_spots": 0,
            "requested_participants": requested_participants,
            "limiting_factor": "MIN_PARTICIPANTS",
            "limiting_message": f"This activity requires at least {activity.min_participants} participant(s).",
            "breakdown": breakdown,
        }

    # Active bookings in this time slot for this activity
    slot_filter = [
        Booking.booking_type == "ACTIVITY",
        Booking.booking_date == b_date,
        or_(
            Booking.event_type == f"ACT_{activity.id}",
            Booking.event_type == activity.title,
            Booking.cabin_type.like(f"ACT:{activity.id}:%"),
            Booking.cabin_type == f"Slot: {activity.title}",
        ),
        Booking.status.in_(["CONFIRMED", "PENDING", "IN_PROGRESS"]),
        or_(
            and_(Booking.start_time <= start_t, Booking.end_time > start_t),
            and_(Booking.start_time < end_t, Booking.end_time >= end_t),
            and_(Booking.start_time >= start_t, Booking.end_time <= end_t),
        ),
    ]
    if exclude_booking_id:
        slot_filter.append(Booking.id != exclude_booking_id)

    concurrent_act_bookings = db.query(Booking).filter(*slot_filter).all()
    slot_already_booked = sum(b.number_of_people for b in concurrent_act_bookings)
    slot_remaining = max(0, activity.capacity_per_slot - slot_already_booked)

    breakdown["activity_slot"] = {
        "capacity_per_slot": activity.capacity_per_slot,
        "already_booked": slot_already_booked,
        "remaining_spots": slot_remaining,
        "groups_count": len(concurrent_act_bookings),
    }

    if slot_remaining < requested_participants:
        return {
            "is_available": False,
            "max_available_spots": slot_remaining,
            "requested_participants": requested_participants,
            "limiting_factor": "ACTIVITY_SLOT_CAPACITY",
            "limiting_message": (
                f"Slot full: Only {slot_remaining} spot(s) remaining for {time_slot} on {b_date} "
                f"(Max slot capacity: {activity.capacity_per_slot} participants, currently {slot_already_booked} booked)."
            ),
            "breakdown": breakdown,
        }

    # -------------------------------------------------------------
    # 2. VESSEL CAPACITY & OPERATIONAL STATUS CHECK
    # -------------------------------------------------------------
    vessel_remaining = 9999
    host_vessel = activity.host_ship
    if host_vessel:
        # Check vessel operational status
        if host_vessel.availability_status not in ["AVAILABLE", "Available"]:
            return {
                "is_available": False,
                "max_available_spots": 0,
                "requested_participants": requested_participants,
                "limiting_factor": "VESSEL_STATUS",
                "limiting_message": f"Assigned vessel '{host_vessel.name}' is currently unavailable ({host_vessel.availability_status}).",
                "breakdown": breakdown,
            }

        # Check drydock / maintenance periods
        maint_conflict = (
            db.query(ShipMaintenance)
            .filter(
                ShipMaintenance.ship_id == host_vessel.id,
                ShipMaintenance.start_date <= b_date,
                ShipMaintenance.end_date >= b_date,
            )
            .first()
        )
        if maint_conflict:
            return {
                "is_available": False,
                "max_available_spots": 0,
                "requested_participants": requested_participants,
                "limiting_factor": "VESSEL_MAINTENANCE",
                "limiting_message": f"Assigned vessel '{host_vessel.name}' is scheduled for drydock/maintenance ({maint_conflict.reason}) on {b_date}.",
                "breakdown": breakdown,
            }

        # Overlapping private charter conflict
        charter_conflict_filter = [
            Booking.cross_id == host_vessel.id,
            Booking.booking_type != "ACTIVITY",
            Booking.booking_date == b_date,
            Booking.status.in_(["CONFIRMED", "PENDING", "IN_PROGRESS"]),
            or_(
                and_(Booking.start_time <= start_t, Booking.end_time > start_t),
                and_(Booking.start_time < end_t, Booking.end_time >= end_t),
                and_(Booking.start_time >= start_t, Booking.end_time <= end_t),
            ),
        ]
        if exclude_booking_id:
            charter_conflict_filter.append(Booking.id != exclude_booking_id)

        charter_conflict = db.query(Booking).filter(*charter_conflict_filter).first()
        if charter_conflict:
            return {
                "is_available": False,
                "max_available_spots": 0,
                "requested_participants": requested_participants,
                "limiting_factor": "VESSEL_CHARTER_CONFLICT",
                "limiting_message": f"Double-booking prevented: Vessel '{host_vessel.name}' is chartered for a private event ({charter_conflict.event_type}) during {time_slot} on {b_date}.",
                "breakdown": breakdown,
            }

        # Vessel passenger capacity calculation
        vessel_all_bookings_filter = [
            Booking.cross_id == host_vessel.id,
            Booking.booking_date == b_date,
            Booking.status.in_(["CONFIRMED", "PENDING", "IN_PROGRESS"]),
            or_(
                and_(Booking.start_time <= start_t, Booking.end_time > start_t),
                and_(Booking.start_time < end_t, Booking.end_time >= end_t),
                and_(Booking.start_time >= start_t, Booking.end_time <= end_t),
            ),
        ]
        if exclude_booking_id:
            vessel_all_bookings_filter.append(Booking.id != exclude_booking_id)

        vessel_bookings = db.query(Booking).filter(*vessel_all_bookings_filter).all()
        vessel_booked_passengers = sum(b.number_of_people for b in vessel_bookings)
        vessel_remaining = max(0, host_vessel.capacity - vessel_booked_passengers)

        breakdown["vessel"] = {
            "vessel_id": host_vessel.id,
            "name": host_vessel.name,
            "vessel_capacity": host_vessel.capacity,
            "booked_passengers": vessel_booked_passengers,
            "remaining_seats": vessel_remaining,
            "status": host_vessel.availability_status,
        }

        if vessel_remaining < requested_participants:
            return {
                "is_available": False,
                "max_available_spots": vessel_remaining,
                "requested_participants": requested_participants,
                "limiting_factor": "VESSEL_CAPACITY",
                "limiting_message": (
                    f"Vessel capacity limit reached: Vessel '{host_vessel.name}' has only {vessel_remaining} seat(s) remaining for this session "
                    f"(Passenger capacity: {host_vessel.capacity}, currently carrying {vessel_booked_passengers} passengers across activities)."
                ),
                "breakdown": breakdown,
            }

    # -------------------------------------------------------------
    # 3. INSTRUCTOR & SUPERVISION CAPACITY CHECK
    # -------------------------------------------------------------
    # "Example: Ek scuba instructor ek hi time slot mein do alag groups ko supervise nahi kar sakta agar isse approved supervision limit exceed hoti hai."
    instructor_headroom = 9999
    assigned_staff: Optional[StaffMember] = None

    if activity.default_staff_id:
        assigned_staff = db.query(StaffMember).filter(StaffMember.id == activity.default_staff_id).first()

    # If no explicitly assigned staff, find an on-duty/active qualified instructor for this activity type/owner
    if not assigned_staff and activity.owner_id:
        act_slug = (activity.activity_type or "").lower()
        candidates = (
            db.query(StaffMember)
            .filter(
                StaffMember.owner_id == activity.owner_id,
                StaffMember.status.in_(["ACTIVE", "ON_DUTY"]),
                StaffMember.role.in_(["INSTRUCTOR", "GUIDE", "CAPTAIN"]),
            )
            .all()
        )
        for cand in candidates:
            assigned_types = [t.lower() for t in cand.assigned_activity_types]
            if not assigned_types or act_slug in assigned_types or "all" in assigned_types:
                assigned_staff = cand
                break

    if assigned_staff:
        # Check if staff is on leave
        if assigned_staff.status in ["ON_LEAVE", "INACTIVE"]:
            return {
                "is_available": False,
                "max_available_spots": 0,
                "requested_participants": requested_participants,
                "limiting_factor": "INSTRUCTOR_UNAVAILABLE",
                "limiting_message": f"Certified {assigned_staff.role.lower()} '{assigned_staff.name}' is currently {assigned_staff.status.lower()} and unavailable.",
                "breakdown": breakdown,
            }

        # Check total participants this instructor is already supervising in this time slot across ALL groups/activities
        # Find activities linked to this staff or belonging to same owner with this instructor
        instructor_bookings_filter = [
            Booking.booking_type == "ACTIVITY",
            Booking.booking_date == b_date,
            Booking.status.in_(["CONFIRMED", "PENDING", "IN_PROGRESS"]),
            or_(
                and_(Booking.start_time <= start_t, Booking.end_time > start_t),
                and_(Booking.start_time < end_t, Booking.end_time >= end_t),
                and_(Booking.start_time >= start_t, Booking.end_time <= end_t),
            ),
        ]
        if exclude_booking_id:
            instructor_bookings_filter.append(Booking.id != exclude_booking_id)

        # Get all activity bookings in this time slot
        active_slot_bookings = db.query(Booking).filter(*instructor_bookings_filter).all()

        # Filter bookings handled by this instructor
        instructor_supervised_count = 0
        overlapping_groups_count = 0
        for b in active_slot_bookings:
            # Check if this booking's activity maps to this instructor
            b_act_id = None
            if b.event_type and b.event_type.startswith("ACT_"):
                try:
                    b_act_id = int(b.event_type.replace("ACT_", ""))
                except Exception:
                    pass
            elif b.cabin_type and b.cabin_type.startswith("ACT:"):
                try:
                    b_act_id = int(b.cabin_type.split(":")[1])
                except Exception:
                    pass

            is_this_instructor = False
            if b_act_id and b_act_id == activity.id:
                is_this_instructor = True
            elif b_act_id:
                b_act = db.query(Activity.default_staff_id).filter(Activity.id == b_act_id).first()
                if b_act and b_act[0] == assigned_staff.id:
                    is_this_instructor = True

            if is_this_instructor:
                instructor_supervised_count += (b.number_of_people or 1)
                overlapping_groups_count += 1

        instructor_headroom = max(0, assigned_staff.max_supervision_limit - instructor_supervised_count)

        breakdown["instructor"] = {
            "staff_id": assigned_staff.id,
            "name": assigned_staff.name,
            "role": assigned_staff.role,
            "certifications": assigned_staff.certifications,
            "max_supervision_limit": assigned_staff.max_supervision_limit,
            "currently_supervising": instructor_supervised_count,
            "overlapping_groups": overlapping_groups_count,
            "headroom_spots": instructor_headroom,
        }

        # If adding requested_participants exceeds supervision limit
        if instructor_supervised_count + requested_participants > assigned_staff.max_supervision_limit:
            return {
                "is_available": False,
                "max_available_spots": instructor_headroom,
                "requested_participants": requested_participants,
                "limiting_factor": "INSTRUCTOR_SUPERVISION_LIMIT",
                "limiting_message": (
                    f"Supervision safety limit exceeded: Certified {assigned_staff.role.lower()} '{assigned_staff.name}' "
                    f"is already supervising {instructor_supervised_count} participant(s) in {overlapping_groups_count} group(s) "
                    f"for this time slot. Maximum approved supervision limit is {assigned_staff.max_supervision_limit} participants per session. "
                    f"Only {instructor_headroom} spot(s) remaining under safe supervision."
                ),
                "breakdown": breakdown,
            }

    # -------------------------------------------------------------
    # 4. EQUIPMENT INVENTORY & CONDITION CHECK
    # -------------------------------------------------------------
    equip_available = 9999
    needed_cat = activity.required_equipment_category or ACTIVITY_EQUIPMENT_MAP.get(activity.activity_type.upper(), None)

    if needed_cat and activity.owner_id:
        units_per_person = activity.equipment_units_per_participant or 1
        required_units = requested_participants * units_per_person

        # Query all equipment of this category for the owner
        equip_items = (
            db.query(EquipmentItem)
            .filter(
                EquipmentItem.owner_id == activity.owner_id,
                EquipmentItem.category == needed_cat,
            )
            .all()
        )

        if equip_items:
            operational_units = sum(e.total_quantity for e in equip_items if e.condition_status == "OPERATIONAL")
            maintenance_units = sum(e.total_quantity for e in equip_items if e.condition_status in ["MAINTENANCE", "RETIRED"])

            # Find units currently in use in this time slot across active activity bookings
            equip_in_use = slot_already_booked * units_per_person
            equip_available = max(0, operational_units - equip_in_use)

            breakdown["equipment"] = {
                "category": needed_cat,
                "operational_units": operational_units,
                "in_maintenance": maintenance_units,
                "currently_in_use": equip_in_use,
                "available_units": equip_available,
                "units_required_per_participant": units_per_person,
            }

            if equip_available < required_units:
                max_people_equip = equip_available // units_per_person
                return {
                    "is_available": False,
                    "max_available_spots": max_people_equip,
                    "requested_participants": requested_participants,
                    "limiting_factor": "EQUIPMENT_STOCK",
                    "limiting_message": (
                        f"Equipment shortage: Only {equip_available} operational unit(s) of {needed_cat.replace('_', ' ').title()} "
                        f"available for this session ({maintenance_units} unit(s) currently under safety maintenance/inspection). "
                        f"Required: {required_units} unit(s)."
                    ),
                    "breakdown": breakdown,
                }

    # -------------------------------------------------------------
    # 5. LIFE JACKETS MANDATORY SAFETY CHECK
    # -------------------------------------------------------------
    # All marine water sports activities require verified life jackets
    if activity.owner_id:
        lifejackets = (
            db.query(EquipmentItem)
            .filter(
                EquipmentItem.owner_id == activity.owner_id,
                EquipmentItem.category == "LIFE_JACKET",
            )
            .all()
        )
        if lifejackets:
            operational_lj = sum(e.total_quantity for e in lifejackets if e.condition_status == "OPERATIONAL")
            in_maintenance_lj = sum(e.total_quantity for e in lifejackets if e.condition_status in ["MAINTENANCE", "RETIRED"])
            # Total participants on water in this slot for this owner
            total_water_participants = slot_already_booked + requested_participants
            breakdown["life_jackets"] = {
                "operational": operational_lj,
                "in_maintenance": in_maintenance_lj,
                "needed": total_water_participants,
                "compliant": operational_lj >= total_water_participants,
            }
            if operational_lj < total_water_participants:
                return {
                    "is_available": False,
                    "max_available_spots": max(0, operational_lj - slot_already_booked),
                    "requested_participants": requested_participants,
                    "limiting_factor": "SAFETY_LIFE_JACKET_COMPLIANCE",
                    "limiting_message": (
                        f"Maritime Safety Compliance Alert: Fleet has only {operational_lj} operational life jackets "
                        f"({in_maintenance_lj} under maintenance/restocking). Total guests on water would be {total_water_participants}."
                    ),
                    "breakdown": breakdown,
                }

    # -------------------------------------------------------------
    # 6. COMBINED CAPACITY AGGREGATION
    # -------------------------------------------------------------
    max_spots = min(
        slot_remaining,
        vessel_remaining,
        instructor_headroom,
        (equip_available // (activity.equipment_units_per_participant or 1)) if needed_cat else 9999
    )

    return {
        "is_available": True,
        "max_available_spots": max_spots,
        "requested_participants": requested_participants,
        "limiting_factor": None,
        "limiting_message": f"Confirmed available: Up to {max_spots} spot(s) available for {time_slot} on {b_date}.",
        "breakdown": breakdown,
    }
