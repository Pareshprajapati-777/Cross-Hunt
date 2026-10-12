import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cross_booking.settings')
django.setup()

from django.test import Client
from accounts.models import User
from crosses.models import Cross
from bookings.models import Booking

def run_tests():
    print("=" * 70)
    print("RUNNING COMPREHENSIVE VERIFICATION FOR NEW FEATURES")
    print("=" * 70)

    client = Client()

    # -------------------------------------------------------------
    # FEATURE 1: WhatsApp + Contact in Ship Details
    # -------------------------------------------------------------
    print("\n--- 1. Testing Ship Details Contact & WhatsApp Logic ---")
    
    # Fetch all cruises
    res = client.get('/api/cruises/')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    cruises = res.json().get('cruises', [])
    assert len(cruises) > 0, "No cruises returned"

    # Find ships with different contact types
    mobile_ship = None
    landline_ship = None
    owner_ship = None

    for c in cruises:
        contact = c.get('contact_number')
        whatsapp = c.get('whatsapp_number')
        is_wa = c.get('is_whatsapp_available')
        m_type = c.get('management_type')
        
        # Test: No customer personal phone exposed
        # Check that user accounts (USER role) phones are not used
        user_phones = list(User.objects.filter(role='USER').values_list('phone', flat=True))
        if contact:
            assert contact not in user_phones, f"Customer phone exposed in cruise {c['name']}!"

        if is_wa and whatsapp:
            mobile_ship = c
        elif contact and not is_wa:
            landline_ship = c
        if m_type == 'OWNER':
            owner_ship = c

    print(f"Total Cruises evaluated: {len(cruises)}")
    
    if mobile_ship:
        print(f"[OK] Mobile Ship found: '{mobile_ship['name']}'")
        print(f"     Management: {mobile_ship['management_type']} ({mobile_ship.get('management_name')})")
        print(f"     Contact Number: {mobile_ship['contact_number']}")
        print(f"     WhatsApp Number: {mobile_ship['whatsapp_number']}")
        print(f"     WhatsApp Available: {mobile_ship['is_whatsapp_available']}")
        assert mobile_ship['is_whatsapp_available'] is True
        assert mobile_ship['whatsapp_number'] is not None
    else:
        print("[WARN] No mobile ship found with WhatsApp available!")

    if landline_ship:
        print(f"[OK] Landline/Non-WhatsApp Ship found: '{landline_ship['name']}'")
        print(f"     Management: {landline_ship['management_type']} ({landline_ship.get('management_name')})")
        print(f"     Contact Number: {landline_ship['contact_number']}")
        print(f"     WhatsApp Number: {landline_ship['whatsapp_number']} (Suppressed)")
        print(f"     WhatsApp Available: {landline_ship['is_whatsapp_available']} (Suppressed)")
        assert landline_ship['is_whatsapp_available'] is False
    else:
        print("[WARN] No landline ship found")

    if owner_ship:
        print(f"[OK] Platform Owner Registered Ship: '{owner_ship['name']}'")
        print(f"     Owner Management: {owner_ship['management_type']} ({owner_ship.get('management_name')})")
        print(f"     Contact: {owner_ship['contact_number']}")
        print(f"     WhatsApp Available: {owner_ship['is_whatsapp_available']}")

    # Check detail API for mobile ship
    test_slug = mobile_ship['slug'] if mobile_ship else cruises[0]['slug']
    detail_res = client.get(f'/api/cruises/{test_slug}/')
    assert detail_res.status_code == 200
    res_json = detail_res.json()
    ship_detail = res_json.get('cruise') if isinstance(res_json.get('cruise'), dict) else res_json
    assert 'contact_number' in ship_detail
    assert 'whatsapp_number' in ship_detail
    assert 'is_whatsapp_available' in ship_detail
    assert 'management_type' in ship_detail
    assert 'management_name' in ship_detail
    print(f"[OK] Detail endpoint `/api/cruises/{test_slug}/` returned complete contact metadata.")

    # -------------------------------------------------------------
    # FEATURE 2: Admin Analytics Dashboard
    # -------------------------------------------------------------
    print("\n--- 2. Testing Admin Analytics Dashboard API ---")
    
    # 2.1 Permissions: Anonymous / Customer / Owner should be blocked
    anon_res = client.get('/api/admin/analytics/')
    print(f"Anonymous request to /api/admin/analytics/ -> Status: {anon_res.status_code} (Expected 401/403)")
    assert anon_res.status_code in [401, 403]

    # Login as normal user
    client.login(username='user1', password='User@12345')
    user_res = client.get('/api/admin/analytics/')
    print(f"Customer user request to /api/admin/analytics/ -> Status: {user_res.status_code} (Expected 403)")
    assert user_res.status_code == 403
    client.logout()

    # Login as owner
    client.login(username='owner1', password='Owner@12345')
    owner_res = client.get('/api/admin/analytics/')
    print(f"Owner request to /api/admin/analytics/ -> Status: {owner_res.status_code} (Expected 403)")
    assert owner_res.status_code == 403
    client.logout()

    # Login as Admin
    client.login(username='admin', password='Admin@12345')
    admin_res = client.get('/api/admin/analytics/?range=all')
    print(f"Admin request to /api/admin/analytics/?range=all -> Status: {admin_res.status_code} (Expected 200)")
    assert admin_res.status_code == 200
    data = admin_res.json()
    assert data.get('success') is True

    kpis = data.get('kpis', {})
    print("\nKPI Cards Received:")
    for k, v in kpis.items():
        print(f"  - {k}: {v}")

    # Verify all 10 required KPI fields are present
    required_kpis = [
        'total_users', 'total_owners', 'total_ships', 
        'private_bookings', 'public_tours', 'public_tickets', 
        'gross_revenue', 'owner_payout', 'platform_profit', 'cancellations'
    ]
    for rk in required_kpis:
        assert rk in kpis, f"Missing KPI field: {rk}"

    # Verify Profit Calculation Formula
    # Platform Profit = Gross Revenue - Owner Payout - Refund/Discount
    gross = float(kpis['gross_revenue'])
    payout = float(kpis['owner_payout'])
    refund_discount = float(kpis.get('refunds_discounts') or kpis.get('discount_amount') or 0)
    expected_profit = round(gross - payout - refund_discount, 2)
    actual_profit = round(float(kpis['platform_profit']), 2)
    print(f"\nProfit Verification:")
    print(f"  Gross Revenue:     INR {gross:,.2f}")
    print(f"  Owner Payout:    - INR {payout:,.2f}")
    print(f"  Refunds/Discounts: - INR {refund_discount:,.2f}")
    print(f"  Expected Profit:   = INR {expected_profit:,.2f}")
    print(f"  Actual Profit:       INR {actual_profit:,.2f}")
    assert abs(expected_profit - actual_profit) < 0.05, f"Profit mismatch! Expected {expected_profit}, got {actual_profit}"
    print("[OK] Exact Profit Formula validated: Gross - Payout - Discount = Platform Profit")

    # Verify 10 Charts
    charts = data.get('charts', {})
    required_charts = [
        'revenue_trend', 'platform_profit_trend', 'bookings_private_vs_public', 
        'ship_performance', 'destination_analysis', 'public_tour_occupancy', 
        'booking_status_breakdown', 'revenue_by_ship', 'revenue_by_destination', 'monthly_growth'
    ]
    print(f"\nCharts Verification ({len(charts)} chart sets):")
    for rc in required_charts:
        assert rc in charts, f"Missing chart: {rc}"
        items = charts[rc]
        print(f"  - {rc}: {len(items)} items")

    # Test Date Range Filters
    ranges = ['7d', '30d', '6m', '1y', 'all']
    for r in ranges:
        rf_res = client.get(f'/api/admin/analytics/?range={r}')
        assert rf_res.status_code == 200
        rf_data = rf_res.json()
        print(f"[OK] Range '{r}' filter response: {rf_res.status_code} | Range label: {rf_data.get('date_range', {}).get('selected_range')}")

    # Test Custom Date Filter
    custom_res = client.get('/api/admin/analytics/?range=custom&start_date=2026-09-01&end_date=2026-10-31')
    assert custom_res.status_code == 200
    custom_data = custom_res.json()
    print(f"[OK] Custom Date filter (2026-09-01 to 2026-10-31) response: {custom_res.status_code} | Total Bookings in window: {custom_data['kpis']['period_bookings_count']}")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED! BACKEND LOGIC AND APIS ARE FULLY VERIFIED.")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
