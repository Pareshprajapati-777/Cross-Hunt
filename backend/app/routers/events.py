from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.cross import Cross

router = APIRouter(prefix="/events", tags=["Private Events"])


@router.get("/packages/")
async def api_event_packages(db: Session = Depends(get_db)):
    event_types = [
        {"id": "wedding", "name": "Ocean Wedding Ceremony & Gala", "icon": "Heart", "desc": "Say \"I do\" at sea under golden hour skies with luxury floral decor, mandap on observation deck, and five-course royal banquet."},
        {"id": "corporate", "name": "Corporate Leadership Summit", "icon": "Briefcase", "desc": "World-class conference at sea equipped with dual laser projection, satellite telepresence, and executive banquet lounge."},
        {"id": "birthday", "name": "Milestone Birthday & Private Party", "icon": "PartyPopper", "desc": "Unforgettable celebration with live DJ, signature cocktails, multi-tier birthday cake, and starlight deck access."},
        {"id": "anniversary", "name": "Luxury Anniversary Celebration", "icon": "Sparkles", "desc": "Romantic twilight charter with champagne reception, private acoustic quartet, and bespoke chef tasting menu."},
        {"id": "gala", "name": "Black-Tie Gala Dinner & Soiree", "icon": "Wine", "desc": "High-society maritime affair featuring red-carpet boarding, caviar bars, and aerial drone video coverage."},
    ]

    packages = [
        {
            "id": "diamond",
            "tier": "Diamond Horizon (Ultra-Luxury)",
            "base_fee": 45000.0,
            "per_guest_fee": 1400.0,
            "highlights": ["Exclusive Vessel Top-Deck Charter", "Five-Course Royal Plated Dinner", "Premium Open Bar with Champagne & Vintage Spirits", "Full Stage Sound, Lighting & Aerial Drone Videography", "Dedicated Master of Ceremonies & Butler Team"],
            "recommended_for": "Luxury Weddings, Grand Galas, Executive Summits",
        },
        {
            "id": "emerald",
            "tier": "Emerald Wave (Executive Class)",
            "base_fee": 28000.0,
            "per_guest_fee": 950.0,
            "highlights": ["Private Panorama Salon & Observation Lounge", "Four-Course Gourmet Coastal Buffet", "Curated Mocktail & Beverage Bar", "Audiovisual Rigs & Live Acoustic Duo", "Custom Themed Tablescape & Ambient Uplighting"],
            "recommended_for": "Milestone Birthdays, Corporate Dinners, Anniversaries",
        },
        {
            "id": "sapphire",
            "tier": "Sapphire Anchor (Signature)",
            "base_fee": 15000.0,
            "per_guest_fee": 650.0,
            "highlights": ["Private Sunset Terrace Access", "Hors d’Oeuvres & Gourmet Canapes Stations", "Three-Hour Welcome Beverage Service", "Integrated Sound System for Speeches & Playlists", "Professional Voyage Event Coordinator"],
            "recommended_for": "Private Cocktail Receptions, Seminars, Family Gatherings",
        },
    ]

    ships = db.query(Cross).filter(Cross.is_active == True).all()
    charter_ships = [
        {
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "category": s.effective_category,
            "capacity": s.capacity,
            "price": float(s.price),
            "location": s.location,
            "image": s.image or "",
            "departure_port": s.departure_port or s.location or "Harbor Terminal",
            "whatsapp_number": s.whatsapp_number or (s.owner.phone if s.owner and s.owner.phone else (s.operator.phone if s.operator and s.operator.phone else s.contact_number or "+919820012345")),
            "contact_number": s.contact_number or (s.owner.phone if s.owner and s.owner.phone else (s.operator.phone if s.operator and s.operator.phone else "+919820012345")),
            "owner_name": f"{s.owner.first_name} {s.owner.last_name}".strip() if s.owner and (s.owner.first_name or s.owner.last_name) else (s.operator.name if s.operator else "Vessel Operator"),
        } for s in ships
    ]

    return {
        "event_types": event_types,
        "packages": packages,
        "charter_ships": charter_ships,
    }
