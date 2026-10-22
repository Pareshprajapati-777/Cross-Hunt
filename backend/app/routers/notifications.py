import re
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import Optional, List, Dict, Any

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_optional_user, get_current_user
from backend.app.models.user import User
from backend.app.models.booking import PlatformNotification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/my-notifications/")
@router.get("/my-notifications")
def get_user_notifications(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {'notifications': [], 'unread_count': 0}

    # Match Django: Q(target_audience='ALL_USERS') | Q(target_user=request.user)
    # plus Q(target_audience='ALL_OWNERS') if owner
    conds = [
        PlatformNotification.target_audience == 'ALL_USERS',
        PlatformNotification.target_user_id == current_user.id
    ]
    if current_user.role in ['OWNER', 'CROSS_OWNER']:
        conds.append(PlatformNotification.target_audience == 'ALL_OWNERS')

    notifs = db.query(PlatformNotification).filter(or_(*conds)).order_by(desc(PlatformNotification.created_at), desc(PlatformNotification.id)).limit(25).all()
    unread_count = sum(1 for n in notifs if not n.is_read)

    data = []
    for n in notifs:
        code_match = re.search(r'(?:coupon\s+code|promo\s+code|promo\s+voucher|voucher|coupon|code)\s*[:\-]?\s*([A-Z0-9_-]{4,20})', f"{n.title} {n.message}", re.IGNORECASE)
        p_code = code_match.group(1).upper() if code_match else None

        data.append({
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'notification_type': n.notification_type,
            'action_link': n.action_link or '',
            'sender_name': n.sender_name,
            'is_read': n.is_read,
            'promo_code': p_code,
            'created_at': n.created_at.isoformat() if n.created_at else ''
        })

    return {'notifications': data, 'unread_count': unread_count}


@router.post("/{notification_id}/read/")
@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notif = db.query(PlatformNotification).filter(PlatformNotification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {'success': True}
