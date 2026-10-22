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


def test_user_review_complaint_and_admin_warn_owner(client):
    from backend.app.database.session import SessionLocal
    from backend.app.models.user import User
    from backend.app.models.cross import Cross
    from backend.app.models.booking import Booking, PlatformNotification
    from backend.app.models.offer import CrossReview
    import uuid

    db = SessionLocal()
    # 1. Create owner, customer, vessel, and booking
    owner = db.query(User).filter(User.role == "OWNER").first()
    from backend.app.core.security import get_password_hash
    if not owner:
        owner = User(
            username=f"owner_{uuid.uuid4().hex[:6]}",
            email=f"owner_{uuid.uuid4().hex[:6]}@example.com",
            role="OWNER",
            is_active=True,
            password=get_password_hash("Owner@12345")
        )
        db.add(owner)
        db.commit()
        db.refresh(owner)

    customer = User(
        username=f"cust_{uuid.uuid4().hex[:6]}",
        email=f"cust_{uuid.uuid4().hex[:6]}@example.com",
        role="CUSTOMER",
        is_active=True,
        password=get_password_hash("Cust@12345")
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    vessel = Cross(
        name=f"Complaint Test Yacht {uuid.uuid4().hex[:4]}",
        slug=f"complaint-yacht-{uuid.uuid4().hex[:6]}",
        category="YACHT",
        location="Goa",
        price=30000,
        capacity=15,
        is_active=True,
        is_approved=True,
        owner_id=owner.id
    )
    db.add(vessel)
    db.commit()
    db.refresh(vessel)

    import datetime
    b_id = f"CH-COMP-{uuid.uuid4().hex[:6].upper()}"
    booking = Booking(
        booking_id=b_id,
        user_id=customer.id,
        cross_id=vessel.id,
        booking_date=datetime.date.today(),
        start_time=datetime.time(10, 0),
        end_time=datetime.time(14, 0),
        booking_type="EVENT",
        status="CONFIRMED", # During travel
        base_price=30000,
        total_price=30000
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    customer_id = customer.id
    customer_username = customer.username
    vessel_id = vessel.id
    vessel_name = vessel.name
    owner_id = owner.id
    owner_display = owner.full_name or owner.username
    booking_id_val = booking.id
    db.close()

    # 2. Customer logs in and submits review with a formal complaint during travel
    client.post("/api/auth/login/", json={"username": customer_username, "password": "Cust@12345"})
    review_res = client.post(f"/api/bookings/{b_id}/review/", json={
        "rating": 2,
        "comment": "Crew was unhelpful and AC stopped functioning mid-voyage.",
        "has_complaint": True,
        "complaint_category": "Safety & Security Concerns",
        "complaint_text": "AC stopped working, heavy smoke smell in cabin, and crew ignored requests."
    })
    assert review_res.status_code == 200
    res_data = review_res.json()
    assert res_data["success"] is True
    review_id = res_data["review"]["id"]

    # Verify review in DB
    db = SessionLocal()
    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    assert r is not None
    assert r.has_complaint is True
    assert r.complaint_status == "PENDING"
    assert r.complaint_category == "Safety & Security Concerns"
    db.close()

    # 3. Admin logs in and checks reviews list
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})
    admin_rev_res = client.get("/api/admin/reviews/")
    assert admin_rev_res.status_code == 200
    admin_reviews = admin_rev_res.json()["reviews"]
    found = next((item for item in admin_reviews if item["id"] == review_id), None)
    assert found is not None
    assert found["has_complaint"] is True
    assert found["complaint_status"] == "PENDING"
    assert found["ship_name"] == vessel_name
    assert found["owner_name"] == owner_display

    # 4. Admin issues warning to ship owner
    warn_text = "Official Safety Notice: Please service vessel air conditioning and inspect cabin immediately."
    warn_res = client.post("/api/admin/reviews/warn-owner/", json={
        "review_id": review_id,
        "warning_message": warn_text
    })
    assert warn_res.status_code == 200
    assert warn_res.json()["success"] is True

    # 5. Verify review status updated to WARNING_SENT
    db = SessionLocal()
    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    assert r.complaint_status == "WARNING_SENT"
    assert r.warning_message == warn_text
    assert r.warning_sent_at is not None

    # 6. Verify PlatformNotification was created for the owner
    notif = db.query(PlatformNotification).filter(
        PlatformNotification.target_user_id == owner_id,
        PlatformNotification.notification_type == "COMPLAINT_WARNING"
    ).order_by(PlatformNotification.id.desc()).first()
    assert notif is not None
    assert warn_text in notif.message

    # Clean up test entities
    b_cleanup = db.query(Booking).filter(Booking.id == booking_id_val).first()
    v_cleanup = db.query(Cross).filter(Cross.id == vessel_id).first()
    c_cleanup = db.query(User).filter(User.id == customer_id).first()
    if r:
        db.delete(r)
    if b_cleanup:
        db.delete(b_cleanup)
    if v_cleanup:
        db.delete(v_cleanup)
    if notif:
        db.delete(notif)
    if c_cleanup:
        db.delete(c_cleanup)
    db.commit()
    db.close()


