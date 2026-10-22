from datetime import date
from decimal import Decimal
from typing import Dict, Any
from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.offer import Offer

router = APIRouter(prefix="/offers", tags=["Offers & Coupons"])


@router.get("/")
async def api_offers_list(db: Session = Depends(get_db)):
    today = date.today()
    offers = db.query(Offer).filter(
        Offer.is_active == True,
        Offer.valid_to >= today
    ).order_by(Offer.discount_value.desc()).all()

    return {"offers": [o.to_dict() for o in offers]}


@router.post("/validate/")
async def api_validate_coupon(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    code = str(payload.get("code", "")).strip().upper()
    try:
        raw_amt = payload.get("amount") or payload.get("booking_amount") or payload.get("total_price") or 0.0
        amount = Decimal(str(raw_amt))
    except (ValueError, TypeError):
        amount = Decimal("0.00")

    if not code:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "error": "Coupon code is required."}
        )

    offer = db.query(Offer).filter(Offer.code.ilike(code), Offer.is_active == True).first()
    if not offer:
        return JSONResponse(
            status_code=404,
            content={"valid": False, "error": "Invalid or inactive promo coupon."}
        )

    today = date.today()
    if offer.valid_from > today or offer.valid_to < today:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "error": "This promotional offer has expired."}
        )

    if amount < offer.min_booking_amount:
        return JSONResponse(
            status_code=400,
            content={
                "valid": False,
                "error": f"Minimum booking amount for code {offer.code} is ₹{float(offer.min_booking_amount):,.0f}."
            }
        )

    discount = offer.calculate_discount(float(amount))
    net = max(Decimal("0.00"), amount - discount)

    return {
        "valid": True,
        "code": offer.code,
        "title": offer.title,
        "description": offer.description or "",
        "discount_amount": float(discount),
        "net_amount": float(net),
    }
