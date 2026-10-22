from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.database.session import get_db
from backend.app.models.user import User


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """
    Retrieves the currently authenticated user from Authorization: Bearer token
    or session cookie (sessionid). Returns None if unauthenticated.
    """
    token: Optional[str] = None

    # 1. Prefer Authorization Bearer header (cross-domain robust)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    # 2. Fall back to session cookie
    if not token:
        token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    if not token:
        return None

    user_id = decode_access_token(token)
    if not user_id:
        # If the header token wasn't valid, try cookie as fallback
        cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
        if cookie_token and cookie_token != token:
            user_id = decode_access_token(cookie_token)
        if not user_id:
            return None

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def get_current_user(user: Optional[User] = Depends(get_optional_user)) -> User:
    """
    Ensures user is authenticated. Raises 401 Unauthorized if not.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to continue."
        )
    return user


def require_operator(user: User = Depends(get_current_user)) -> User:
    """
    Ensures user is an Operator or Platform Administrator. Raises 403 Forbidden if not.
    """
    if not user.is_operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Operator privileges required."
        )
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """
    Ensures user is a Platform Administrator. Raises 403 Forbidden if not.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Administrator privileges required."
        )
    return user
