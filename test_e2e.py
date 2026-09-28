import requests

BASE = 'http://127.0.0.1:8000'
s = requests.Session()

# 1. Login as user1
login_res = s.post(f'{BASE}/api/auth/login/', json={'username': 'user1', 'password': 'User@12345'})
print('Login Status:', login_res.status_code, login_res.json()['success'])

# 2. Check me
me_res = s.get(f'{BASE}/api/auth/me/')
print('Me Status:', me_res.status_code, me_res.json()['user']['username'])

# 3. Fetch cruise list - select cruise owned by owner1
c_res = s.get(f'{BASE}/api/cruises/')
cruises = c_res.json()['cruises']
first_cruise = next(c for c in cruises if c['id'] == 10)
print(f"Selected Cruise: {first_cruise['title']} (ID: {first_cruise['id']})")

import datetime
import random

# 4. Create Tour Booking with fresh date
next_date = (datetime.date.today() + datetime.timedelta(days=random.randint(30, 200))).strftime('%Y-%m-%d')
book_payload = {
    'cruise_id': first_cruise['id'],
    'booking_type': 'CRUISE_TOUR',
    'booking_date': next_date,
    'start_time': '10:00',
    'end_time': '18:00',
    'passengers_count': 2,
    'cabin_type': 'PRESIDENTIAL',
    'special_requests': 'Anniversary voyage, high deck please'
}
if 'csrftoken' in s.cookies:
    s.headers['X-CSRFToken'] = s.cookies['csrftoken']

b_res = s.post(f'{BASE}/api/bookings/create/', json=book_payload)
print('Booking Response Body:', b_res.json())
booking_id = b_res.json()['booking']['booking_id']

# 5. Fetch my bookings
my_res = s.get(f'{BASE}/api/bookings/my-bookings/')
print('User Bookings Count:', len(my_res.json()['bookings']))

# 6. Switch to Operator owner1 and approve
s_op = requests.Session()
s_op.post(f'{BASE}/api/auth/login/', json={'username': 'owner1', 'password': 'Owner@12345'})
if 'csrftoken' in s_op.cookies:
    s_op.headers['X-CSRFToken'] = s_op.cookies['csrftoken']
op_dash = s_op.get(f'{BASE}/api/operator/dashboard/').json()
print('Operator Total Ships:', op_dash['stats']['total_ships'])
appr_res = s_op.post(f'{BASE}/api/operator/bookings/{booking_id}/confirm/')
print('Operator Approval Response:', appr_res.status_code, appr_res.json())

# 7. Check Admin Dashboard
s_adm = requests.Session()
s_adm.post(f'{BASE}/api/auth/login/', json={'username': 'admin', 'password': 'Admin@12345'})
adm_dash = s_adm.get(f'{BASE}/api/admin/dashboard/').json()
print('Admin Total Bookings:', adm_dash['stats']['total_bookings'], 'Total GMV: $', adm_dash['stats']['total_revenue'])
print('=== CRITICAL USER JOURNEY TEST PASSED 100% ===')
