from typing import Optional, List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_

from backend.app.core.cache import cache
from backend.app.database.session import get_db
from backend.app.models.cross import Cross
from backend.app.models.operator import Operator
from backend.app.schemas.cruise import MatchEnginePayload
from backend.app.services.serializers import serialize_cruise
from backend.app.services.trip_lifecycle_service import run_lifecycle_check_throttled

router = APIRouter(tags=["Cruises & Vessels"])


@router.get("/cruises/")
async def api_cruise_list(
    q: Optional[str] = None,
    destination: Optional[str] = None,
    category: Optional[str] = None,
    vessel_category: Optional[str] = None,
    listing_type: Optional[str] = None,
    city: Optional[str] = None,
    duration: Optional[str] = None,
    cabin: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    budget: Optional[float] = None,
    guests: Optional[int] = None,
    purpose: Optional[str] = None,
    date: Optional[str] = None,
    sort_by: Optional[str] = None,
    ordering: Optional[str] = None,
    db: Session = Depends(get_db)
):
    run_lifecycle_check_throttled(db)

    cache_key = f"cruises_list:{q}:{destination}:{category}:{vessel_category}:{listing_type}:{city}:{duration}:{cabin}:{min_price}:{max_price}:{budget}:{guests}:{purpose}:{date}:{sort_by}:{ordering}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    query = db.query(Cross).filter(Cross.is_active == True, Cross.is_approved == True).options(
        joinedload(Cross.operator),
        joinedload(Cross.owner),
        selectinload(Cross.extras),
        selectinload(Cross.charter_rates),
        selectinload(Cross.maintenance_periods),
        selectinload(Cross.reviews),
        selectinload(Cross.bookings)
    )

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.outerjoin(Operator, Cross.operator_id == Operator.id).filter(
            or_(
                Cross.name.ilike(term),
                Cross.location.ilike(term),
                Cross.destination.ilike(term),
                Cross.description.ilike(term),
                Cross.vessel_model.ilike(term),
                Cross.departure_port.ilike(term),
                Operator.name.ilike(term),
                Operator.location.ilike(term)
            )
        )

    loc = destination or city
    if loc and loc.strip() and loc.lower() not in ("all", "undefined", "null"):
        loc_term = loc.strip().lower()
        if "andaman" in loc_term or "port blair" in loc_term or "havelock" in loc_term:
            query = query.filter(
                or_(
                    Cross.location.ilike("%Andaman%"),
                    Cross.location.ilike("%Port Blair%"),
                    Cross.destination.ilike("%Andaman%"),
                    Cross.destination.ilike("%Havelock%"),
                    Cross.destination.ilike("%Neil%"),
                    Cross.departure_port.ilike("%Port Blair%"),
                    Cross.departure_port.ilike("%Havelock%"),
                    Cross.name.ilike("%Andaman%")
                )
            )
        elif "kochi" in loc_term or "kerala" in loc_term or "cochin" in loc_term:
            query = query.filter(
                or_(
                    Cross.location.ilike("%Kochi%"),
                    Cross.location.ilike("%Kerala%"),
                    Cross.location.ilike("%Cochin%"),
                    Cross.destination.ilike("%Kochi%"),
                    Cross.destination.ilike("%Cochin%"),
                    Cross.departure_port.ilike("%Kochi%"),
                    Cross.departure_port.ilike("%Cochin%")
                )
            )
        elif "mumbai" in loc_term or "bombay" in loc_term:
            query = query.filter(
                or_(
                    Cross.location.ilike("%Mumbai%"),
                    Cross.destination.ilike("%Mumbai%"),
                    Cross.departure_port.ilike("%Mumbai%")
                )
            )
        elif "goa" in loc_term or "panaji" in loc_term or "mandovi" in loc_term:
            query = query.filter(
                or_(
                    Cross.location.ilike("%Goa%"),
                    Cross.destination.ilike("%Goa%"),
                    Cross.destination.ilike("%Mandovi%"),
                    Cross.departure_port.ilike("%Goa%"),
                    Cross.departure_port.ilike("%Panaji%")
                )
            )
        elif "lakshadweep" in loc_term:
            query = query.filter(
                or_(
                    Cross.location.ilike("%Lakshadweep%"),
                    Cross.destination.ilike("%Lakshadweep%"),
                    Cross.departure_port.ilike("%Lakshadweep%")
                )
            )
        elif "international" in loc_term or "exotic" in loc_term:
            query = query.filter(
                ~Cross.location.ilike("%Goa%"),
                ~Cross.location.ilike("%Andaman%"),
                ~Cross.location.ilike("%Port Blair%"),
                ~Cross.location.ilike("%Kochi%"),
                ~Cross.location.ilike("%Mumbai%"),
                ~Cross.location.ilike("%Lakshadweep%")
            )
        else:
            query = query.filter(
                or_(
                    Cross.location.ilike(f"%{loc.strip()}%"),
                    Cross.destination.ilike(f"%{loc.strip()}%"),
                    Cross.departure_port.ilike(f"%{loc.strip()}%")
                )
            )

    cat = vessel_category or category
    if cat and cat.strip() and cat.lower() not in ("all", "undefined", "null"):
        cat_term = cat.strip().upper()
        if cat_term in ("PASSENGER_CRUISE_SHIP", "CRUISE_LINER", "CRUISE"):
            query = query.filter(
                or_(
                    Cross.category.ilike("%Cruise%"),
                    Cross.category.ilike("%Liner%"),
                    Cross.vessel_category.ilike("%Cruise%"),
                    Cross.vessel_category.ilike("%Liner%")
                )
            )
        elif cat_term == "YACHT":
            query = query.filter(
                or_(
                    Cross.category.ilike("%Yacht%"),
                    Cross.vessel_category.ilike("%Yacht%")
                )
            )
        elif cat_term == "BOAT":
            query = query.filter(
                or_(
                    Cross.category.ilike("%Boat%"),
                    Cross.vessel_category.ilike("%Boat%"),
                    Cross.category == "BOAT"
                )
            )
        elif cat_term == "PARTY_BOAT":
            query = query.filter(
                or_(
                    Cross.category.ilike("%Party%"),
                    Cross.vessel_category.ilike("%Party%"),
                    Cross.category == "PARTY_BOAT"
                )
            )
        elif cat_term == "RIVER_CRUISE":
            query = query.filter(
                or_(
                    Cross.category.ilike("%River%"),
                    Cross.vessel_category.ilike("%River%")
                )
            )
        elif cat_term == "SEA_CRUISE":
            query = query.filter(
                or_(
                    Cross.category.ilike("%Sea%"),
                    Cross.vessel_category.ilike("%Sea%"),
                    Cross.category.ilike("%Ocean%"),
                    Cross.vessel_category.ilike("%Ocean%")
                )
            )
        elif cat_term == "FERRY":
            query = query.filter(
                or_(
                    Cross.category.ilike("%Ferry%"),
                    Cross.vessel_category.ilike("%Ferry%")
                )
            )
        else:
            query = query.filter(
                or_(
                    Cross.category.ilike(f"%{cat.strip()}%"),
                    Cross.vessel_category.ilike(f"%{cat.strip()}%")
                )
            )

    if listing_type and listing_type.strip() and listing_type.lower() not in ("all", "undefined", "null"):
        lt = listing_type.strip().upper()
        if lt == "PRIVATE_CHARTER":
            query = query.filter(Cross.listing_type.in_(["PRIVATE_CHARTER", "BOTH"]))
        elif lt == "PUBLIC_CRUISE":
            query = query.filter(Cross.listing_type.in_(["PUBLIC_CRUISE", "BOTH"]))
        else:
            query = query.filter(Cross.listing_type.ilike(f"%{listing_type.strip()}%"))

    if min_price is not None and min_price > 0:
        query = query.filter(Cross.price >= Decimal(str(min_price)))

    eff_max = max_price if max_price is not None else budget
    if eff_max is not None and eff_max > 0:
        query = query.filter(Cross.price <= Decimal(str(eff_max)))

    if guests is not None and guests > 0:
        query = query.filter(Cross.capacity >= guests)

    cruises = query.all()

    # In-memory filter for purpose matching
    if purpose and purpose.strip():
        cruises = [c for c in cruises if c.supports_purpose(purpose)]

    # Sorting
    eff_sort = (sort_by or ordering or "popular").lower().strip()
    if eff_sort == "price_asc":
        # Vessels with actual prices first ascending; quote-based or 0 price at the end
        cruises = sorted(
            cruises,
            key=lambda c: (
                1 if (not c.price or float(c.price) <= 0 or c.is_quote_based) else 0,
                float(c.price or 0)
            )
        )
    elif eff_sort == "price_desc":
        # Vessels with actual prices first descending; quote-based or 0 price at the end
        cruises = sorted(
            cruises,
            key=lambda c: (
                0 if (c.price and float(c.price) > 0 and not c.is_quote_based) else 1,
                -float(c.price or 0)
            )
        )
    elif eff_sort == "capacity_asc":
        cruises = sorted(
            cruises,
            key=lambda c: (
                1 if (not c.capacity or c.capacity <= 0) else 0,
                c.capacity or 0
            )
        )
    elif eff_sort == "capacity_desc":
        cruises = sorted(cruises, key=lambda c: (c.capacity or 0), reverse=True)
    elif eff_sort == "rating_desc":
        cruises = sorted(
            cruises,
            key=lambda c: (float(c.average_rating or 0), len(c.reviews or [])),
            reverse=True
        )
    elif eff_sort == "name_asc":
        cruises = sorted(cruises, key=lambda c: (c.name or "").lower())
    else:  # "popular"
        cruises = sorted(
            cruises,
            key=lambda c: (
                len(c.bookings or []) * 10 + len(c.reviews or []) * 5 + float(c.average_rating or 4.5),
                float(c.capacity or 0)
            ),
            reverse=True
        )

    serialized = [serialize_cruise(c) for c in cruises]

    # Aggregates for filter trays
    destinations = sorted(list({c.destination for c in cruises if c.destination}))
    categories = sorted(list({c.effective_category for c in cruises if c.effective_category}))

    response_data = {
        "cruises": serialized,
        "total": len(serialized),
        "destinations": destinations,
        "categories": categories,
        "filters": {
            "destinations": destinations,
            "categories": categories,
            "durations": [1, 2, 3, 5, 7]
        }
    }
    cache.set(cache_key, response_data, ttl=60)
    return response_data


@router.post("/cruises/match/")
async def api_ship_match(
    payload: MatchEnginePayload,
    db: Session = Depends(get_db)
):
    cruises = db.query(Cross).filter(Cross.is_active == True, Cross.is_approved == True).all()

    req_purpose = payload.purpose
    req_guests = payload.guests or payload.passengers or 1
    req_budget = payload.budget
    req_loc = payload.location or payload.city or payload.destination

    exact_matches = []
    close_alternatives = []

    for c in cruises:
        reasons = []
        is_exact = True

        # Capacity check
        if c.capacity >= req_guests:
            reasons.append(f"Capacity: Accommodates up to {c.capacity} guests (Requested {req_guests})")
        else:
            is_exact = False

        # Budget check
        if req_budget and req_budget > 0:
            if c.price <= Decimal(str(req_budget)):
                reasons.append(f"Budget match: ₹{float(c.price):,.0f} fits within ₹{req_budget:,.0f}")
            else:
                is_exact = False

        # Purpose check
        if req_purpose:
            if c.supports_purpose(req_purpose):
                reasons.append(f"Specially equipped for {req_purpose}")
            else:
                is_exact = False

        # Location check
        if req_loc and req_loc.strip():
            if req_loc.lower() in (c.location or "").lower() or req_loc.lower() in (c.destination or "").lower():
                reasons.append(f"Port location match: {c.location}")
            else:
                is_exact = False

        c_data = serialize_cruise(c)
        c_data["match_reasons"] = reasons
        c_data["is_exact_match"] = is_exact

        if is_exact and len(reasons) >= 2:
            exact_matches.append(c_data)
        elif len(reasons) >= 1 or c.capacity >= req_guests:
            alt_notes = []
            if req_budget and c.price > Decimal(str(req_budget)):
                alt_notes.append(f"Slightly above budget (₹{float(c.price):,.0f}) but offers premium amenities")
            if c.capacity < req_guests:
                alt_notes.append(f"Capacity up to {c.capacity} guests")
            c_data["alternative_notes"] = alt_notes
            close_alternatives.append(c_data)

    results = exact_matches + close_alternatives

    return {
        "total_exact": len(exact_matches),
        "total_alternatives": len(close_alternatives),
        "exact_matches": exact_matches,
        "close_alternatives": close_alternatives,
        "alternatives": close_alternatives,
        "results": results
    }


@router.get("/cruises/{slug}/")
async def api_cruise_detail(slug: str, db: Session = Depends(get_db)):
    cached_detail = cache.get(f"cruise_detail:{slug}")
    if cached_detail is not None:
        return cached_detail

    query = db.query(Cross).options(
        joinedload(Cross.operator),
        joinedload(Cross.owner),
        selectinload(Cross.extras),
        selectinload(Cross.charter_rates),
        selectinload(Cross.maintenance_periods),
        selectinload(Cross.reviews),
        selectinload(Cross.gallery_images)
    )
    cruise = query.filter(Cross.slug == slug).first()
    if not cruise and slug.isdigit():
        cruise = query.filter(Cross.id == int(slug)).first()

    if not cruise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cruise ship '{slug}' not found."
        )

    data = serialize_cruise(cruise)
    resp = {"cruise": data, **data}
    cache.set(f"cruise_detail:{slug}", resp, ttl=60)
    return resp


@router.get("/operators/")
async def api_public_operators(db: Session = Depends(get_db)):
    operators = db.query(Operator).filter(Operator.verified == True).order_by(Operator.name).all()
    res = []
    for op in operators:
        d = op.to_dict()
        v_list = []
        for v in op.vessels:
            if v.is_active:
                v_list.append({
                    "id": v.id,
                    "name": v.name,
                    "slug": v.slug,
                    "category": v.effective_category,
                    "capacity": v.capacity,
                    "display_capacity_text": v.display_capacity_text,
                    "price": float(v.price),
                    "price_unit": v.price_unit,
                    "formatted_price_basis": v.formatted_price_basis,
                    "is_quote_based": bool(v.is_quote_based),
                    "source_url": v.source_url or "",
                    "verified": bool(v.is_approved),
                    "active": bool(v.is_active),
                })
        d["vessels"] = v_list
        d["tours_count"] = len(op.public_tours) if op.public_tours else 0
        res.append(d)

    return {"operators": res}
