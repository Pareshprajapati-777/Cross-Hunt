import os
from pathlib import Path
from typing import List, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cross-Hunt API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    SECRET_KEY: str = os.environ.get(
        "SECRET_KEY",
        "django-insecure-vkumzh782d8x6&4v#0l_-yvz5pn4h+rpfbp9i%3o7m6dgd(*8n"
    )
    DEBUG: bool = True

    # Root db.sqlite3 path
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    )

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        # Fix Render/Heroku postgres:// -> postgresql:// for SQLAlchemy compatibility
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        # Auto-detect Render/Docker persistent disk mount if available (/data or PERSISTENT_DATA_DIR)
        if "sqlite" in url:
            persistent_dir = os.environ.get("PERSISTENT_DATA_DIR") or ("/data" if Path("/data").exists() else None)
            if persistent_dir:
                p_path = Path(persistent_dir) / "db.sqlite3"
                url = f"sqlite:///{p_path}"
        return url

    # Static & Media directories
    MEDIA_DIR: Path = BASE_DIR / "media"
    STATIC_DIR: Path = BASE_DIR / "static"

    # CORS
    CORS_ORIGINS: Any = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                import json
                try:
                    return json.loads(v_str)
                except Exception:
                    pass
            return [i.strip() for i in v_str.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
        ]

    @property
    def cors_origins_list(self) -> List[str]:
        return self.CORS_ORIGINS

    # Session & Cookie config
    SESSION_COOKIE_NAME: str = "sessionid"
    CSRF_COOKIE_NAME: str = "csrftoken"
    SESSION_MAX_AGE_DAYS: int = 14

    # AI Configuration (Dolphin AI 🐬)
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    # WhatsApp Business API Configuration
    WHATSAPP_API_ENABLED: bool = os.environ.get("WHATSAPP_API_ENABLED", "True").lower() in ("true", "1")
    WHATSAPP_API_PROVIDER: str = os.environ.get("WHATSAPP_API_PROVIDER", "META_CLOUD")
    WHATSAPP_API_TOKEN: str = os.environ.get("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_REMINDER_HOURS_BEFORE: int = int(os.environ.get("WHATSAPP_REMINDER_HOURS_BEFORE", 24))

    # Razorpay & Online UPI Payment Gateway
    RAZORPAY_KEY_ID: str = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_CrossHuntMaritime")
    RAZORPAY_KEY_SECRET: str = os.environ.get("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_MERCHANT_NAME: str = os.environ.get("RAZORPAY_MERCHANT_NAME", "Cross Hunt Maritime")
    RAZORPAY_UPI_ID: str = os.environ.get("RAZORPAY_UPI_ID", "crosshunt@razorpay")

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
