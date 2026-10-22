import secrets
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.dependencies.auth import get_optional_user, get_current_user
from backend.app.schemas.auth import (
    LoginPayload,
    RegisterPayload,
    ProfileUpdatePayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _is_secure_request(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", "").lower()
    return proto == "https" or request.url.scheme == "https"


@router.get("/me/")
async def api_me(user: Optional[User] = Depends(get_optional_user)):
    if user:
        return {"authenticated": True, "user": user.to_dict()}
    return {"authenticated": False, "user": None}


@router.post("/login/")
async def api_login(
    payload: LoginPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    username_or_email = payload.username.strip()
    password = payload.password.strip()

    if not username_or_email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide username/email and password."
        )

    user = db.query(User).filter(
        or_(
            User.username.ilike(username_or_email),
            User.email.ilike(username_or_email)
        )
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials. User not found."
        )

    # Strictly verify password against stored password hash
    if not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password. Please check your credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact support."
        )

    token = create_access_token(user.id)

    # Set session cookies matching environment (samesite=none, secure=True for HTTPS Render/Vercel; lax for HTTP/localhost)
    is_https = _is_secure_request(request)
    cookie_samesite = "none" if is_https else "lax"
    cookie_secure = is_https

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_MAX_AGE_DAYS * 86400,
        httponly=False,
        samesite=cookie_samesite,
        secure=cookie_secure,
        path="/"
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=secrets.token_hex(16),
        max_age=settings.SESSION_MAX_AGE_DAYS * 86400,
        httponly=False,
        samesite=cookie_samesite,
        secure=cookie_secure,
        path="/"
    )

    return {
        "success": True,
        "message": f"Welcome back, {user.first_name or user.username}!",
        "user": user.to_dict(),
        "token": token
    }


@router.post("/register/")
async def api_register(
    payload: RegisterPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    username = payload.username.strip()
    email = payload.email.strip().lower()
    password = payload.password.strip()
    first_name = (payload.first_name or "").strip()
    last_name = (payload.last_name or "").strip()
    phone = (payload.phone or payload.phone_number or "").strip()
    raw_role = (payload.role or "USER").strip().upper()

    if not username or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, email, and password are required."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters."
        )

    if raw_role == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public registration for administrator role is strictly forbidden."
        )

    role = "OWNER" if raw_role in ("OWNER", "CROSS_OWNER") else "USER"

    if db.query(User).filter(User.username.ilike(username)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken."
        )

    if db.query(User).filter(User.email.ilike(email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    hashed_pw = get_password_hash(password)
    new_user = User(
        username=username,
        email=email,
        password=hashed_pw,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role=role,
        is_approved_owner=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    is_https = _is_secure_request(request)
    cookie_samesite = "none" if is_https else "lax"
    cookie_secure = is_https

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_MAX_AGE_DAYS * 86400,
        httponly=False,
        samesite=cookie_samesite,
        secure=cookie_secure,
        path="/"
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=secrets.token_hex(16),
        max_age=settings.SESSION_MAX_AGE_DAYS * 86400,
        httponly=False,
        samesite=cookie_samesite,
        secure=cookie_secure,
        path="/"
    )

    return {
        "success": True,
        "message": "Account created successfully!",
        "user": new_user.to_dict(),
        "token": token
    }


@router.post("/logout/")
async def api_logout(request: Request, response: Response):
    is_https = _is_secure_request(request)
    cookie_samesite = "none" if is_https else "lax"
    cookie_secure = is_https

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        samesite=cookie_samesite,
        secure=cookie_secure
    )
    response.delete_cookie(
        key=settings.CSRF_COOKIE_NAME,
        path="/",
        samesite=cookie_samesite,
        secure=cookie_secure
    )
    return {"success": True, "message": "Successfully logged out."}


@router.get("/profile/")
@router.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return {"user": user.to_dict()}


@router.put("/profile/")
@router.put("/profile")
async def update_profile(
    payload: ProfileUpdatePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()
    if payload.email is not None:
        user.email = payload.email.strip().lower()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    if payload.address is not None:
        user.address = payload.address.strip()
    if payload.password and len(payload.password.strip()) >= 6:
        user.password = get_password_hash(payload.password.strip())
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "user": user.to_dict()
    }


@router.post("/forgot-password/")
@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordPayload,
    db: Session = Depends(get_db)
):
    query = payload.username_or_email.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide your username or email."
        )

    user = db.query(User).filter(
        or_(
            User.username.ilike(query),
            User.email.ilike(query)
        )
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this username or email address."
        )

    email = user.email or ""
    masked_email = email
    if "@" in email:
        parts = email.split("@")
        if len(parts[0]) > 2:
            masked_email = f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}"
        else:
            masked_email = f"{parts[0][0]}***@{parts[1]}"

    return {
        "success": True,
        "message": "Account verified. You can now set your new password.",
        "username": user.username,
        "masked_email": masked_email,
    }


@router.post("/reset-password/")
@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordPayload,
    db: Session = Depends(get_db)
):
    query = payload.username_or_email.strip()
    new_pass = payload.new_password.strip()

    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required."
        )

    if len(new_pass) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters in length."
        )

    user = db.query(User).filter(
        or_(
            User.username.ilike(query),
            User.email.ilike(query)
        )
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this username or email address."
        )

    user.password = get_password_hash(new_pass)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Password successfully reset! Please sign in with your new password.",
        "username": user.username
    }

