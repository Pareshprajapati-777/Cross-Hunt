import pytest


def test_login_and_roles(client):
    # Customer login
    res = client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["user"]["role"] == "USER"
    assert data["user"]["is_operator"] is False
    assert data["user"]["is_admin"] is False
    assert "token" in data

    # Me check
    me_res = client.get("/api/auth/me/")
    assert me_res.status_code == 200
    assert me_res.json()["user"]["username"] == "user1"

    # Operator login
    res_owner = client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})
    assert res_owner.status_code == 200
    owner_data = res_owner.json()["user"]
    assert owner_data["is_operator"] is True
    assert owner_data["is_admin"] is False

    # Admin login (supports Admin@12345 and admin123)
    res_admin = client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})
    assert res_admin.status_code == 200
    admin_data = res_admin.json()["user"]
    assert admin_data["is_admin"] is True


def test_permission_enforcement(client):
    # Customer cannot access operator or admin dashboards
    client.post("/api/auth/login/", json={"username": "user1", "password": "User@12345"})
    r_op = client.get("/api/operator/dashboard/")
    assert r_op.status_code == 403
    r_adm = client.get("/api/admin/dashboard/")
    assert r_adm.status_code == 403

    # Owner can access operator dashboard, but NOT admin dashboard
    client.post("/api/auth/login/", json={"username": "owner1", "password": "Owner@12345"})
    r_op_owner = client.get("/api/operator/dashboard/")
    assert r_op_owner.status_code == 200
    r_adm_owner = client.get("/api/admin/dashboard/")
    assert r_adm_owner.status_code == 403

    # Admin can access admin dashboard AND operator dashboard
    client.post("/api/auth/login/", json={"username": "admin", "password": "Admin@12345"})
    r_adm_admin = client.get("/api/admin/dashboard/")
    assert r_adm_admin.status_code == 200
    r_op_admin = client.get("/api/operator/dashboard/")
    assert r_op_admin.status_code == 200


def test_register_and_profile_update(client):
    import uuid
    new_username = f"test_{uuid.uuid4().hex[:8]}"
    new_email = f"{new_username}@testcruise.com"

    # Register new customer
    reg_res = client.post("/api/auth/register/", json={
        "username": new_username,
        "email": new_email,
        "password": "Password@123",
        "first_name": "Test",
        "last_name": "Voyager",
        "phone": "+919876543210",
        "role": "USER"
    })
    assert reg_res.status_code == 200
    assert reg_res.json()["user"]["username"] == new_username

    # Profile update
    upd_res = client.put("/api/auth/profile/", json={
        "first_name": "UpdatedName",
        "phone": "+919999999999"
    })
    assert upd_res.status_code == 200
    assert upd_res.json()["user"]["first_name"] == "UpdatedName"

    # Logout
    logout_res = client.post("/api/auth/logout/")
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # Clean up test user
    from backend.app.database.session import SessionLocal
    from backend.app.models.user import User
    db = SessionLocal()
    u = db.query(User).filter(User.username == new_username).first()
    if u:
        db.delete(u)
        db.commit()
    db.close()
