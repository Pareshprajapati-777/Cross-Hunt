from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
from pathlib import Path
import os

from backend.app.core.config import settings
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
)

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

# Mount Static and Media file directories
media_path = Path("media")
if media_path.exists():
    app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

static_path = Path("static")
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

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
