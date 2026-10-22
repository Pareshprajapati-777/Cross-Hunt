import pytest


def test_cruises_and_search(client):
    res = client.get("/api/cruises/")
    assert res.status_code == 200
    data = res.json()
    assert "cruises" in data
    assert data["total"] > 0
    first_cruise = data["cruises"][0]
    assert "name" in first_cruise
    assert "slug" in first_cruise
    assert "price" in first_cruise

    # Detail view
    detail_res = client.get(f"/api/cruises/{first_cruise['slug']}/")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    cruise_obj = detail_data.get("cruise", detail_data)
    assert cruise_obj["slug"] == first_cruise["slug"]


def test_ship_match_engine(client):
    match_res = client.post("/api/cruises/match/", json={
        "purpose": "Wedding",
        "guests": 80,
        "budget": 150000,
        "location": "Mumbai"
    })
    assert match_res.status_code == 200
    data = match_res.json()
    assert "exact_matches" in data
    assert "alternatives" in data or "close_alternatives" in data
    assert "total_exact" in data


def test_public_tours_and_packages(client):
    # Tours list
    tours_res = client.get("/api/tours/")
    assert tours_res.status_code == 200
    tours = tours_res.json()["tours"]
    assert len(tours) > 0
    t_slug = tours[0]["slug"]

    # Destination filtering with alias
    goa_res = client.get("/api/tours/?destination=Goa")
    assert goa_res.status_code == 200
    assert len(goa_res.json()["tours"]) > 0

    swaraj_res = client.get("/api/tours/?destination=Swaraj%20Dweep")
    assert swaraj_res.status_code == 200
    assert len(swaraj_res.json()["tours"]) > 0

    # Port filtering with alias
    panaji_res = client.get("/api/tours/?departure_port=Panaji")
    assert panaji_res.status_code == 200
    assert len(panaji_res.json()["tours"]) > 0

    # Keyword search
    search_res = client.get("/api/tours/?q=dinner")
    assert search_res.status_code == 200
    assert len(search_res.json()["tours"]) > 0

    # Sorting
    sort_asc = client.get("/api/tours/?sort_by=price_asc")
    assert sort_asc.status_code == 200
    prices_asc = [t["adult_price"] for t in sort_asc.json()["tours"]]
    assert prices_asc == sorted(prices_asc)

    # Tour detail
    t_detail = client.get(f"/api/tours/{t_slug}/")
    assert t_detail.status_code == 200
    assert t_detail.json()["tour"]["slug"] == t_slug

    # Events packages
    evt_res = client.get("/api/events/packages/")
    assert evt_res.status_code == 200
    assert len(evt_res.json()["packages"]) > 0


def test_offers_and_coupon_validation(client):
    offers_res = client.get("/api/offers/")
    assert offers_res.status_code == 200
    assert "offers" in offers_res.json()

    # Validate valid coupon
    val_res = client.post("/api/offers/validate/", json={
        "code": "VOYAGE10",
        "booking_amount": 50000
    })
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["discount_amount"] > 0

    # Validate non-existent coupon
    invalid_res = client.post("/api/offers/validate/", json={
        "code": "INVALID_CODE_XYZ",
        "booking_amount": 50000
    })
    assert invalid_res.status_code in [400, 404]
    assert invalid_res.json()["valid"] is False
