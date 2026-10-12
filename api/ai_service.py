import json
import re
import os
from decimal import Decimal
from datetime import datetime, date, time
from django.conf import settings
from django.db.models import Q
from crosses.models import Cross, Operator, PublicTour, ShipExtra, Route, PrivateCharterRate
from bookings.models import Booking

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


def get_openai_client():
    api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.environ.get('OPENAI_API_KEY', '')
    if not api_key or not HAS_OPENAI:
        return None
    try:
        return OpenAI(api_key=api_key)
    except Exception:
        return None


def lookup_user_ticket(code, user=None):
    """
    Securely looks up booking and ticket details by ticket_code or booking_id.
    Strictly verifies ownership:
    - If user is not authenticated -> returns error requiring login.
    - If ticket belongs to someone else -> returns forbidden security error.
    - Never exposes confidential admin margins or owner payouts.
    """
    if not code:
        return {'success': False, 'error': 'empty_code', 'message': 'Kripya valid ticket ya booking code enter karein.'}

    code = str(code).strip()
    # Remove leading hashes or prefixes if user typed #CH...
    clean_code = code.lstrip('#').strip()

    try:
        booking = Booking.objects.select_related('cross', 'cross__operator', 'cross__owner', 'user', 'public_tour').get(
            Q(ticket_code__iexact=clean_code) |
            Q(booking_id__iexact=clean_code) |
            Q(qr_code_hash__iexact=clean_code)
        )
    except Booking.DoesNotExist:
        return {
            'success': False,
            'error': 'not_found',
            'message': f"Ticket / Booking code '{clean_code}' system me nahi mila. Kripya code check karein."
        }

    # Ownership & Security Verification
    if not user or not user.is_authenticated:
        return {
            'success': False,
            'error': 'auth_required',
            'requires_login': True,
            'message': f"Ticket code '{clean_code}' mil gaya hai, lekin details dekhne ke liye kripya Cross-Hunt account me Sign In karein.",
            'actions': [{'label': 'Sign In to View Ticket', 'url': '/login', 'type': 'navigate'}]
        }

    is_owner = (booking.user_id == user.id)
    is_admin = bool(user.is_staff or getattr(user, 'role', '') == 'ADMIN' or user.is_superuser)
    is_vessel_operator = bool(booking.cross.owner_id == user.id if booking.cross.owner else False)

    if not (is_owner or is_admin or is_vessel_operator):
        return {
            'success': False,
            'error': 'forbidden',
            'message': f"Ye ticket #{clean_code} kisi aur passenger account se linked hai. Privacy aur security guidelines ke tehat aap sirf apni bookings dekh sakte hain.",
            'actions': [{'label': 'View My Bookings', 'url': '/dashboard', 'type': 'navigate'}]
        }

    # Format Safe Information
    ship = booking.cross
    op_name = ship.operator.name if ship.operator else (ship.owner.get_full_name() or 'Cross-Hunt Fleet')
    dep_port = booking.public_tour.departure_port if booking.public_tour else ship.departure_port
    dest = booking.public_tour.destination if booking.public_tour else ship.destination

    extras_list = []
    if isinstance(booking.selected_extras, list):
        for ex in booking.selected_extras:
            if isinstance(ex, dict):
                extras_list.append(ex.get('name', 'Extra item'))
            elif isinstance(ex, str):
                extras_list.append(ex)

    status_labels = {
        'PENDING': 'Pending Confirmation ⏳',
        'CONFIRMED': 'Confirmed ✅',
        'CANCELLED': 'Cancelled ❌',
        'COMPLETED': 'Completed 🏁',
        'REJECTED': 'Rejected ⚠️',
    }

    tracking_labels = {
        'BOOKED': 'Reservation Placed 📝',
        'CONFIRMED': 'Confirmed & Scheduled 🚢',
        'BOARDING': 'Boarding Now at Jetty 🎫',
        'DEPARTED': 'Departed / Sailing 🌊',
        'ARRIVED': 'Arrived at Destination ⚓',
        'COMPLETED': 'Voyage Completed ✨',
        'CANCELLED': 'Voyage Cancelled ❌',
    }

    ticket_status_labels = {
        'VALID': 'Valid Boarding Pass 🟢',
        'USED': 'Boarded / Used 🎟️',
        'CANCELLED': 'Cancelled 🔴',
        'EXPIRED': 'Expired ⚪',
    }

    ticket_data = {
        'booking_id': booking.booking_id,
        'ticket_code': booking.ticket_code or booking.booking_id,
        'passenger_name': booking.user.get_full_name() or booking.user.username,
        'passenger_email': booking.user.email or '',
        'ship_name': ship.name,
        'ship_slug': ship.slug or str(ship.id),
        'ship_category': ship.effective_category,
        'operator_name': op_name,
        'booking_type': 'Private Ship Charter' if booking.booking_type == 'EVENT' else 'Public Cruise Tour Ticket',
        'route': f"{dep_port} → {dest}",
        'departure_port': dep_port,
        'destination': dest,
        'departure_date': booking.booking_date.strftime('%d %b %Y'),
        'departure_time': booking.start_time.strftime('%I:%M %p') if booking.start_time else 'TBD',
        'end_time': booking.end_time.strftime('%I:%M %p') if booking.end_time else 'TBD',
        'cabin_seat': booking.cabin_type or 'General Guest Access',
        'event_type': booking.event_type or '',
        'total_passengers': booking.number_of_people,
        'adults_count': booking.adults_count,
        'children_count': booking.children_count,
        'extras': extras_list,
        'total_price_inr': float(booking.total_price),
        'booking_status': status_labels.get(booking.status, booking.status),
        'ticket_status': ticket_status_labels.get(booking.ticket_status, booking.ticket_status),
        'tracking_status': tracking_labels.get(booking.tracking_status, booking.tracking_status),
        'is_used': booking.ticket_status == 'USED',
    }

    # Structured action buttons for the frontend
    actions = [
        {'label': '🎫 View Ticket / Boarding Pass', 'url': f"/ticket/verify/{booking.ticket_code or booking.booking_id}", 'type': 'navigate', 'variant': 'primary'},
        {'label': '🚢 My Dashboard Trips', 'url': '/dashboard', 'type': 'navigate', 'variant': 'outline'},
        {'label': '⚓ Ship Details', 'url': f"/cruises/{ship.slug or ship.id}", 'type': 'navigate', 'variant': 'ghost'},
    ]

    return {
        'success': True,
        'ticket': ticket_data,
        'actions': actions
    }


def build_system_knowledge(user=None):
    """
    Builds comprehensive RAG knowledge base for Cross-Hunt assistant.
    Safely includes only user's own bookings if authenticated.
    """
    ships = Cross.objects.filter(is_active=True).select_related('operator', 'owner').prefetch_related('extras')[:30]
    operators = Operator.objects.all()[:20]
    tours = PublicTour.objects.filter(is_published=True).select_related('ship', 'operator').order_by('departure_date')[:25]

    ships_info = []
    for s in ships:
        op = s.operator.name if s.operator else (s.owner.get_full_name() or 'Cross-Hunt Fleet')
        extras_names = [e.name for e in s.extras.filter(is_available=True)[:5]]
        ships_info.append(
            f"- Vessel: {s.name} (Slug: {s.slug or s.id}) | Type: {s.effective_category} | Operator: {op} | Base: {s.location} | "
            f"Capacity: {s.display_capacity_text} | Price: {s.formatted_price_basis} (Unit: {s.price_unit}) | "
            f"Route: {s.route} | Facilities: {s.facilities[:120]} | Supports: "
            f"{'Weddings, ' if s.supports_weddings else ''}{'Birthdays, ' if s.supports_birthdays else ''}"
            f"{'Corporate, ' if s.supports_corporate else ''}{'Private Charter' if s.supports_private_charter else ''} | "
            f"Extras: {', '.join(extras_names) if extras_names else 'Available on request'}"
        )

    tours_info = []
    for t in tours:
        tours_info.append(
            f"- Tour: {t.tour_title} (Slug: {t.slug or t.id}) | Ship: {t.ship.name} | "
            f"Departure: {t.departure_port} ({t.departure_date} at {t.departure_time}) → {t.destination} | "
            f"Adult Fare: ₹{t.adult_price:,.0f} | Child Fare: ₹{t.child_price:,.0f} | Status: {t.status} | "
            f"Meals: {t.meals_included} | Duration: {t.duration_display or f'{t.duration_days} days'}"
        )

    ops_info = []
    for o in operators:
        ops_info.append(
            f"- Operator: {o.name} | Port: {o.location} | Phone: {o.phone or o.whatsapp_number} | "
            f"Website: {o.website} | Verified: {o.verified} (Source Checked: {o.source_checked})"
        )

    # User's personal trips (Strictly authenticated user only!)
    user_bookings_info = []
    if user and user.is_authenticated:
        recent_bookings = Booking.objects.filter(user=user).select_related('cross', 'public_tour').order_by('-created_at')[:5]
        for b in recent_bookings:
            user_bookings_info.append(
                f"- User Booking ID: {b.booking_id} | Ticket Code: {b.ticket_code or b.booking_id} | "
                f"Ship: {b.cross.name} | Date: {b.booking_date} | Type: {b.booking_type} | "
                f"Status: {b.status} | Ticket Status: {b.ticket_status} | Total: ₹{b.total_price:,.0f}"
            )

    knowledge_text = f"""
### Cross-Hunt Platform Overview:
Cross-Hunt is India's leading unified marine and cruise booking platform covering:
1. Product A: PRIVATE CHARTER (Full Vessel Hire: yachts, luxury party boats, catamarans, river cruise ships for private groups, birthdays, weddings, celebrations, corporate outings).
2. Product B: PUBLIC / SHARED TOURS (Individual seat/cabin tickets on ocean liners like Cordelia Cruises, Mandovi river sunset cruises, Andaman inter-island fast ferries like Nautika, Green Ocean).

### Real Website Routing Guide (Use ONLY these paths for action buttons):
- Home Page: /
- Explore Private Ships & Charters: /explore
- Ship Details: /cruises/<slug_or_id>
- Book Private Charter: /book-cruise/<slug_or_id>
- Public Scheduled Tours: /tours
- Tour Details: /tours/<slug_or_id>
- Book Tour Ticket: /book-tour/<slug_or_id>
- Private Celebrations & Events: /events
- Customer Dashboard & My Bookings: /dashboard
- Boarding Pass / Ticket QR Verification: /ticket/verify/<code>
- Operator / Fleet Owner Dashboard: /owner
- Admin Panel: /admin-panel
- Sign In: /login
- Sign Up: /register

### Verified Indian Marine Research Knowledge (Source Date: 01 Oct 2026):
- Cordelia Cruises: Luxury ocean cruise ship (Empress). Routes: Mumbai round-trip, Mumbai-Goa, Mumbai-Kochi, Mumbai/Goa-Agatti (Lakshadweep), Kochi-Malé. Fares depend on sailing date and stateroom cabin category.
- Andaman Yacht Rentals (Port Blair & Havelock): Private AC yacht charters. Published rates: ₹30,000 for 2.5 hours, ₹50,000 for 4 hours, ₹75,000 full day. Base package covers up to 6 guests (max 12). 18% GST extra; permits ₹500 for Indian and ₹2,500 for foreign guests.
- Lacadives: Havelock, Andaman bespoke sea trips and private boat charters starting from ₹15,000/hour.
- Neo Classic Cruises (Kochi Marine Drive): Classic Paradise & Classic Imperial. Private harbour charter up to 150 guests (from ₹12,500/hour or quote based); scheduled lunch/dinner/sunset cruises from ₹500–₹2,300/person.
- Paradise Cruises & Mandovi Cruises (Goa, Mandovi River, Panaji): Sunset cruises (₹500–₹600), Dinner cruises with live Goan folklore and DJ (₹1,200–₹1,500), Dolphin sightseeing (₹400).
- Nautika & Green Ocean Seaways: Fast luxury catamarans in Andaman connecting Port Blair, Swaraj Dweep (Havelock), and Shaheed Dweep (Neil). Indicative fares ₹1,250–₹3,400.
- Pricing Integrity Rule: Quote-based listings should be clearly indicated as 'Price on Request'. Always distinguish per-person pricing from whole-boat charters.

### Policies & Booking FAQs:
- Cancellation Policy: Public tours can be cancelled up to 48 hours prior for full refund (less nominal processing fee); 50% between 24-48 hours; non-refundable within 24 hours of embarkation. Private charter cancellations are governed by operator charter agreements.
- Boarding & QR Code: Every confirmed booking generates a unique Boarding Pass with a verified Ticket Code and QR code. Passengers should arrive at the embarkation jetty 30–45 minutes prior to departure with a government-issued photo ID.
- Payment & Security: Online payments are processed through secure 256-bit encrypted gateways. Tickets and invoices are immediately available in the user dashboard.

### Active Ships in Database:
{chr(10).join(ships_info)}

### Published Scheduled Public Tours:
{chr(10).join(tours_info)}

### Verified Operators:
{chr(10).join(ops_info)}
"""

    if user and user.is_authenticated:
        knowledge_text += f"""
### Logged-In User Context:
- User Name: {user.get_full_name() or user.username}
- Email: {user.email or 'N/A'}
- Recent Bookings for this User:
{chr(10).join(user_bookings_info) if user_bookings_info else 'No prior bookings placed yet.'}
"""
    else:
        knowledge_text += """
### Logged-In User Context:
- User is currently browsing as a Guest (Not logged in).
- To access private ticket or booking details, they must log in.
"""

    return knowledge_text


def extract_requirements_from_text(text):
    """
    Extracts structured requirements from conversational inputs.
    e.g. 'Mere 30 guests hain birthday ke liye Goa me 4 hours ka private cruise chahiye.'
    """
    text_lower = text.lower()
    requirements = {}

    # Headcount / Guests
    guest_match = re.search(r'(\d+)\s*(?:guests?|people|persons?|pax|log|members?|adults?)', text_lower)
    if guest_match:
        requirements['guests'] = int(guest_match.group(1))

    # Duration
    duration_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|ghante?|hrs?|h)\b', text_lower)
    if duration_match:
        requirements['duration_hours'] = float(duration_match.group(1))

    # Occasion / Purpose
    if 'birthday' in text_lower or 'janamdin' in text_lower:
        requirements['purpose'] = 'Birthday Party'
    elif 'wedding' in text_lower or 'shaadi' in text_lower or 'marriage' in text_lower or 'reception' in text_lower:
        requirements['purpose'] = 'Wedding Celebration'
    elif 'corporate' in text_lower or 'office' in text_lower or 'meeting' in text_lower or 'conference' in text_lower:
        requirements['purpose'] = 'Corporate Event'
    elif 'anniversary' in text_lower or 'saalgirah' in text_lower:
        requirements['purpose'] = 'Anniversary Celebration'
    elif 'party' in text_lower or 'celebration' in text_lower:
        requirements['purpose'] = 'Private Party'

    # Location
    locations = ['goa', 'mumbai', 'kochi', 'cochin', 'andaman', 'port blair', 'havelock', 'kerala', 'lakshadweep', 'chennai']
    for loc in locations:
        if loc in text_lower:
            requirements['location'] = loc.capitalize()
            break

    # Ticket Code detection (avoid matching Hindi words like 'chahiye', require CH followed by digits or hyphen)
    ticket_match = re.search(r'\b(CH\d+[A-Z0-9-]*|CH-[A-Z0-9-]+|TKT-[A-Z0-9-]+)\b', text, re.IGNORECASE)
    if ticket_match:
        code_found = ticket_match.group(1).upper()
        # Verify it has at least one digit or hyphen
        if any(char.isdigit() for char in code_found) or '-' in code_found:
            requirements['ticket_code'] = code_found


    return requirements


def smart_local_rag_respond(query, user=None, conversation_history=None):
    """
    Intelligent local RAG response engine that generates rich, accurate, multilingual answers
    with real actions even if external AI API is unreachable.
    """
    q_lower = query.lower().strip()
    extracted = extract_requirements_from_text(query)
    actions = []
    data = {}

    # 1. TICKET CODE LOOKUP REQUEST
    ticket_code = extracted.get('ticket_code')
    if not ticket_code:
        # Check if user mentioned ticket code pattern like 'CH123...'
        code_candidates = re.findall(r'[A-Za-z0-9_-]{5,20}', query)
        for c in code_candidates:
            c_up = c.upper()
            if (c_up.startswith('CH') or c_up.startswith('TKT')) and (any(ch.isdigit() for ch in c_up) or '-' in c_up):
                ticket_code = c_up
                break


    if ticket_code or 'ticket' in q_lower or 'booking code' in q_lower or 'boarding pass' in q_lower:
        if ticket_code:
            lookup = lookup_user_ticket(ticket_code, user)
            if lookup.get('success'):
                t = lookup['ticket']
                data['ticket'] = t
                reply = (
                    f"Sure! Here are your verified booking details for **#{t['ticket_code']}** 🎫\n\n"
                    f"• **Passenger:** {t['passenger_name']}\n"
                    f"• **Ship / Vessel:** {t['ship_name']} ({t['operator_name']})\n"
                    f"• **Type:** {t['booking_type']}\n"
                    f"• **Route:** {t['route']}\n"
                    f"• **Date & Time:** {t['departure_date']} at {t['departure_time']}\n"
                    f"• **Cabin / Seat:** {t['cabin_seat']}\n"
                    f"• **Headcount:** {t['total_passengers']} Passenger(s) ({t['adults_count']} Adults, {t['children_count']} Children)\n"
                    f"• **Booking Status:** {t['booking_status']}\n"
                    f"• **Boarding Status:** {t['ticket_status']}\n"
                    f"• **Journey Progress:** {t['tracking_status']}\n"
                    f"• **Total Fare:** ₹{t['total_price_inr']:,.2f}\n"
                )
                if t['extras']:
                    reply += f"• **Selected Extras:** {', '.join(t['extras'])}\n"
                reply += (
                    f"\nNeeche diye gaye action button par click karke aap apna digital QR boarding pass open kar sakte hain!"
                )
                return {
                    'reply': reply,
                    'actions': lookup.get('actions', []),
                    'data': data
                }
            else:
                return {
                    'reply': f"🐬 **Cross-Hunt AI:**\n{lookup.get('message')}",
                    'actions': lookup.get('actions', [{'label': 'Go to Dashboard', 'url': '/dashboard', 'type': 'navigate'}]),
                    'data': {}
                }
        elif user and user.is_authenticated:
            # Show user's recent tickets
            my_bookings = Booking.objects.filter(user=user).select_related('cross', 'public_tour').order_by('-created_at')[:3]
            if my_bookings.exists():
                reply = "Aapke account me ye bookings mili hain:\n\n"
                for b in my_bookings:
                    t_code = b.ticket_code or b.booking_id
                    reply += (
                        f"🎫 **Booking #{t_code}**\n"
                        f"• Ship: {b.cross.name}\n"
                        f"• Date: {b.booking_date.strftime('%d %b %Y')}\n"
                        f"• Status: {b.status} | Pass: {b.ticket_status}\n\n"
                    )
                reply += "Aap kis booking ki detail dekhna chahte hain? Code bataiye ya Dashboard par click karein."
                return {
                    'reply': reply,
                    'actions': [
                        {'label': 'Open Dashboard', 'url': '/dashboard', 'type': 'navigate', 'variant': 'primary'},
                        {'label': 'Explore More Trips', 'url': '/explore', 'type': 'navigate', 'variant': 'outline'}
                    ]
                }
            else:
                return {
                    'reply': "Aapke account me abhi koi active booking ya ticket nahi hai. Aap website par naye private cruise ya public tours explore kar sakte hain! 🚢✨",
                    'actions': [
                        {'label': 'Browse Public Cruises', 'url': '/tours', 'type': 'navigate', 'variant': 'primary'},
                        {'label': 'Explore Private Yachts', 'url': '/explore', 'type': 'navigate', 'variant': 'outline'}
                    ]
                }
        else:
            return {
                'reply': "Apna ticket dekhne ke liye kripya apna **Ticket Code** ya **Booking ID** provide karein (jaise `CH123456`), ya apne account me Sign In karein. 🎫",
                'actions': [
                    {'label': 'Sign In', 'url': '/login', 'type': 'navigate', 'variant': 'primary'},
                    {'label': 'Go to Home', 'url': '/', 'type': 'navigate', 'variant': 'outline'}
                ]
            }

    # 2. WEBSITE GUIDE & HOW TO BOOK (Handles 'kaha book karu', 'kaise book kare', etc.)
    is_guide_query = any(w in q_lower for w in ['kaha', 'kahan', 'kaise', 'where', 'how to', 'steps', 'guide', 'kidhar', 'cancel', 'refund'])
    if is_guide_query and not (extracted.get('guests') and extracted.get('duration_hours')):
        if 'private' in q_lower or 'charter' in q_lower or 'yacht' in q_lower:
            reply = (
                "🐬 **Private Cruise Booking Guide:**\n\n"
                "**Home → Private Charter → Requirements fill karo → Matching ships select karo → Extras choose karo → Confirm Booking.**\n\n"
                "1. **Home → Private Charter** (`/explore`) par jayein.\n"
                "2. Apna base location (Goa, Mumbai, Kochi, Andaman) aur guest count filter karein.\n"
                "3. Apni pasand ka yacht / ship select karein (`View Details`).\n"
                "4. Date, start time aur duration (e.g. 2, 4 ya full day) choose karein.\n"
                "5. Customized Extras (DJ, Live Chef, Birthday Decor, Drone Shoots) add karein.\n"
                "6. Booking details review karke **Confirm Booking** karein."
            )
            return {
                'reply': reply,
                'actions': [
                    {'label': 'Browse Private Charters', 'url': '/explore', 'type': 'navigate', 'variant': 'primary'},
                    {'label': 'Private Events Packages', 'url': '/events', 'type': 'navigate', 'variant': 'outline'}
                ]
            }
        elif 'cancel' in q_lower or 'refund' in q_lower:
            reply = (
                "🐬 **Cancellation & Refund Policy:**\n\n"
                "• **Public Tours:** Departure se 48 hours pehle cancel karne par 100% refund (processing charges exclude) milta hai. "
                "24 se 48 hours ke beech 50% refund hota hai, aur within 24 hours non-refundable rehta hai.\n"
                "• **Private Charters:** Har operator ke charter terms ke anusar process hota hai.\n"
                "• **Cancel Kaise Karein?** Dashboard (`/dashboard`) → My Bookings → Select Trip → `Cancel Booking` button click karein."
            )
            return {
                'reply': reply,
                'actions': [
                    {'label': 'Go to Dashboard', 'url': '/dashboard', 'type': 'navigate', 'variant': 'primary'}
                ]
            }
        else:
            reply = (
                "🐬 **Cross-Hunt Website Navigation Guide:**\n\n"
                "• **Public Cruises:** `Home → Public Tours` (`/tours`) par jakar seat ya cabin book karein.\n"
                "• **Private Charter:** `Home → Private Charter` (`/explore`) par pura vessel hire karein.\n"
                "• **Events & Weddings:** `Events` (`/events`) me special celebration packages dekhein.\n"
                "• **Tickets & Bookings:** `Dashboard` (`/dashboard`) me apne digital tickets aur live voyage status track karein.\n"
                "• **Boarding Pass Verification:** Har ticket par unique QR Code hota hai jo embarkation jetty par scan hota hai."
            )
            return {
                'reply': reply,
                'actions': [
                    {'label': 'Explore Ships', 'url': '/explore', 'type': 'navigate', 'variant': 'primary'},
                    {'label': 'Scheduled Tours', 'url': '/tours', 'type': 'navigate', 'variant': 'outline'},
                    {'label': 'My Dashboard', 'url': '/dashboard', 'type': 'navigate', 'variant': 'ghost'}
                ]
            }

    # 3. PUBLIC TOURS HELP (e.g. Mumbai to Goa, Scheduled Fares)
    if 'public' in q_lower or 'tour' in q_lower or 'ferry' in q_lower or ('mumbai' in q_lower and 'goa' in q_lower) or 'cordelia' in q_lower or 'nautika' in q_lower:
        loc = extracted.get('location')
        tours_qs = PublicTour.objects.filter(is_published=True)
        if loc:
            tours_qs = tours_qs.filter(Q(departure_port__icontains=loc) | Q(destination__icontains=loc))
        tours_list = tours_qs.order_by('departure_date')[:3]

        if tours_list.exists():
            reply = "Cross-Hunt par available scheduled public cruises & tours ye hain 🚢🌊:\n\n"
            actions = [
                {'label': 'Browse All Scheduled Tours', 'url': '/tours', 'type': 'navigate', 'variant': 'primary'}
            ]
            for t in tours_list:
                reply += (
                    f"🎫 **{t.tour_title}**\n"
                    f"• Ship: {t.ship.name} | Operator: {t.ship.effective_operator_name}\n"
                    f"• Route: {t.departure_port} → {t.destination}\n"
                    f"• Departure: {t.departure_date.strftime('%d %b %Y')} at {t.departure_time.strftime('%I:%M %p')}\n"
                    f"• Fare: Starting from ₹{t.adult_price:,.0f} / adult ({t.meals_included})\n\n"
                )
                actions.append({
                    'label': f"Book {t.tour_title[:20]}...",
                    'url': f"/book-tour/{t.slug or t.id}",
                    'type': 'navigate',
                    'variant': 'outline'
                })
            reply += "Aap specific sailing date aur cabin category choose karke instant confirmed ticket book kar sakte hain."
            return {'reply': reply, 'actions': actions, 'data': {}}

    # 4. PRIVATE CHARTER REQUIREMENTS EXTRACTION & MATCHING
    if extracted.get('guests') or extracted.get('purpose') or 'private' in q_lower or 'charter' in q_lower or 'yacht' in q_lower:
        loc = extracted.get('location')
        guests = extracted.get('guests', 12)
        purpose = extracted.get('purpose', 'Private Charter')
        duration = extracted.get('duration_hours')

        # Filter matching vessels
        qs = Cross.objects.filter(is_active=True, supports_private_charter=True)
        if loc:
            qs = qs.filter(Q(location__icontains=loc) | Q(route__icontains=loc))
        if guests:
            # Ships that have capacity >= guests or unknown capacity
            qs = qs.filter(Q(capacity__gte=guests) | Q(has_unknown_capacity=True) | Q(capacity=0))

        matches = qs[:3]
        if not matches.exists():
            # Fallback to general active private ships
            matches = Cross.objects.filter(is_active=True, supports_private_charter=True)[:3]

        reply = (
            f"Maine aapke requirements extract kar liye hain 🐬✨:\n\n"
            f"• **Booking Type:** Private Charter / Vessel Hire 🚢\n"
            f"• **Headcount / Guests:** {guests} Guests\n"
            f"• **Occasion / Purpose:** {purpose}\n"
            f"• **Location:** {loc if loc else 'Any Coastal Port (Goa, Mumbai, Kochi, Andaman)'}\n"
        )
        if duration:
            reply += f"• **Duration:** {duration} Hours\n"

        reply += "\n**Aapke requirements ke anusar matching private ships:**\n"
        actions = []
        for s in matches:
            reply += f"\n⚓ **{s.name}** ({s.location})\n"
            reply += f"   • Capacity: {s.display_capacity_text} | Price: {s.formatted_price_basis}\n"
            reply += f"   • Facilities: {s.facilities[:90]}...\n"
            actions.append({
                'label': f"View {s.name}",
                'url': f"/cruises/{s.slug or s.id}",
                'type': 'navigate',
                'variant': 'outline'
            })

        actions.insert(0, {
            'label': 'Explore All Matching Ships',
            'url': f"/explore{f'?location={loc}' if loc else ''}",
            'type': 'navigate',
            'variant': 'primary'
        })

        reply += (
            f"\n\n**Next Step:** Kisi bhi ship par click karke aap inclusions aur customized extras (DJ, Cake, Decorations, Catering) select kar sakte hain. "
            f"Final confirmation user explicit approval ke baad hi place hoti hai!"
        )

        return {'reply': reply, 'actions': actions, 'data': {'extracted': extracted}}

    # 5. GENERAL FRIENDLY CRUISE HELP / FAQ

    reply = (
        "Namaste! 👋 Main hoon **Cross-Hunt AI** 🐬, aapka personal cruise assistant.\n\n"
        "Aap mujhse pooch sakte hain:\n"
        "• 🎫 **My Ticket Details:** Apna ticket code likhein (e.g. `Mera ticket code CH123456 hai`)\n"
        "• 🚢 **Cruise Search:** Public ocean cruises ya private yacht charters search karein\n"
        "• 📍 **Routes & Ports:** Goa, Mumbai, Kochi, Andaman, Lakshadweep ke verified routes\n"
        "• ⚓ **Ship Facilities:** AC, DJ sound, dining, cabins, passenger capacity\n"
        "• 🗺️ **Website Guide:** Website par kisi bhi page ya booking step ki jankari\n\n"
        "Aap Hindi, Hinglish ya English me jo chahein pooch sakte hain!"
    )
    return {
        'reply': reply,
        'actions': [
            {'label': 'Explore Private Yachts', 'url': '/explore', 'type': 'navigate', 'variant': 'primary'},
            {'label': 'Scheduled Public Tours', 'url': '/tours', 'type': 'navigate', 'variant': 'outline'},
            {'label': 'My Dashboard & Tickets', 'url': '/dashboard', 'type': 'navigate', 'variant': 'ghost'}
        ]
    }


def generate_ai_chat_response(messages, user=None, current_path=None):
    """
    Main AI chat handler:
    1. Checks if ticket lookup or requirement search is triggered.
    2. Uses OpenAI with full RAG system context if key is active.
    3. Seamlessly falls back to smart local RAG engine if OpenAI quota or network is offline.
    """
    if not messages or not isinstance(messages, list):
        return smart_local_rag_respond("Hello", user=user)

    latest_msg = messages[-1].get('content', '') if messages else ''
    extracted = extract_requirements_from_text(latest_msg)

    # Check for direct ticket lookup in the message
    if extracted.get('ticket_code'):
        return smart_local_rag_respond(latest_msg, user=user, conversation_history=messages)

    client = get_openai_client()
    if not client:
        return smart_local_rag_respond(latest_msg, user=user, conversation_history=messages)

    # Prepare OpenAI system prompt with full RAG knowledge base
    knowledge = build_system_knowledge(user=user)
    system_prompt = f"""
You are Cross-Hunt AI 🐬, the smart, friendly, and reliable Personal Cruise AI Assistant for the Cross-Hunt web application (India's premier cruise and private ship rental platform).

Key Guidelines:
1. Languages: Fluently understand and respond in Hindi, Hinglish, or English depending on how the user writes to you.
2. Tone: Warm, polite, maritime-enthusiastic (use tasteful nautical emojis like 🐬🚢⚓🌊✨), clear, and direct.
3. Security & Privacy:
   - NEVER expose user passwords, API keys, payment tokens, internal database IDs, or admin margins/commissions.
   - If a user asks for someone else's ticket or private booking information, strictly refuse with a polite security explanation.
   - Only expose booking data for the currently authenticated user provided in the context.
4. Accurate Routing:
   - When suggesting website navigation, use ONLY these valid routes:
     - / (Home)
     - /explore (Explore Private Ships & Charters)
     - /cruises/<slug_or_id> (Ship details)
     - /book-cruise/<slug_or_id> (Book Private Charter)
     - /tours (Public Scheduled Cruise Tours)
     - /tours/<slug_or_id> (Tour details)
     - /book-tour/<slug_or_id> (Book Tour Ticket)
     - /events (Private Events: Weddings, Birthdays, Corporate)
     - /dashboard (User Dashboard & My Bookings)
     - /ticket/verify/<code> (QR Boarding Pass Verification)
     - /owner (Operator & Owner Portal)
     - /admin-panel (Admin Console)
     - /login, /register, /contact
5. Action Buttons:
   At the end of your response, output a strict JSON block with recommended action buttons formatted as:
   ```json
   {{
     "actions": [
       {{"label": "Button Text", "url": "/valid-url", "type": "navigate", "variant": "primary|outline|ghost"}}
     ]
   }}
   ```
6. Private Bookings:
   - If user says e.g. "Mere 30 guests hain birthday ke liye Goa me 4 hours ka private cruise chahiye", extract: Guests: 30, Purpose: Birthday, Location: Goa, Duration: 4 hours.
   - Suggest matching ships from the knowledge base and provide direct buttons to view/book them. Do NOT confirm the final payment yourself; guide them to the confirmation page.
7. Public Tours:
   - If user asks for public tours e.g. "Mumbai se Goa cruise chahiye", present available scheduled sailings with departure dates, starting fares, and booking links.
8. Current Location / Page:
   - User is currently on page: {current_path or '/'}

RAG Knowledge Base & Database Inventory:
{knowledge}
"""

    formatted_messages = [{'role': 'system', 'content': system_prompt}]
    # Keep last 8 turns of conversation for context memory
    for m in messages[-8:]:
        role = 'assistant' if m.get('role') in ['assistant', 'ai', 'bot'] else 'user'
        formatted_messages.append({'role': role, 'content': m.get('content', '')})

    model_name = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=formatted_messages,
            temperature=0.7,
            max_tokens=800
        )
        content = response.choices[0].message.content or ''

        # Parse JSON actions if present in the model's reply
        actions = []
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group(1))
                actions = parsed.get('actions', [])
                # Remove the JSON code block from clean displayed text
                content = content.replace(json_match.group(0), '').strip()
            except Exception:
                pass

        # If no actions extracted, generate contextual default action buttons
        if not actions:
            if 'tour' in content.lower() or 'cruise' in content.lower():
                actions.append({'label': 'Explore Tours', 'url': '/tours', 'type': 'navigate', 'variant': 'primary'})
            if 'charter' in content.lower() or 'ship' in content.lower() or 'yacht' in content.lower():
                actions.append({'label': 'Browse Private Ships', 'url': '/explore', 'type': 'navigate', 'variant': 'outline'})
            if 'ticket' in content.lower() or 'booking' in content.lower():
                actions.append({'label': 'My Dashboard', 'url': '/dashboard', 'type': 'navigate', 'variant': 'ghost'})

        return {
            'reply': content,
            'actions': actions,
            'data': {}
        }
    except Exception as e:
        # Fallback cleanly to our high-precision local RAG engine!
        local_res = smart_local_rag_respond(latest_msg, user=user, conversation_history=messages)
        return local_res
