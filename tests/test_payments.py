import pytest


def test_payment_config_endpoint(client):
    res = client.get("/api/payments/config/")
    assert res.status_code == 200
    data = res.json()
    assert "razorpay_key_id" in data
    assert "merchant_name" in data
    assert "upi_id" in data
    assert data["currency"] == "INR"


def test_create_order_and_verify(client):
    # Test Create Order
    res = client.post("/api/payments/create-order/", json={"amount": 295000.0, "currency": "INR"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "order_id" in data
    assert data["amount"] == 29500000

    # Test UPI Verification
    upi_verify = client.post("/api/payments/verify/", json={
        "upi_reference": "UPI9988776655",
        "amount": 295000.0
    })
    assert upi_verify.status_code == 200
    assert upi_verify.json()["success"] is True
    assert upi_verify.json()["status"] == "VERIFIED"

    # Test Razorpay Test Verification
    rzp_verify = client.post("/api/payments/verify/", json={
        "razorpay_payment_id": "pay_test12345678",
        "amount": 295000.0
    })
    assert rzp_verify.status_code == 200
    assert rzp_verify.json()["success"] is True
    assert rzp_verify.json()["status"] == "VERIFIED"
