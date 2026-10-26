import pytest


def test_operator_dashboard_and_features(client):
    # Login as operator/owner
    client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})

    # Dashboard overview
    dash_res = client.get("/api/operator/dashboard/")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "stats" in dash_data
    assert "earnings" in dash_data
    assert "owner_payout" in dash_data
    assert "analytics" in dash_data

    # Operator ships
    ships_res = client.get("/api/operator/ships/")
    assert ships_res.status_code == 200
    ships = ships_res.json()["ships"]
    assert len(ships) > 0
    test_ship = ships[0]

    # Availability timeline
    avail_res = client.get(f"/api/operator/ships/{test_ship['id']}/availability/")
    assert avail_res.status_code == 200
    assert len(avail_res.json()["timeline"]) == 30

    # Revenue report
    rev_res = client.get("/api/operator/revenue/")
    assert rev_res.status_code == 200
    assert "total_revenue" in rev_res.json()
    assert "by_ship" in rev_res.json()

    # Operator tours
    tours_res = client.get("/api/operator/tours/")
    assert tours_res.status_code == 200
    tours = tours_res.json()["tours"]
    if tours:
        # Check tour passenger manifest
        pass_res = client.get(f"/api/operator/tours/{tours[0]['id']}/passengers/")
        assert pass_res.status_code == 200
        assert "passengers" in pass_res.json()


def test_operator_booking_management_actions(client):
    # Login as operator/owner
    client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})

    dash_res = client.get("/api/operator/dashboard/")
    bookings = dash_res.json().get("recent_bookings", [])
    if not bookings:
        # Create an activity booking or private charter booking to test
        client.post("/api/auth/login/", json={"username": "testuser", "password": "User@12345"})
        book_res = client.post("/api/activities/book", json={
            "activity_id": 1,
            "booking_date": "2026-11-15",
            "time_slot": "10:30 AM",
            "participants": 2,
            "selected_addons": [],
            "payment_method": "UPI"
        })
        assert book_res.status_code == 200
        client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})
        dash_res = client.get("/api/operator/dashboard/")
        bookings = dash_res.json().get("recent_bookings", [])

    assert len(bookings) > 0
    test_b = bookings[0]
    b_id = test_b["booking_id"]

    # 1. Update Schedule
    sched_res = client.post(f"/api/operator/bookings/{b_id}/update-schedule", json={
        "booking_date": "2026-11-20",
        "start_time": "11:00 AM",
        "end_time": "01:00 PM",
        "reason": "Harbor slot optimization",
        "notify_customer": True
    })
    assert sched_res.status_code == 200
    assert sched_res.json()["success"] is True

    # 2. Weather-Related Reschedule
    weather_res = client.post(f"/api/operator/bookings/{b_id}/weather-reschedule", json={
        "new_date": "2026-11-22",
        "new_time_slot": "09:00 AM",
        "weather_condition": "High Wind & Sea Swell Alert (> 22 knots)",
        "customer_note": "Rescheduled for marine safety.",
        "notify_customer": True
    })
    assert weather_res.status_code == 200
    assert weather_res.json()["success"] is True
    assert weather_res.json()["booking"]["status"] == "CONFIRMED"

    # 3. Participant Count Verification
    part_res = client.post(f"/api/operator/bookings/{b_id}/update-participants", json={
        "number_of_people": 3,
        "adults_count": 2,
        "children_count": 1,
        "notes": "Verified at pier gate",
        "recalculate_price": False
    })
    assert part_res.status_code == 200
    assert part_res.json()["booking"]["number_of_people"] == 3

    # 4. Customer Messaging
    msg_res = client.post(f"/api/operator/bookings/{b_id}/send-message", json={
        "message": "Boarding is now open at pier gate 2.",
        "template_type": "BOARDING"
    })
    assert msg_res.status_code == 200
    assert msg_res.json()["success"] is True

    # 5. Lifecycle Transition to IN_PROGRESS
    act_in_prog = client.post(f"/api/operator/bookings/{b_id}/in_progress")
    assert act_in_prog.status_code == 200
    assert act_in_prog.json()["booking"]["status"] == "IN_PROGRESS"

    # 6. Lifecycle Transition to COMPLETED
    act_comp = client.post(f"/api/operator/bookings/{b_id}/complete")
    assert act_comp.status_code == 200
    assert act_comp.json()["booking"]["status"] == "COMPLETED"

    # 7. Process Refund
    ref_res = client.post(f"/api/operator/bookings/{b_id}/process-refund", json={
        "refund_amount": 500.0,
        "refund_reason": "Weather inconvenience credit",
        "cancel_booking": False
    })
    assert ref_res.status_code == 200
    assert ref_res.json()["success"] is True
    assert ref_res.json()["booking"]["refund_amount"] >= 500.0

