from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from backend.app.core.cache import cache
from backend.app.database.session import get_db
from backend.app.models.tour import PublicTour
from backend.app.services.serializers import serialize_tour

router = APIRouter(prefix="/tours", tags=["Public Tours"])


@router.get("/")
async def api_tour_list(
    destination: Optional[str] = None,
    departure_port: Optional[str] = None,
    date: Optional[str] = None,
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cache_key = f"tours_list:{destination}:{departure_port}:{date}:{q}:{sort_by}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    query = db.query(PublicTour).filter(PublicTour.is_published == True).options(
        joinedload(PublicTour.ship),
        joinedload(PublicTour.operator)
    )

    # 1. Destination filter with smart location alias resolution
    if destination and destination.strip() and destination.lower() not in ("all", "undefined", "null", "any"):
        dest_val = destination.strip()
        dest_lower = dest_val.lower()
        if any(k in dest_lower for k in ["goa", "mandovi"]):
            query = query.filter(
                or_(
                    PublicTour.destination.ilike("%goa%"),
                    PublicTour.destination.ilike("%mandovi%"),
                    PublicTour.destination.ilike("%aguada%"),
                    PublicTour.destination.ilike("%karwar%"),
                    PublicTour.departure_port.ilike("%goa%"),
                    PublicTour.departure_port.ilike("%panaji%"),
                )
            )
        elif any(k in dest_lower for k in ["lakshadweep", "kadmat", "kavaratti"]):
            query = query.filter(
                or_(
                    PublicTour.destination.ilike("%lakshadweep%"),
                    PublicTour.destination.ilike("%kadmat%"),
                    PublicTour.destination.ilike("%kavaratti%"),
                    PublicTour.tour_title.ilike("%lakshadweep%"),
                )
            )
        elif any(k in dest_lower for k in ["kochi", "cochin", "kerala"]):
            query = query.filter(
                or_(
                    PublicTour.destination.ilike("%kochi%"),
                    PublicTour.destination.ilike("%cochin%"),
                    PublicTour.departure_port.ilike("%kochi%"),
                    PublicTour.departure_port.ilike("%cochin%"),
                )
            )
        elif any(k in dest_lower for k in ["andaman", "havelock", "swaraj", "port blair"]):
            query = query.filter(
                or_(
                    PublicTour.destination.ilike("%swaraj%"),
                    PublicTour.destination.ilike("%havelock%"),
                    PublicTour.destination.ilike("%andaman%"),
                    PublicTour.destination.ilike("%ross%"),
                    PublicTour.destination.ilike("%neil%"),
                    PublicTour.departure_port.ilike("%port blair%"),
                )
            )
        elif any(k in dest_lower for k in ["mumbai", "arabian"]):
            query = query.filter(
                or_(
                    PublicTour.destination.ilike("%mumbai%"),
                    PublicTour.destination.ilike("%arabian%"),
                    PublicTour.departure_port.ilike("%mumbai%"),
                )
            )
        else:
            query = query.filter(PublicTour.destination.ilike(f"%{dest_val}%"))

    # 2. Departure Port filter with smart jetty/wharf alias resolution
    if departure_port and departure_port.strip() and departure_port.lower() not in ("all", "undefined", "null", "any"):
        port_val = departure_port.strip()
        port_lower = port_val.lower()
        if any(k in port_lower for k in ["panaji", "goa", "betim", "patto", "santa monica", "mormugao"]):
            query = query.filter(
                or_(
                    PublicTour.departure_port.ilike("%panaji%"),
                    PublicTour.departure_port.ilike("%goa%"),
                    PublicTour.departure_port.ilike("%betim%"),
                    PublicTour.departure_port.ilike("%mormugao%"),
                    PublicTour.departure_port.ilike("%santa monica%"),
                    PublicTour.departure_port.ilike("%patto%"),
                )
            )
        elif any(k in port_lower for k in ["mumbai", "bombay"]):
            query = query.filter(PublicTour.departure_port.ilike("%mumbai%"))
        elif any(k in port_lower for k in ["kochi", "cochin", "marine drive", "willingdon"]):
            query = query.filter(
                or_(
                    PublicTour.departure_port.ilike("%kochi%"),
                    PublicTour.departure_port.ilike("%cochin%"),
                    PublicTour.departure_port.ilike("%marine drive%"),
                    PublicTour.departure_port.ilike("%willingdon%"),
                )
            )
        elif any(k in port_lower for k in ["port blair", "andaman", "phoenix bay", "haddo"]):
            query = query.filter(
                or_(
                    PublicTour.departure_port.ilike("%port blair%"),
                    PublicTour.departure_port.ilike("%phoenix bay%"),
                    PublicTour.departure_port.ilike("%haddo%"),
                    PublicTour.departure_port.ilike("%andaman%"),
                )
            )
        elif any(k in port_lower for k in ["swaraj dweep", "havelock"]):
            query = query.filter(
                or_(
                    PublicTour.departure_port.ilike("%swaraj%"),
                    PublicTour.destination.ilike("%swaraj%"),
                    PublicTour.destination.ilike("%havelock%"),
                )
            )
        else:
            query = query.filter(PublicTour.departure_port.ilike(f"%{port_val}%"))

    # 3. Departure Date filter
    if date and date.strip():
        query = query.filter(PublicTour.departure_date >= date.strip())

    # 4. Search query (title, destination, port, operator, ship, highlights)
    if q and q.strip():
        from backend.app.models.operator import Operator
        from backend.app.models.cross import Cross

        q_term = q.strip()
        query = query.outerjoin(PublicTour.operator).outerjoin(PublicTour.ship).filter(
            or_(
                PublicTour.tour_title.ilike(f"%{q_term}%"),
                PublicTour.destination.ilike(f"%{q_term}%"),
                PublicTour.departure_port.ilike(f"%{q_term}%"),
                PublicTour.itinerary.ilike(f"%{q_term}%"),
                PublicTour.meals_included.ilike(f"%{q_term}%"),
                PublicTour.ports_of_call.ilike(f"%{q_term}%"),
                Operator.name.ilike(f"%{q_term}%"),
                Cross.name.ilike(f"%{q_term}%"),
            )
        )

    # 5. Sorting
    if sort_by == "price_asc":
        query = query.order_by(PublicTour.adult_price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(PublicTour.adult_price.desc())
    elif sort_by == "date_desc":
        query = query.order_by(PublicTour.departure_date.desc())
    elif sort_by == "seats_desc":
        query = query.order_by(PublicTour.remaining_capacity.desc())
    elif sort_by == "duration_desc":
        query = query.order_by(PublicTour.duration_days.desc())
    else:  # default date_asc
        query = query.order_by(PublicTour.departure_date.asc(), PublicTour.id.asc())

    tours = query.all()
    serialized = [serialize_tour(t) for t in tours]

    result = {
        "tours": serialized,
        "total": len(serialized)
    }
    cache.set(cache_key, result, ttl=60)
    return result


@router.get("/{slug}/")
async def api_tour_detail(slug: str, db: Session = Depends(get_db)):
    cached_detail = cache.get(f"tour_detail:{slug}")
    if cached_detail is not None:
        return cached_detail

    query = db.query(PublicTour).options(
        joinedload(PublicTour.ship),
        joinedload(PublicTour.operator)
    )
    tour = query.filter(PublicTour.slug == slug).first()
    if not tour and slug.isdigit():
        tour = query.filter(PublicTour.id == int(slug)).first()

    if not tour:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tour '{slug}' not found."
        )

    data = serialize_tour(tour)
    resp = {"tour": data, **data}
    cache.set(f"tour_detail:{slug}", resp, ttl=60)
    return resp
