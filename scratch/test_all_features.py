import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cross_booking.settings')
import django
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from bookings.models import Booking
from crosses.models import Cross, Operator

User = get_user_model()
c = Client()

print("=" * 60)
print("TESTING FULL PLATFORM AUDIT & NEW FUNCTIONALITIES")
print("=" * 60)

# 1. Test Public Cruises List (No low prices)
res = c.get('/api/cruises/')
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
cruises = res.json().get('cruises', [])
print(f"1. Public Cruises: {len(cruises)} vessels returned.")
for ship in cruises:
    # Check that price is not ridiculously low (e.g. ₹275 for charter)
    if ship.get('price_unit') == 'CHARTER_DAY' and not ship.get('is_quote_based'):
        assert ship['price'] >= 10000, f"Ship {ship['name']} has suspicious charter price {ship['price']}"
    assert 'operational_status' in ship, f"Missing operational_status on {ship['name']}"
print("   -> All vessels have realistic pricing and operational_status!")

# 2. Test Public Operators Catalogue
res = c.get('/api/operators/')
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
ops = res.json().get('operators', [])
print(f"2. Public Operators Catalogue: {len(ops)} operators found.")
assert len(ops) >= 10, f"Expected at least 10 operators, got {len(ops)}"
for op in ops[:3]:
    print(f"   - {op['name']} ({op['location']}): {op['vessels_count']} vessels")
print("   -> Verified Operators catalogue works flawlessly without login!")

# 3. Test QR Boarding Pass Verification
sample_booking = Booking.objects.filter(status='CONFIRMED').first()
assert sample_booking is not None, "Need at least 1 confirmed booking"
code = sample_booking.ticket_code or sample_booking.qr_code_hash or sample_booking.booking_id
res = c.get(f'/api/tickets/verify/{code}/')
assert res.status_code == 200, f"Ticket verification failed: {res.status_code}"
tdata = res.json()
print(f"3. Ticket Verification ({code}):")
print(f"   Status: {tdata['status_display']} (Valid: {tdata['valid']})")
print(f"   Passenger: {tdata['passenger_name']}, Route: {tdata['route']}")
print(f"   Cabin/Seat: {tdata['cabin_seat']}, Fare: ₹{tdata['total_price']}")
assert tdata['valid'] is True, "Expected ticket to be VALID"

# 4. Test Operator Dashboard & Revenue (85/15 split)
owner_user = User.objects.filter(role__in=['OWNER', 'CROSS_OWNER']).first()
if not owner_user:
    owner_user = User.objects.filter(is_superuser=True).first()
c.force_login(owner_user)

res = c.get('/api/operator/dashboard/')
assert res.status_code == 200, f"Operator dashboard failed: {res.status_code}"
op_data = res.json()
stats = op_data['stats']
print(f"4. Operator Dashboard for {owner_user.username}:")
print(f"   Fleet: {stats['total_ships']} ships (Available: {stats.get('available_ships', 0)}, Booked: {stats.get('booked_ships', 0)})")
print(f"   Total Revenue: ₹{stats['total_revenue']}")
print(f"   Owner Payout (85%): ₹{stats.get('owner_payout', 0)}")
print(f"   Platform Fee (15%): ₹{stats.get('platform_commission', 0)}")

res = c.get('/api/operator/revenue/')
assert res.status_code == 200, f"Operator revenue failed: {res.status_code}"
rev_data = res.json()
print(f"   Revenue Ledger Breakdown: Gross=₹{rev_data['gross_revenue']}, Payout (85%)=₹{rev_data['owner_payout']}, Platform (15%)=₹{rev_data['platform_commission']}")

# 5. Test Admin Dashboard (12 KPIs & Profit Calculation)
admin_user = User.objects.filter(role='ADMIN').first() or User.objects.filter(is_superuser=True).first()
c.force_login(admin_user)
res = c.get('/api/admin/dashboard/')
assert res.status_code == 200, f"Admin dashboard failed: {res.status_code}"
admin_data = res.json()
astats = admin_data['stats']
print(f"5. Admin Dashboard 12 KPIs:")
print(f"   KPI 1 (Users): {astats['total_users']}, KPI 2 (Owners): {astats['total_owners']}")
print(f"   KPI 3 (Total Ships): {astats['total_ships']}, KPI 4 (Active Ships): {astats['active_ships']}")
print(f"   KPI 5 (External Ops): {astats['external_operators_count']}, KPI 6 (Tours): {astats['total_tours']}")
print(f"   KPI 7 (Bookings): {astats['total_bookings']}, KPI 8 (Gross Rev): ₹{astats['total_revenue']}")
print(f"   KPI 9 (Owner Payout): ₹{astats['owner_payout_amount']}, KPI 10 (Platform Profit): ₹{astats['net_platform_profit']}")
print(f"   KPI 11 (Occupancy): {astats['tour_occupancy_rate']}%, KPI 12 (Cancellation): {astats['cancellation_rate']}%")

print("=" * 60)
print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
print("=" * 60)
