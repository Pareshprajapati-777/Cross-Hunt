import pytest


def test_favorites_requires_login(client):
    # Ensure unauthenticated state by clearing any session cookies from prior tests
    client.cookies.clear()

    # Unauthenticated request to /api/favorites/ must return 401
    res = client.get("/api/favorites/")
    assert res.status_code == 401

    # Unauthenticated toggle must return 401
    toggle_res = client.post("/api/favorites/toggle/1/")
    assert toggle_res.status_code == 401


def test_favorites_lifecycle(client):
    # Login as user1
    login_res = client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})
    assert login_res.status_code == 200

    # Get cruises list to find a valid ship id
    cruises_res = client.get("/api/cruises/")
    assert cruises_res.status_code == 200
    cruises = cruises_res.json().get("cruises", [])
    assert len(cruises) > 0
    ship_id = cruises[0]["id"]

    # Toggle favorite -> add to favorites
    add_res = client.post(f"/api/favorites/toggle/{ship_id}/")
    assert add_res.status_code == 200
    data = add_res.json()
    assert data["success"] is True
    assert data["favorited"] is True

    # Check favorites list
    list_res = client.get("/api/favorites/")
    assert list_res.status_code == 200
    fav_data = list_res.json()
    assert fav_data["success"] is True
    assert ship_id in fav_data["ship_ids"]

    # Toggle favorite -> remove from favorites
    remove_res = client.post(f"/api/favorites/toggle/{ship_id}/")
    assert remove_res.status_code == 200
    r_data = remove_res.json()
    assert r_data["success"] is True
    assert r_data["favorited"] is False

    # Check favorites list again -> ship_id should no longer be in favorites
    list_res_after = client.get("/api/favorites/")
    assert list_res_after.status_code == 200
    assert ship_id not in list_res_after.json()["ship_ids"]
