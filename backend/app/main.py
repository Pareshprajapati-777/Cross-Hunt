import sys
import os
from pathlib import Path

# Ensure project root and backend dir are in sys.path so 'backend.app' works in any environment (e.g. Render)
_app_dir = Path(__file__).resolve().parent
_backend_dir = _app_dir.parent
_project_root = _backend_dir.parent

for _p in [str(_project_root), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse

from backend.app.core.config import settings
from backend.app.database.base import Base
from backend.app.database.session import engine
import backend.app.models  # Ensure all models are registered
from backend.app.routers import (
    auth,
    cruises,
    tours,
    offers,
    events,
    bookings,
    operator,
    admin,
    notifications,
    ai,
    favorites,
    payments,
    activities,
)

# Ensure tables exist (e.g. user_favorites)
Base.metadata.create_all(bind=engine)

def ensure_db_migrations():
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "crosses_crossreview" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("crosses_crossreview")]
            new_columns = [
                ("has_complaint", "BOOLEAN DEFAULT 0 NOT NULL"),
                ("complaint_category", "VARCHAR(100) DEFAULT '' NOT NULL"),
                ("complaint_text", "TEXT DEFAULT '' NOT NULL"),
                ("complaint_status", "VARCHAR(50) DEFAULT 'NONE' NOT NULL"),
                ("warning_message", "TEXT DEFAULT '' NOT NULL"),
                ("warning_sent_at", "DATETIME NULL"),
                ("owner_response", "TEXT DEFAULT '' NOT NULL"),
                ("owner_response_at", "DATETIME NULL"),
            ]
            with engine.connect() as conn:
                for col_name, col_type in new_columns:
                    if col_name not in columns:
                        conn.execute(text(f"ALTER TABLE crosses_crossreview ADD COLUMN {col_name} {col_type}"))
                conn.commit()
    except Exception as e:
        pass

ensure_db_migrations()

# Synchronize real-time trip lifecycles on application boot
try:
    from backend.app.database.session import SessionLocal
    from backend.app.services.trip_lifecycle_service import auto_complete_trips
    with SessionLocal() as _db:
        auto_complete_trips(_db)
except Exception:
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Cross-Hunt India Ship & Cruise Rental Marketplace REST API (FastAPI + SQLAlchemy)",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware for React Vite frontend and local tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Subclass StaticFiles to set long-lived Cache-Control headers for images, fonts, and assets
class CachedStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"
        return response


# Mount Static and Media file directories using robust settings paths
media_path = settings.MEDIA_DIR
if media_path.exists():
    app.mount("/media", CachedStaticFiles(directory=str(media_path)), name="media")

static_path = settings.STATIC_DIR
if static_path.exists():
    app.mount("/static", CachedStaticFiles(directory=str(static_path)), name="static")

# Mount Routers under /api
api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(cruises.router, prefix=api_prefix)
app.include_router(tours.router, prefix=api_prefix)
app.include_router(offers.router, prefix=api_prefix)
app.include_router(events.router, prefix=api_prefix)
app.include_router(bookings.router, prefix=api_prefix)
app.include_router(operator.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)
app.include_router(favorites.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(activities.router, prefix=api_prefix)


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "api": "/api",
        "status": "healthy"
    }


@app.get("/api/health")
@app.get("/api/health/")
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "framework": "FastAPI",
        "version": settings.VERSION
    }
