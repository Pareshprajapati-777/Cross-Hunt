from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_optional_user
from backend.app.models.user import User
from backend.app.services.ai_service import generate_ai_chat_response, lookup_user_ticket

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat/")
@router.post("/chat")
async def ai_chat(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    messages = data.get('messages', [])
    current_path = data.get('current_path', '/')

    response = generate_ai_chat_response(
        db=db,
        messages=messages,
        user=current_user,
        current_path=current_path
    )

    return {
        'success': True,
        'reply': response.get('reply', ''),
        'actions': response.get('actions', []),
        'data': response.get('data', {})
    }


@router.post("/ticket-lookup/")
@router.post("/ticket-lookup")
async def ai_ticket_lookup(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    code = data.get('code') or data.get('ticket_code') or data.get('booking_id')
    if not code:
        raise HTTPException(status_code=400, detail="Ticket or booking code is required.")

    result = lookup_user_ticket(db=db, code=code, user=current_user)

    if not result.get('success'):
        status_code = 401 if result.get('requires_login') else (403 if result.get('error') == 'forbidden' else 404)
        return JSONResponse(status_code=status_code, content=result)

    return result


@router.get("/suggestions/")
@router.get("/suggestions")
def ai_suggestions(
    current_user: Optional[User] = Depends(get_optional_user)
):
    is_auth = current_user is not None
    suggestions = [
        {'id': 'my_ticket', 'label': '🎫 My Ticket', 'query': 'Mera ticket code check karo'},
        {'id': 'my_trips', 'label': '🚢 Upcoming Trips', 'query': 'Mera upcoming cruise kab hai?'},
        {'id': 'find_cruise', 'label': '🔎 Find Cruise', 'query': 'Mumbai se Goa public cruise dikhao'},
        {'id': 'private_yacht', 'label': '⚓ Private Charter', 'query': 'Goa me 20 guests ke liye private yacht chahiye'},
        {'id': 'cancel_policy', 'label': '❓ Cancel Policy', 'query': 'Booking cancellation aur refund policy kya hai?'},
        {'id': 'website_guide', 'label': '🗺️ Website Guide', 'query': 'Private ship kaha book karu?'},
    ]

    return {
        'success': True,
        'is_authenticated': is_auth,
        'suggestions': suggestions
    }
