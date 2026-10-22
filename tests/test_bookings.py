import pytest
from datetime import date, timedelta


def test_tour_booking_lifecycle(client):
    # Login as customer
    client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})

    # Get upcoming tour
    tours_res = client.get("/api/tours/")
    tours = tours_res.json()["tours"]
    future_tours = [t for t in tours if t.get("departure_date", "") >= date.today().strftime("%Y-%m-%d")]
    tour = future_tours[0] if future_tours else tours[0]

    # Create tour booking
    payload = {
        "booking_type": "TOUR",
        "public_tour_id": tour["id"],
        "adults_count": 2,
        "children_count": 1,
        "cabin_type": "Deluxe Oceanview Cabin",
        "promo_code": "VOYAGE10",
        "special_requests": "Window table reservation"
    }
    book_res = client.post("/api/bookings/create/", json=payload)
    assert book_res.status_code == 200
    b_data = book_res.json()["booking"]
    booking_id = b_data["booking_id"]
    assert b_data["status"] == "CONFIRMED"
    assert b_data["total_price"] > 0
    assert "ticket_code" in b_data
    assert "qr_code_hash" in b_data

    # Check booking detail
    detail_res = client.get(f"/api/bookings/{booking_id}/")
    assert detail_res.status_code == 200
    assert detail_res.json()["booking"]["booking_id"] == booking_id

    # Check invoice
    inv_res = client.get(f"/api/bookings/{booking_id}/invoice/")
    assert inv_res.status_code == 200
    assert inv_res.json()["invoice"]["booking_id"] == booking_id

    # Check ticket QR verification
    t_code = b_data["ticket_code"]
    verify_res = client.get(f"/api/tickets/verify/{t_code}/")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["booking"]["booking_id"] == booking_id

    # Passenger cannot mark ticket used (forbidden)
    used_unauth = client.post(f"/api/tickets/verify/{t_code}/mark-used/")
    assert used_unauth.status_code == 403

    # Admin/Gatekeeper can mark ticket used
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})
    used_res = client.post(f"/api/tickets/verify/{t_code}/mark-used/")
    assert used_res.status_code == 200
    assert used_res.json()["success"] is True

    # Check cancellation
    cancel_res = client.post(f"/api/bookings/{booking_id}/cancel/")
    assert cancel_res.json().get("status") == "CANCELLED" or cancel_res.json()["booking"]["status"] == "CANCELLED"


def test_private_charter_booking_and_conflict(client):
    client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})

    cruises_res = client.get("/api/cruises/")
    ship = cruises_res.json()["cruises"][0]

    # Find an open charter date that has no bookings yet
    res1 = None
    charter_payload = None
    for offset in range(250, 400):
        c_date = (date.today() + timedelta(days=offset)).strftime("%Y-%m-%d")
        payload = {
            "booking_type": "EVENT",
            "cruise_id": ship["id"],
            "booking_date": c_date,
            "start_time": "16:00",
            "end_time": "20:00",
            "event_type": "Executive Summit",
            "number_of_people": 25,
            "special_requests": "Conference audio setup"
        }
        res = client.post("/api/bookings/create/", json=payload)
        if res.status_code == 200:
            res1 = res
            charter_payload = payload
            break

    assert res1 is not None, "Could not find an available date"
    assert res1.status_code == 200
    assert res1.json()["booking"]["status"] in ["CONFIRMED", "PENDING"]

    # Attempt conflicting duplicate reservation on same vessel & date
    res2 = client.post("/api/bookings/create/", json=charter_payload)
    assert res2.status_code == 400
    assert "already booked" in res2.json()["detail"].lower() or "conflict" in res2.json()["detail"].lower() or "reserved" in res2.json()["detail"].lower()
