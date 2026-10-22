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


def test_forgot_and_reset_password(client):
    import uuid
    test_user = f"reset_{uuid.uuid4().hex[:8]}"
    test_email = f"{test_user}@testcruise.com"

    # Register user
    reg = client.post("/api/auth/register/", json={
        "username": test_user,
        "email": test_email,
        "password": "OldPassword@123",
        "first_name": "Reset",
        "last_name": "User",
        "role": "USER"
    })
    assert reg.status_code == 200

    # Forgot password check (404 for non-existent)
    f_bad = client.post("/api/auth/forgot-password/", json={"username_or_email": "non_existent_xyz"})
    assert f_bad.status_code == 404

    # Forgot password check (valid user)
    f_ok = client.post("/api/auth/forgot-password/", json={"username_or_email": test_user})
    assert f_ok.status_code == 200
    assert f_ok.json()["success"] is True
    assert f_ok.json()["username"] == test_user

    # Reset password with short password (< 6 chars) -> 400
    r_short = client.post("/api/auth/reset-password/", json={
        "username_or_email": test_user,
        "new_password": "123"
    })
    assert r_short.status_code == 400

    # Reset password successfully
    r_ok = client.post("/api/auth/reset-password/", json={
        "username_or_email": test_user,
        "new_password": "NewSecurePassword@999"
    })
    assert r_ok.status_code == 200
    assert r_ok.json()["success"] is True

    # Try logging in with old password -> should fail
    login_old = client.post("/api/auth/login/", json={
        "username": test_user,
        "password": "OldPassword@123"
    })
    assert login_old.status_code == 400

    # Login with new password -> should succeed
    login_new = client.post("/api/auth/login/", json={
        "username": test_user,
        "password": "NewSecurePassword@999"
    })
    assert login_new.status_code == 200
    assert login_new.json()["user"]["username"] == test_user

    # Clean up
    from backend.app.database.session import SessionLocal
    from backend.app.models.user import User
    db = SessionLocal()
    u = db.query(User).filter(User.username == test_user).first()
    if u:
        db.delete(u)
        db.commit()
    db.close()

