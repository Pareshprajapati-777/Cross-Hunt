import pytest
from datetime import date, timedelta


def test_wallet_system_and_cancellation_refund(client):
    # 1. Login as customer user1
    login_res = client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})
    assert login_res.status_code == 200

    # 2. Get initial wallet summary
    wallet_res = client.get("/api/wallet/summary")
    assert wallet_res.status_code == 200
    initial_wallet = wallet_res.json()
    assert "wallet_balance" in initial_wallet
    initial_balance = initial_wallet["wallet_balance"]

    # 3. Top-up wallet by 1500
    topup_res = client.post("/api/wallet/topup", json={
        "amount": 1500.0,
        "payment_method": "UPI Test",
        "reference_id": "TEST-TOPUP-1"
    })
    assert topup_res.status_code == 200
    topup_data = topup_res.json()
    assert topup_data["wallet_balance"] == initial_balance + 1500.0

    # 4. Create a tour booking
    tours_res = client.get("/api/tours/")
    tours = tours_res.json()["tours"]
    future_tours = [
        t for t in tours
        if t.get("departure_date", "") >= date.today().strftime("%Y-%m-%d")
        and t.get("status") in ("SCHEDULED", "OPEN")
        and t.get("remaining_capacity", 0) > 2
    ]
    tour = future_tours[0] if future_tours else tours[0]

    booking_payload = {
        "booking_type": "TOUR",
        "public_tour_id": tour["id"],
        "adults_count": 1,
        "children_count": 0,
        "cabin_type": "Standard Stateroom",
        "payment_method": "UPI",
        "payment_status": "PAID"
    }
    book_res = client.post("/api/bookings/create/", json=booking_payload)
    assert book_res.status_code == 200
    booking = book_res.json()["booking"]
    booking_id = booking["booking_id"]
    total_price = float(booking["total_price"])
    assert total_price > 0

    # Check balance before cancellation
    balance_before_cancel = client.get("/api/wallet/summary").json()["wallet_balance"]

    # 5. Cancel the booking -> MUST refund money into user wallet!
    cancel_res = client.post(f"/api/bookings/{booking_id}/cancel/", json={
        "reason": "Change of travel plans"
    })
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["success"] is True
    assert cancel_data["status"] == "CANCELLED"
    assert cancel_data["refund_amount"] == total_price
    assert cancel_data["wallet_balance"] == balance_before_cancel + total_price

    # 6. Verify wallet summary and transactions reflect the refund
    wallet_after_cancel = client.get("/api/wallet/summary").json()
    assert wallet_after_cancel["wallet_balance"] == balance_before_cancel + total_price
    assert wallet_after_cancel["total_refunds_received"] >= total_price

    # Verify transaction history contains the refund entry
    txs = wallet_after_cancel["transactions"]
    refund_tx = next((tx for tx in txs if tx.get("booking_code") == booking_id), None)
    assert refund_tx is not None
    assert refund_tx["transaction_type"] == "CREDIT"
    assert refund_tx["source"] == "CANCELLATION_REFUND"
    assert refund_tx["amount"] == total_price
