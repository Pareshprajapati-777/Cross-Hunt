import datetime
import random
import requests

BASE = 'http://127.0.0.1:8000'

def run_e2e_verification():
    print("=" * 60)
    print("CROSS-HUNT E2E VERIFICATION SUITE (CRUISE SHIPS + TOURS)")
    print("=" * 60)

    s = requests.Session()

    # 1. Login as user1
    login_res = s.post(f'{BASE}/api/auth/login/', json={'username': 'user1', 'password': 'User@12345'})
    print('1. User Login Status:', login_res.status_code, login_res.json().get('success'))
    assert login_res.status_code == 200

    # 2. Check /api/auth/me/
    me_res = s.get(f'{BASE}/api/auth/me/')
    user_info = me_res.json().get('user', {})
    print('2. Me Profile:', me_res.status_code, user_info.get('username'), f"Role: {user_info.get('role')}")
    assert user_info.get('username') == 'user1'

    # 3. Check /api/cruises/ & Requirement Matching
    c_res = s.get(f'{BASE}/api/cruises/')
    cruises = c_res.json().get('cruises', [])
    print(f"3. Active Cruise Ships in Fleet: {len(cruises)}")
    assert len(cruises) > 0

    match_res = s.post(f'{BASE}/api/cruises/match/', json={
        'purpose': 'Wedding',
        'guests': 80,
        'budget': 150000,
        'location': 'Mumbai'
    })
    matches = match_res.json()
    print(f"   Requirement Matcher: {matches.get('total_exact')} Exact Matches, {matches.get('total_alternatives')} Alternatives")

    # 4. Check Public Tours (Product B)
    tours_res = s.get(f'{BASE}/api/tours/')
    tours = tours_res.json().get('tours', [])
    print(f"4. Public Scheduled Cruise Tours: {len(tours)}")
    assert len(tours) > 0
    first_tour = tours[0]
    print(f"   Selected Tour: {first_tour['tour_title']} (INR {first_tour['adult_price']:,.0f} / adult, Seats left: {first_tour['remaining_capacity']})")

    # 5. Book a Public Cruise Tour Ticket (Product B)
    tour_book_payload = {
        'booking_type': 'TOUR',
        'public_tour_id': first_tour['id'],
        'adults_count': 2,
        'children_count': 1,
        'cabin_type': 'Royal Balcony Stateroom',
        'promo_code': 'VOYAGE10',
        'special_requests': 'Ocean deck table for dinner please'
    }
    b1_res = s.post(f'{BASE}/api/bookings/create/', json=tour_book_payload)
    print('5. Public Tour Ticket Booking Response:', b1_res.status_code)
    b1_data = b1_res.json()
    assert b1_res.status_code == 200, b1_data
    b1_id = b1_data['booking']['booking_id']
    print(f"   Booked Reference: {b1_id} | Total: INR {b1_data['booking']['total_price']:,.2f} | QR Hash: {b1_data['booking']['qr_code_hash']}")

    # 6. Book a Private Ship Charter (Product A)
    first_ship = cruises[0]
    next_date = (datetime.date.today() + datetime.timedelta(days=random.randint(40, 90))).strftime('%Y-%m-%d')
    charter_payload = {
        'booking_type': 'EVENT',
        'cruise_id': first_ship['id'],
        'booking_date': next_date,
        'start_time': '16:00',
        'end_time': '22:00',
        'event_type': 'Corporate Leadership Conclave',
        'number_of_people': 40,
        'selected_extras': [
            {'name': 'Grand Floral & Thematic Deck Decoration'},
            {'name': 'Professional DJ Rig & Concert Sound System'}
        ],
        'promo_code': 'ROYAL5000',
        'special_requests': 'Executive presentation screen required on deck 5'
    }
    b2_res = s.post(f'{BASE}/api/bookings/create/', json=charter_payload)
    print('6. Private Ship Charter Booking Response:', b2_res.status_code)
    b2_data = b2_res.json()
    assert b2_res.status_code == 200, b2_data
    b2_id = b2_data['booking']['booking_id']
    print(f"   Booked Reference: {b2_id} | Total: INR {b2_data['booking']['total_price']:,.2f}")

    # 7. Check Invoice Generation
    inv_res = s.get(f'{BASE}/api/bookings/{b1_id}/invoice/')
    print('7. Tax Invoice Status:', inv_res.status_code)
    inv = inv_res.json().get('invoice', {})
    curr_str = str(inv.get('currency', '')).encode('ascii', 'ignore').decode()
    print(f"   Invoice Number: {inv.get('invoice_number')} | Currency: {curr_str} | Total: INR {inv.get('total_price'):,.2f}")
    assert 'INR' in inv.get('currency')
    assert len(inv.get('line_items', [])) > 0

    # 8. Operator (owner1) Fleet Management & Approval
    s_op = requests.Session()
    s_op.post(f'{BASE}/api/auth/login/', json={'username': 'owner1', 'password': 'Owner@12345'})
    op_dash = s_op.get(f'{BASE}/api/operator/dashboard/').json()
    print('8. Operator Dashboard Stats:', op_dash.get('stats'))
    appr_res = s_op.post(f'{BASE}/api/operator/bookings/{b2_id}/confirm/')
    print('   Operator Action on Charter:', appr_res.status_code, appr_res.json().get('message'))

    # 9. Admin Platform Dashboard
    s_adm = requests.Session()
    s_adm.post(f'{BASE}/api/auth/login/', json={'username': 'admin', 'password': 'Admin@12345'})
    adm_dash = s_adm.get(f'{BASE}/api/admin/dashboard/').json()
    adm_stats = adm_dash.get('stats', {})
    print(f"9. Admin Platform Metrics: Users: {adm_stats.get('total_users')} | Ships: {adm_stats.get('total_ships')} | Tours: {adm_stats.get('total_tours')} | Revenue: INR {adm_stats.get('total_revenue'):,.2f}")

    print("=" * 60)
    print("ALL E2E CHECKS PASSED SUCCESSFULLY IN REAL DATABASE!")
    print("=" * 60)


if __name__ == '__main__':
    run_e2e_verification()
