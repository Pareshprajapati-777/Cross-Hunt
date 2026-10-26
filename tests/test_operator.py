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


def test_staff_and_equipment_and_availability_engine(client):
    # 1. Login as owner
    login_res = client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})
    assert login_res.status_code == 200

    # 2. List staff
    staff_res = client.get("/api/operator/staff")
    assert staff_res.status_code == 200
    staff_data = staff_res.json()
    assert "staff" in staff_data
    assert "stats" in staff_data
    assert staff_data["stats"]["total"] >= 5
    assert staff_data["stats"]["instructors_count"] >= 1
    assert staff_data["stats"]["captains_count"] >= 1

    # 3. Create a specialized scuba instructor with max supervision limit = 4
    new_staff_res = client.post("/api/operator/staff", json={
        "name": "Arjun Divemaster",
        "role": "INSTRUCTOR",
        "license_number": "PADI-MSDT-771122",
        "certifications": "PADI Deep Diver Specialist, First Aid",
        "phone": "+91 99887 66554",
        "email": "arjun.dive@crosshunt.com",
        "max_supervision_limit": 4,
        "experience_years": 5,
        "status": "ON_DUTY",
        "assigned_activity_types": ["scuba_diving", "scuba"],
        "notes": "Approved for max 4 participants per session"
    })
    assert new_staff_res.status_code == 200
    created_staff = new_staff_res.json()["staff"]
    staff_id = created_staff["id"]
    assert created_staff["max_supervision_limit"] == 4

    # 4. Toggle staff status to ON_LEAVE and back to ON_DUTY
    toggle_res = client.patch(f"/api/operator/staff/{staff_id}/status?status=ON_LEAVE")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "ON_LEAVE"

    toggle_back = client.patch(f"/api/operator/staff/{staff_id}/status?status=ON_DUTY")
    assert toggle_back.status_code == 200
    assert toggle_back.json()["status"] == "ON_DUTY"

    # 5. List equipment
    equip_res = client.get("/api/operator/equipment")
    assert equip_res.status_code == 200
    equip_data = equip_res.json()
    assert "equipment" in equip_data
    assert "stats" in equip_data
    assert equip_data["stats"]["total_units"] >= 20
    assert equip_data["stats"]["by_category"]["LIFE_JACKET"] >= 10

    # 6. Create custom equipment item (Jet Ski)
    new_equip_res = client.post("/api/operator/equipment", json={
        "name": "Kawasaki Ultra 310LX Jet Ski",
        "category": "JET_SKI",
        "serial_number": "KAW-ULTRA-310-09",
        "total_quantity": 2,
        "condition_status": "OPERATIONAL",
        "safety_certification": "Certified High-Speed Maritime Vessel",
        "notes": "Twin throttle supercharged watercraft"
    })
    assert new_equip_res.status_code == 200
    created_equip = new_equip_res.json()["equipment"]
    equip_id = created_equip["id"]

    # 7. Toggle equipment condition to MAINTENANCE
    cond_res = client.patch(f"/api/operator/equipment/{equip_id}/condition?condition=MAINTENANCE")
    assert cond_res.status_code == 200
    assert cond_res.json()["condition_status"] == "MAINTENANCE"

    # 8. Test Availability Simulator
    # Fetch an activity (e.g. Scuba Diving or Jet Ski)
    act_res = client.get("/api/activities/")
    assert act_res.status_code == 200
    activities = act_res.json()["activities"]
    assert len(activities) > 0
    test_act = activities[0]

    sim_res = client.post("/api/operator/availability-simulator", json={
        "activity_id": test_act["id"],
        "booking_date": "2026-11-28",
        "time_slot": "10:30 AM",
        "participants": 2
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert "is_available" in sim_data
    assert "max_available_spots" in sim_data
    assert "breakdown" in sim_data
    assert "activity_slot" in sim_data["breakdown"]

    # 9. Clean up created test items
    del_staff = client.delete(f"/api/operator/staff/{staff_id}")
    assert del_staff.status_code == 200
    del_equip = client.delete(f"/api/operator/equipment/{equip_id}")
    assert del_equip.status_code == 200


def test_owner_financial_dashboard_and_payouts(client):
    # 1. Login as owner
    login_res = client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})
    assert login_res.status_code == 200

    # 2. Financial Overview endpoint
    fin_res = client.get("/api/operator/financial-overview")
    assert fin_res.status_code == 200
    fin_data = fin_res.json()
    assert "kpis" in fin_data
    assert "payouts" in fin_data
    assert "booking_ledger" in fin_data

    kpis = fin_data["kpis"]
    assert "gross_booking_value" in kpis
    assert "platform_commission" in kpis
    assert "payment_processing_fees" in kpis
    assert "refunds" in kpis
    assert "net_earnings" in kpis
    assert "completed_payouts" in kpis
    assert "pending_payouts" in kpis
    assert kpis["platform_commission_percentage"] == 15.0
    assert kpis["payment_processing_percentage"] == 2.0
    assert kpis["payout_rate_percentage"] == 83.0

    # Verify booking ledger structure
    ledger = fin_data["booking_ledger"]
    if ledger:
        b0 = ledger[0]
        assert "booking_id" in b0
        assert "ticket_code" in b0
        assert "gross_amount" in b0
        assert "platform_commission" in b0
        assert "payment_processing_fee" in b0
        assert "net_owner_share" in b0
        assert "payout_status" in b0

    # 3. Payouts List endpoint
    payouts_res = client.get("/api/operator/payouts")
    assert payouts_res.status_code == 200
    payouts_data = payouts_res.json()
    assert "payouts" in payouts_data
    assert "stats" in payouts_data
    assert "total_count" in payouts_data["stats"]

    # 4. Request Payout endpoint
    payout_req_res = client.post("/api/operator/request-payout", json={
        "amount": 1500.0,
        "bank_name": "State Bank of India",
        "account_number": "•••• •••• 9842",
        "ifsc_code": "SBIN0004521",
        "notes": "Test owner earnings settlement"
    })
    assert payout_req_res.status_code == 200
    req_json = payout_req_res.json()
    assert req_json["success"] is True
    assert req_json["payout"]["amount"] == 1500.0
    assert req_json["payout"]["status"] == "PROCESSING"
    assert req_json["payout"]["bank_name"] == "State Bank of India"
    assert req_json["payout"]["payout_reference"].startswith("PAY-")

    # 5. Invalid payout amount check (<= 0)
    bad_req = client.post("/api/operator/request-payout", json={
        "amount": 0.0,
        "bank_name": "HDFC Bank",
    })
    assert bad_req.status_code in [400, 422]




