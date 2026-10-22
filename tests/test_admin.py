import pytest


def test_admin_dashboard_and_analytics(client):
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})

    # Dashboard overview
    dash_res = client.get("/api/admin/dashboard/")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "stats" in dash_data
    assert "kpis" in dash_data
    assert "analytics" in dash_data

    # Analytics 10 KPIs and 10 charts
    for rng in ["7d", "30d", "6m", "1y", "all"]:
        ana_res = client.get(f"/api/admin/analytics/?range={rng}")
        assert ana_res.status_code == 200
        data = ana_res.json()
        assert data["success"] is True
        assert "kpis" in data
        assert "charts" in data
        charts = data["charts"]
        assert "revenue_trend" in charts
        assert "platform_profit_trend" in charts
        assert "bookings_private_vs_public" in charts
        assert "ship_performance" in charts
        assert "destination_analysis" in charts
        assert "public_tour_occupancy" in charts
        assert "booking_status_breakdown" in charts
        assert "revenue_by_ship" in charts
        assert "revenue_by_destination" in charts
        assert "monthly_growth" in charts


def test_admin_management_endpoints(client):
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})

    # User management
    users_res = client.get("/api/admin/users/")
    assert users_res.status_code == 200
    users_data = users_res.json()
    assert "users" in users_data
    assert "stats" in users_data
    assert "pagination" in users_data

    # Ships management
    ships_res = client.get("/api/admin/ships/")
    assert ships_res.status_code == 200
    assert "ships" in ships_res.json()

    # Transactions ledger
    txns_res = client.get("/api/admin/transactions/")
    assert txns_res.status_code == 200
    assert "transactions" in txns_res.json()

    # Notifications center
    notifs_res = client.get("/api/admin/notifications/")
    assert notifs_res.status_code == 200
    assert "notifications" in notifs_res.json()

    # Operators management
    ops_res = client.get("/api/admin/operators/")
    assert ops_res.status_code == 200
    assert "operators" in ops_res.json()


def test_admin_reports_generation(client):
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})

    for r_type in ["financial_ledger", "bookings_manifest", "fleet_performance"]:
        rep_res = client.get(f"/api/admin/reports/generate/?report_type={r_type}&preset=last_30_days")
        assert rep_res.status_code == 200
        rep_data = rep_res.json()
        assert "columns" in rep_data
        assert "rows" in rep_data
        assert "summary" in rep_data


def test_new_items_sorted_at_top(client):
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})

    # 1. Create a new ship and verify it appears at index 0
    ship_payload = {
        "action": "create_ship",
        "name": "Zephyr Alpha Royal Yacht",
        "category": "YACHT",
        "location": "Goa",
        "price": 45000,
        "capacity": 20
    }
    ship_res = client.post("/api/admin/ships/", json=ship_payload)
    assert ship_res.status_code == 200
    created_ship_id = ship_res.json()["ship"]["id"]

    all_ships_res = client.get("/api/admin/ships/")
    assert all_ships_res.status_code == 200
    ships_list = all_ships_res.json()["ships"]
    assert ships_list[0]["id"] == created_ship_id

    # 2. Create a new tour and verify it appears at index 0
    from datetime import date, timedelta
    tour_payload = {
        "ship_id": created_ship_id,
        "tour_title": "Grand Horizon Sunset Voyage",
        "departure_port": "Panaji Jetty",
        "destination": "Grand Island",
        "departure_date": (date.today() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "departure_time": "17:00",
        "return_date": (date.today() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "return_time": "20:00",
        "adult_price": 5500,
        "total_capacity": 20
    }
    tour_res = client.post("/api/operator/tours/", json=tour_payload)
    assert tour_res.status_code == 200
    created_tour_id = tour_res.json()["tour"]["id"]

    all_tours_res = client.get("/api/admin/tours/")
    assert all_tours_res.status_code == 200
    tours_list = all_tours_res.json()["tours"]
    assert tours_list[0]["id"] == created_tour_id

    # 3. Create a booking and verify it appears at index 0 in user's my-bookings and admin bookings
    client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})
    book_payload = {
        "booking_type": "TOUR",
        "public_tour_id": created_tour_id,
        "adults_count": 2
    }
    book_res = client.post("/api/bookings/create/", json=book_payload)
    assert book_res.status_code == 200
    created_booking_id = book_res.json()["booking"]["booking_id"]

    my_b_res = client.get("/api/bookings/my-bookings/")
    assert my_b_res.status_code == 200
    my_bookings = my_b_res.json()["bookings"]
    assert my_bookings[0]["booking_id"] == created_booking_id

    # Admin check
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})
    admin_b_res = client.get("/api/admin/bookings/")
    assert admin_b_res.status_code == 200
    admin_bookings = admin_b_res.json()["bookings"]
    assert admin_bookings[0]["booking_id"] == created_booking_id

    # Clean up test booking, tour, and ship
    from backend.app.database.session import SessionLocal
    from backend.app.models.booking import Booking
    from backend.app.models.tour import PublicTour
    from backend.app.models.cross import Cross
    db = SessionLocal()
    b = db.query(Booking).filter(Booking.booking_id == created_booking_id).first()
    if b:
        db.delete(b)
    t = db.query(PublicTour).filter(PublicTour.id == created_tour_id).first()
    if t:
        db.delete(t)
    s = db.query(Cross).filter(Cross.id == created_ship_id).first()
    if s:
        db.delete(s)
    db.commit()
    db.close()


def test_ship_revoke_action_deactivates_without_altering_approval(client):
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})

    # 1. Create a test ship
    ship_res = client.post("/api/admin/ships/", json={
        "action": "create_ship",
        "name": "Revoke Test Vessel",
        "category": "YACHT",
        "location": "Goa",
        "price": 20000,
        "capacity": 10
    })
    assert ship_res.status_code == 200
    ship_id = ship_res.json()["ship"]["id"]

    from backend.app.database.session import SessionLocal
    from backend.app.models.cross import Cross
    db = SessionLocal()
    s = db.query(Cross).filter(Cross.id == ship_id).first()
    s.is_approved = True
    s.is_active = True
    db.commit()
    db.close()

    # 2. Call action "revoke"
    revoke_res = client.post("/api/admin/ships/", json={"ship_id": ship_id, "action": "revoke"})
    assert revoke_res.status_code == 200
    assert revoke_res.json()["is_active"] is False
    assert revoke_res.json()["is_approved"] is True

    db = SessionLocal()
    s = db.query(Cross).filter(Cross.id == ship_id).first()
    # Approval must NOT change (stays True)
    assert s.is_approved is True
    # Active must become False (unactive)
    assert s.is_active is False

    # 3. Clean up
    db.delete(s)
    db.commit()
    db.close()

