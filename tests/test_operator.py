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
