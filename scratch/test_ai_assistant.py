import os
import sys
import json
import django

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cross_booking.settings')
django.setup()


from django.test import RequestFactory
from django.contrib.auth import get_user_model
from bookings.models import Booking
from api.views import api_ai_chat, api_ai_ticket_lookup, api_ai_suggestions
from api.ai_service import lookup_user_ticket, extract_requirements_from_text, generate_ai_chat_response

User = get_user_model()
factory = RequestFactory()

print("=" * 60)
print("🐬 CROSS-HUNT PERSONAL AI CRUISE ASSISTANT - VERIFICATION TEST")
print("=" * 60)

# -------------------------------------------------------------
# 1. ASSET FILES CHECK
# -------------------------------------------------------------
print("\n[TEST 1] 3D Model & Fallback Assets Verification:")
assets = [
    'cross_hunt_dolphin_assistant.glb',
    'frontend/public/cross_hunt_dolphin_assistant.glb',
    'frontend/public/dolphin_icon.png',
    'frontend/public/dolphin_thumbnail.png'
]
for a in assets:
    exists = os.path.exists(a)
    sz = os.path.getsize(a) if exists else 0
    print(f"  • {a}: {'EXISTS' if exists else 'MISSING'} ({sz:,} bytes)")
    assert exists, f"Asset missing: {a}"

# -------------------------------------------------------------
# 2. TICKET LOOKUP & MULTI-USER SECURITY
# -------------------------------------------------------------
print("\n[TEST 2] Ticket Code Lookup & Ownership Security:")
sample_booking = Booking.objects.select_related('user', 'cross').first()
assert sample_booking, "No sample booking in database!"

ticket_code = sample_booking.ticket_code or sample_booking.booking_id
owner_user = sample_booking.user

# Create or get another normal customer user
other_user, _ = User.objects.get_or_create(username='other_customer_ai_test', defaults={'role': 'CUSTOMER'})
other_user.role = 'CUSTOMER'
other_user.is_staff = False
other_user.is_superuser = False
other_user.save()

# 2a. Anonymous Lookup
req_anon = factory.post('/api/ai/ticket-lookup/', data=json.dumps({'code': ticket_code}), content_type='application/json')
from django.contrib.auth.models import AnonymousUser
req_anon.user = AnonymousUser()
res_anon = api_ai_ticket_lookup(req_anon)
print(f"  • Anonymous Lookup HTTP Status: {res_anon.status_code}")
assert res_anon.status_code == 401, "Anonymous user should receive 401!"

# 2b. Another customer accessing User A's ticket (Security Privacy Test)
req_other = factory.post('/api/ai/ticket-lookup/', data=json.dumps({'code': ticket_code}), content_type='application/json')
req_other.user = other_user
res_other = api_ai_ticket_lookup(req_other)
print(f"  • Unauthorized User HTTP Status: {res_other.status_code}")
data_other = json.loads(res_other.content)
print(f"  • Unauthorized message: {data_other.get('message')}")
assert res_other.status_code == 403, "Other user must receive 403 Forbidden!"

# 2c. Non-existent ticket code
req_fake = factory.post('/api/ai/ticket-lookup/', data=json.dumps({'code': 'CH_INVALID_9999'}), content_type='application/json')
req_fake.user = owner_user
res_fake = api_ai_ticket_lookup(req_fake)
print(f"  • Invalid Ticket HTTP Status: {res_fake.status_code}")
assert res_fake.status_code == 404, "Invalid code must return 404!"

# 2d. Legitimate Owner User Lookup
req_owner = factory.post('/api/ai/ticket-lookup/', data=json.dumps({'code': ticket_code}), content_type='application/json')
req_owner.user = owner_user
res_owner = api_ai_ticket_lookup(req_owner)
print(f"  • Owner User HTTP Status: {res_owner.status_code}")
assert res_owner.status_code == 200, "Owner user must receive 200 OK!"
data_owner = json.loads(res_owner.content)
t = data_owner['ticket']
print(f"  • Retrieved Ticket: #{t['ticket_code']} | Ship: {t['ship_name']} | Passenger: {t['passenger_name']}")
print(f"  • Booking Status: {t['booking_status']} | Fare: ₹{t['total_price_inr']:,.2f}")
print(f"  • Action buttons returned: {[a['label'] for a in data_owner.get('actions', [])]}")

# -------------------------------------------------------------
# 3. AI CHAT CONVERSATIONAL TESTS (Hindi, Hinglish, English)
# -------------------------------------------------------------
print("\n[TEST 3] Multilingual Chat & Intent Extraction:")

# 3a. Hindi / Ticket Query
req_chat1 = factory.post('/api/ai/chat/', data=json.dumps({
    'messages': [{'role': 'user', 'content': f'Mera ticket code {ticket_code} hai uski detail batao'}]
}), content_type='application/json')
req_chat1.user = owner_user
res_chat1 = api_ai_chat(req_chat1)
data_chat1 = json.loads(res_chat1.content)
print("  • Query 1 (Ticket in Hindi/Hinglish):")
print(f"    Reply preview: {data_chat1['reply'][:140]}...")
print(f"    Actions: {[a['label'] for a in data_chat1['actions']]}")

# 3b. Private Charter Requirements Extraction
req_text = "Mere 30 guests hain birthday ke liye Goa me 4 hours ka private cruise chahiye."
extracted = extract_requirements_from_text(req_text)
print(f"\n  • Query 2 (Private Charter Intent Extraction):")
print(f"    Extracted: {extracted}")
assert extracted['guests'] == 30
assert extracted['purpose'] == 'Birthday Party'
assert extracted['location'] == 'Goa'
assert extracted['duration_hours'] == 4.0

req_chat2 = factory.post('/api/ai/chat/', data=json.dumps({
    'messages': [{'role': 'user', 'content': req_text}]
}), content_type='application/json')
req_chat2.user = owner_user
res_chat2 = api_ai_chat(req_chat2)
data_chat2 = json.loads(res_chat2.content)
print(f"    Reply preview: {data_chat2['reply'][:180]}...")
print(f"    Actions: {[a['label'] for a in data_chat2['actions']]}")

# 3c. Public Cruise Tour Query
req_chat3 = factory.post('/api/ai/chat/', data=json.dumps({
    'messages': [{'role': 'user', 'content': 'Mumbai se Goa public cruise dikhao 4 people ke liye'}]
}), content_type='application/json')
req_chat3.user = owner_user
res_chat3 = api_ai_chat(req_chat3)
data_chat3 = json.loads(res_chat3.content)
print(f"\n  • Query 3 (Public Cruise Tours):")
print(f"    Reply preview: {data_chat3['reply'][:160]}...")
print(f"    Actions: {[a['label'] for a in data_chat3['actions']]}")

# 3d. Website Navigation Guide
req_chat4 = factory.post('/api/ai/chat/', data=json.dumps({
    'messages': [{'role': 'user', 'content': 'Private ship kaha book karu?'}]
}), content_type='application/json')
req_chat4.user = owner_user
res_chat4 = api_ai_chat(req_chat4)
data_chat4 = json.loads(res_chat4.content)
print(f"\n  • Query 4 (Website Navigation Guide):")
print(f"    Reply preview: {data_chat4['reply'][:160]}...")
print(f"    Actions: {[a['label'] for a in data_chat4['actions']]}")

# -------------------------------------------------------------
# 4. SUGGESTIONS ENDPOINT TEST
# -------------------------------------------------------------
print("\n[TEST 4] Quick Suggestions & Chips Endpoint:")
req_sug = factory.get('/api/ai/suggestions/')
req_sug.user = owner_user
res_sug = api_ai_suggestions(req_sug)
data_sug = json.loads(res_sug.content)
print(f"  • Suggestions count: {len(data_sug.get('suggestions', []))}")
print(f"  • Labels: {[s['label'] for s in data_sug.get('suggestions', [])]}")
assert len(data_sug['suggestions']) >= 5

print("\n" + "=" * 60)
print("✅ ALL CROSS-HUNT AI ASSISTANT BACKEND TESTS PASSED SUCCESSFULLY!")
print("=" * 60)
