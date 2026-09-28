import requests

BASE = 'http://127.0.0.1:8000'

def test_roles_and_permissions():
    print("Testing Role-Based Logins and Permission Enforcements...")

    # 1. Customer User
    s_user = requests.Session()
    r = s_user.post(f'{BASE}/api/auth/login/', json={'username': 'user1', 'password': 'User@12345'})
    assert r.status_code == 200
    user_data = r.json()['user']
    print(f"[USER] Role: {user_data['role']}, is_operator: {user_data.get('is_operator')}, is_admin: {user_data.get('is_admin')}")
    assert user_data['role'] == 'USER'
    assert user_data.get('is_operator') is False
    assert user_data.get('is_admin') is False

    # Check USER cannot access operator dashboard
    r_op = s_user.get(f'{BASE}/api/operator/dashboard/')
    print(f"[USER -> OPERATOR ENDPOINT] Status: {r_op.status_code} (Expected 403)")
    assert r_op.status_code == 403

    # Check USER cannot access admin dashboard
    r_adm = s_user.get(f'{BASE}/api/admin/dashboard/')
    print(f"[USER -> ADMIN ENDPOINT] Status: {r_adm.status_code} (Expected 403)")
    assert r_adm.status_code == 403

    # 2. Ship Owner / Operator
    s_owner = requests.Session()
    r = s_owner.post(f'{BASE}/api/auth/login/', json={'username': 'owner1', 'password': 'Owner@12345'})
    assert r.status_code == 200
    owner_data = r.json()['user']
    print(f"[OWNER] Role: {owner_data['role']}, is_operator: {owner_data.get('is_operator')}, is_admin: {owner_data.get('is_admin')}")
    assert owner_data.get('is_operator') is True
    assert owner_data.get('is_admin') is False

    # Check OWNER can access operator dashboard
    r_op = s_owner.get(f'{BASE}/api/operator/dashboard/')
    print(f"[OWNER -> OPERATOR ENDPOINT] Status: {r_op.status_code} (Expected 200)")
    assert r_op.status_code == 200

    # Check OWNER cannot access admin dashboard
    r_adm = s_owner.get(f'{BASE}/api/admin/dashboard/')
    print(f"[OWNER -> ADMIN ENDPOINT] Status: {r_adm.status_code} (Expected 403)")
    assert r_adm.status_code == 403

    # 3. Platform Admin
    s_admin = requests.Session()
    r = s_admin.post(f'{BASE}/api/auth/login/', json={'username': 'admin', 'password': 'Admin@12345'})
    assert r.status_code == 200
    admin_data = r.json()['user']
    print(f"[ADMIN] Role: {admin_data['role']}, is_operator: {admin_data.get('is_operator')}, is_admin: {admin_data.get('is_admin')}")
    assert admin_data.get('is_admin') is True

    # Check ADMIN can access admin dashboard
    r_adm = s_admin.get(f'{BASE}/api/admin/dashboard/')
    print(f"[ADMIN -> ADMIN ENDPOINT] Status: {r_adm.status_code} (Expected 200)")
    assert r_adm.status_code == 200

    # Check ADMIN can also view operator dashboard
    r_op = s_admin.get(f'{BASE}/api/operator/dashboard/')
    print(f"[ADMIN -> OPERATOR ENDPOINT] Status: {r_op.status_code} (Expected 200)")
    assert r_op.status_code == 200

    print("ALL ROLE-BASED LOGINS & ACCESS PERMISSION CHECKS PASSED PERFECTLY!")

if __name__ == '__main__':
    test_roles_and_permissions()
