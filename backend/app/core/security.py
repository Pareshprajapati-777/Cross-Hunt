import base64
import hashlib
import hmac
import secrets
import time
from typing import Optional
import jwt
from backend.app.core.config import settings

ALGORITHM = "HS256"
DEFAULT_ITERATIONS = 1200000


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a password against Django's pbkdf2_sha256 hash format:
    pbkdf2_sha256$<iterations>$<salt>$<hash>
    Also supports bcrypt or plain fallback for admin convenience.
    """
    if not hashed_password or not plain_password:
        return False

    # Check for Django PBKDF2-SHA256 format
    if hashed_password.startswith("pbkdf2_sha256$"):
        parts = hashed_password.split("$")
        if len(parts) == 4:
            _, iters_str, salt, target_hash = parts
            try:
                iters = int(iters_str)
                derived = hashlib.pbkdf2_hmac(
                    "sha256",
                    plain_password.encode("utf-8"),
                    salt.encode("utf-8"),
                    iters
                )
                computed_hash = base64.b64encode(derived).decode("ascii")
                return hmac.compare_digest(computed_hash, target_hash)
            except Exception:
                return False

    # Check bcrypt if applicable
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            import bcrypt
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    # Direct fallback for development safety
    return hmac.compare_digest(plain_password, hashed_password)


def get_password_hash(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
    """
    Creates a password hash matching Django's standard pbkdf2_sha256 format.
    """
    salt = secrets.token_urlsafe(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations
    )
    b64_hash = base64.b64encode(derived).decode("ascii")
    return f"pbkdf2_sha256${iterations}${salt}${b64_hash}"


def create_access_token(user_id: int, expires_delta_days: int = 14) -> str:
    """
    Creates a signed JWT token used for cookies (sessionid) and Authorization Bearer headers.
    """
    now = int(time.time())
    expire = now + (expires_delta_days * 86400)
    to_encode = {
        "sub": str(user_id),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    """
    Decodes and validates a session/bearer token, returning the user_id or None.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is not None:
            return int(user_id_str)
    except Exception:
        pass
    return None


def slugify(value: str) -> str:
    """
    Generate an ASCII-only URL-safe slug from a string without requiring Django.
    
    """
    import re
    import unicodedata
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value)
