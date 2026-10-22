from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.cross import Cross
from backend.app.models.favorite import FavoriteShip
from backend.app.services.serializers import serialize_cruise

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("/")
@router.get("")
def get_user_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all favorited ships for the authenticated user."""
    favs = (
        db.query(FavoriteShip)
        .filter(FavoriteShip.user_id == user.id)
        .order_by(desc(FavoriteShip.created_at))
        .all()
    )

    results = []
    ship_ids = []
    for f in favs:
        if f.cruise:
            ship_ids.append(f.cruise_id)
            results.append({
                "id": f.id,
                "cruise_id": f.cruise_id,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "cruise": serialize_cruise(f.cruise),
            })

    return {
        "success": True,
        "count": len(results),
        "ship_ids": ship_ids,
        "favorites": results,
    }


@router.post("/toggle/{ship_id}/")
@router.post("/toggle/{ship_id}")
def toggle_favorite_ship(
    ship_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle a ship in user favorites. Requires authentication."""
    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel not found."
        )

    existing = (
        db.query(FavoriteShip)
        .filter(FavoriteShip.user_id == user.id, FavoriteShip.cruise_id == ship_id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return {
            "success": True,
            "favorited": False,
            "ship_id": ship_id,
            "message": f"'{ship.name}' removed from your favorites.",
        }
    else:
        new_fav = FavoriteShip(user_id=user.id, cruise_id=ship_id)
        db.add(new_fav)
        db.commit()
        return {
            "success": True,
            "favorited": True,
            "ship_id": ship_id,
            "message": f"'{ship.name}' added to your favorites.",
        }
