import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.user import User
from backend.app.models.activity import Activity
from backend.app.dependencies.auth import get_current_user

client = TestClient(app)


def test_list_activities():
    resp = client.get("/api/activities/")
    assert resp.status_code == 200
    data = resp.json()
    assert "activities" in data
    assert data["total"] >= 1
    assert "categories" in data


def test_get_activity_detail():
    resp = client.get("/api/activities/grand-island-scuba-diving")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "grand-island-scuba-diving"
    assert "host_ship_name" in data
    assert "price" in data


def test_book_activity():
    db = SessionLocal()
    user = db.query(User).filter(User.role == "USER").first()
    act = db.query(Activity).first()

    app.dependency_overrides[get_current_user] = lambda: user

    payload = {
        "activity_id": act.id,
        "booking_date": "2026-11-25",
        "time_slot": "10:30 AM",
        "participants": 2,
        "customer_whatsapp": "+91 98200 12345",
        "special_request": "Automated activity booking test",
    }
    resp = client.post("/api/activities/book", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "booking" in data
    assert data["booking"]["activity_title"] == act.title
    assert data["booking"]["status"] == "CONFIRMED"

    app.dependency_overrides.clear()
    db.close()
