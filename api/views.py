import json
import re
import urllib.parse
import uuid
from decimal import Decimal
from datetime import datetime, date, time, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Avg, Sum, Count
from django.utils import timezone
from crosses.models import (
    Cross, CrossReview, ShipExtra, PublicTour, Offer,
    Operator, PrivateCharterRate, TourFare, Route
)
from bookings.models import Booking, SystemSetting, WhatsAppMessageLog
from bookings.whatsapp_service import (
    normalize_whatsapp_number,
    mask_whatsapp_number,
    build_tour_reminder_text,
    send_whatsapp_api_message,
    dispatch_tour_reminders_batch,
    get_configured_reminder_hours,
    set_configured_reminder_hours
)
from django.conf import settings
import os

User = get_user_model()


def is_valid_whatsapp_mobile(phone_str):
    """Checks if a phone number string corresponds to a valid mobile number capable of WhatsApp."""
    if not phone_str:
        return False
    digits = re.sub(r'\D', '', str(phone_str))
    # Indian mobile: 10 digits starting with 6, 7, 8, 9
    if len(digits) == 10 and digits[0] in '6789':
        return True
    # Indian mobile with 91 prefix: 12 digits starting with 91 and next digit in 6, 7, 8, 9
    if len(digits) == 12 and digits.startswith('91') and digits[2] in '6789':
        return True
    # Indian mobile with leading 0: 11 digits starting with 0 and next digit in 6, 7, 8, 9
    if len(digits) == 11 and digits.startswith('0') and digits[1] in '6789':
        return True
    # Known Indian landline STD codes
    if digits.startswith(('03192', '3192', '022', '011', '080', '044', '033', '0484', '0832')):
        return False
    # General mobile with international prefix (between 10 and 15 digits)
    if 10 <= len(digits) <= 15 and not digits.startswith(('0', '1')):
        return True
    return False


def get_user_dict(user):
    if not user.is_authenticated:
        return None
    is_admin = bool(user.role == 'ADMIN' or user.is_superuser or user.is_staff)
    is_operator = bool(getattr(user, 'is_owner', False) or user.role in ['OWNER', 'CROSS_OWNER'])
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'full_name': user.get_full_name() or user.username,
        'email': user.email or '',
        'phone': getattr(user, 'phone', '') or '',
        'whatsapp_number': getattr(user, 'whatsapp_number', '') or '',
        'address': getattr(user, 'address', '') or '',
        'role': user.role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_owner': is_operator,
        'is_operator': is_operator,
        'is_admin': is_admin,
        'is_approved_owner': getattr(user, 'is_approved_owner', True),
    }


def serialize_extra(extra):
    return {
        'id': extra.id,
        'name': extra.name,
        'description': extra.description,
        'price': float(extra.price),
        'pricing_mode': extra.pricing_mode,
        'is_available': extra.is_available,
    }


def serialize_charter_rate(r):
    return {
        'id': r.id,
        'duration': r.duration,
        'duration_hours': float(r.duration_hours),
        'price': float(r.price) if r.price is not None else None,
        'currency': r.currency,
        'price_unit': r.price_unit,
        'is_quote_based': r.is_quote_based,
        'formatted_display': r.formatted_display,
        'minimum_guests': r.minimum_guests,
        'maximum_guests': r.maximum_guests,
        'included': r.included,
        'extra_charges': r.extra_charges,
        'validity': r.validity,
        'source': r.source,
    }


def serialize_cruise(cruise):
    extras = [serialize_extra(e) for e in cruise.extras.filter(is_available=True)]
    charter_rates = [serialize_charter_rate(r) for r in cruise.charter_rates.all()] if hasattr(cruise, 'charter_rates') else []
    
    management_type = 'PLATFORM'
    op_name = cruise.effective_operator_name
    op_id = cruise.operator.id if cruise.operator else (cruise.owner.id if cruise.owner else None)
    op_phone = ''
    op_wa = ''
    op_email = ''
    op_website = ''
    op_booking_url = ''

    if cruise.operator:
        management_type = 'OPERATOR'
        op_name = cruise.operator.name
        # Contact number strictly from source operator data or vessel contact
        op_phone = cruise.contact_number or cruise.operator.phone or ''
        # WhatsApp number - strictly verified mobile, never a landline
        candidate_wa = cruise.whatsapp_number or cruise.operator.whatsapp_number or ''
        if is_valid_whatsapp_mobile(candidate_wa):
            op_wa = candidate_wa
        elif not cruise.whatsapp_number and is_valid_whatsapp_mobile(op_phone):
            op_wa = op_phone
        else:
            op_wa = ''
        op_email = cruise.email or cruise.operator.email or ''
        op_website = cruise.website or cruise.operator.website or ''
        op_booking_url = cruise.booking_url or cruise.operator.booking_url or ''
    elif cruise.owner:
        # Check if owner is a registered platform owner (role OWNER or CROSS_OWNER or is_owner)
        is_registered_owner = bool(getattr(cruise.owner, 'role', '') in ['OWNER', 'CROSS_OWNER'] or getattr(cruise.owner, 'is_owner', False))
        if is_registered_owner:
            management_type = 'OWNER'
            op_name = cruise.owner.get_full_name() or cruise.owner.username
            op_phone = getattr(cruise.owner, 'phone', '') or cruise.contact_number or ''
            candidate_wa = getattr(cruise.owner, 'whatsapp_number', '') or cruise.whatsapp_number or ''
            if is_valid_whatsapp_mobile(candidate_wa):
                op_wa = candidate_wa
            elif is_valid_whatsapp_mobile(op_phone):
                op_wa = op_phone
            else:
                op_wa = ''
            op_email = cruise.owner.email or cruise.email or ''
            op_website = cruise.website or ''
            op_booking_url = cruise.booking_url or ''
        else:
            # Regular Customer account: do NOT expose user's personal phone number on public ship page
            management_type = 'PLATFORM'
            op_name = 'Cross-Hunt Fleet Concierge'
            op_phone = ''
            op_wa = ''
            op_email = ''
    else:
        op_phone = cruise.contact_number or ''
        if is_valid_whatsapp_mobile(cruise.whatsapp_number):
            op_wa = cruise.whatsapp_number
        elif is_valid_whatsapp_mobile(op_phone):
            op_wa = op_phone
        else:
            op_wa = ''
        op_email = cruise.email or ''
        op_website = cruise.website or ''
        op_booking_url = cruise.booking_url or ''

    today = timezone.localdate()
    is_in_maintenance = False
    if hasattr(cruise, 'maintenance_periods'):
        is_in_maintenance = cruise.maintenance_periods.filter(is_active=True, start_date__lte=today, end_date__gte=today).exists()

    is_booked_today = False
    if hasattr(cruise, 'bookings'):
        is_booked_today = cruise.bookings.filter(status='CONFIRMED', booking_date=today).exists()

    is_on_tour_today = False
    if hasattr(cruise, 'public_tours'):
        is_on_tour_today = cruise.public_tours.filter(is_published=True, departure_date__lte=today, return_date__gte=today).exists()

    if is_in_maintenance or not cruise.is_active or cruise.availability_status == 'MAINTENANCE':
        operational_status = 'MAINTENANCE'
    elif is_booked_today or cruise.availability_status == 'BOOKED':
        operational_status = 'BOOKED'
    elif is_on_tour_today:
        operational_status = 'ON_TOUR'
    else:
        operational_status = 'AVAILABLE'

    return {
        'id': cruise.id,
        'title': cruise.name,
        'name': cruise.name,
        'slug': cruise.slug,
        'operational_status': operational_status,
        'category': cruise.effective_category,
        'vessel_category': cruise.effective_category,
        'listing_type': cruise.listing_type,
        'destination': cruise.destination,
        'route': cruise.route,
        'departure_port': cruise.departure_port,
        'location': cruise.location,
        'address': cruise.address,
        'price': float(cruise.price),
        'price_per_day': float(cruise.price),
        'price_unit': cruise.price_unit,
        'is_quote_based': cruise.is_quote_based,
        'duration_display': cruise.duration_display or (f"{cruise.duration_days} Days" if cruise.duration_days > 1 else "per charter"),
        'formatted_price_basis': cruise.formatted_price_basis,
        'capacity': cruise.capacity,
        'capacity_note': cruise.capacity_note,
        'has_unknown_capacity': cruise.has_unknown_capacity,
        'display_capacity_text': cruise.display_capacity_text,
        'tax_note': cruise.tax_note,
        'permit_note': cruise.permit_note,
        'fuel_surcharge_note': cruise.fuel_surcharge_note,
        'included': cruise.included,
        'extra_charges': cruise.extra_charges,
        'duration_days': cruise.duration_days,
        'ship_length_meters': cruise.ship_length_meters,
        'beam_meters': cruise.beam_meters,
        'decks_count': cruise.decks_count,
        'cabin_count': cruise.cabin_count,
        'supports_private_charter': cruise.supports_private_charter,
        'supports_public_tours': cruise.supports_public_tours,
        'supports_weddings': cruise.supports_weddings,
        'supports_birthdays': cruise.supports_birthdays,
        'supports_corporate': cruise.supports_corporate,
        'supports_conferences': cruise.supports_conferences,
        'supports_parties': cruise.supports_parties,
        'supports_dinners': cruise.supports_dinners,
        'image': cruise.display_image_url,
        'image_url': cruise.display_image_url,
        'description': cruise.description,
        'facilities': cruise.get_facilities_list(),
        'rules': cruise.rules,
        'cancellation_policy': cruise.cancellation_policy,
        'average_rating': cruise.average_rating,
        'management_type': management_type,
        'management_name': op_name,
        'operator_name': op_name,
        'operator_id': op_id,
        'operator_phone': op_phone,
        'operator_email': op_email,
        'operator_website': op_website,
        'operator_booking_url': op_booking_url,
        'source_url': cruise.source_url,
        'source_checked': cruise.source_checked,
        'last_verified_at': cruise.last_verified_at.strftime('%Y-%m-%d') if cruise.last_verified_at else None,
        'availability_status': cruise.availability_status,
        'vessel_model': cruise.vessel_model or '',
        'ac_status': cruise.ac_status,
        'food_service': cruise.food_service,
        'dj_music': cruise.dj_music,
        'decoration_service': cruise.decoration_service,
        'photography_service': cruise.photography_service,
        'water_sports': cruise.water_sports,
        'extra_services': cruise.extra_services,
        'contact_number': op_phone,
        'whatsapp_number': op_wa,
        'is_whatsapp_available': bool(op_wa and is_valid_whatsapp_mobile(op_wa)),
        'email': op_email,
        'website': op_website,
        'booking_url': op_booking_url,
        'is_external_operator': cruise.is_external_operator,
        'source_price': float(cruise.source_price) if cruise.source_price is not None else float(cruise.price),
        'valid_from': cruise.valid_from.strftime('%Y-%m-%d') if cruise.valid_from else None,
        'valid_to': cruise.valid_to.strftime('%Y-%m-%d') if cruise.valid_to else None,
        'price_review_flag': cruise.price_review_flag,
        'price_review_reason': cruise.price_review_reason,
        'is_active': cruise.is_active,
        'is_approved': cruise.is_approved,
        'is_available': cruise.is_active and cruise.is_approved and cruise.availability_status == 'AVAILABLE',
        'extras': extras,
        'charter_rates': charter_rates,
        'gallery_images': cruise.get_all_gallery_urls() if hasattr(cruise, 'get_all_gallery_urls') else [cruise.display_image_url],
        'maintenance_periods': [
            {
                'start_date': m.start_date.strftime('%Y-%m-%d'),
                'end_date': m.end_date.strftime('%Y-%m-%d'),
                'reason': m.reason
            } for m in cruise.maintenance_periods.filter(is_active=True)
        ] if hasattr(cruise, 'maintenance_periods') else [],
    }

# Backward compatible alias
serialize_ship = serialize_cruise


def serialize_tour(tour):
    ship_data = serialize_cruise(tour.ship)
    cabins = [
        {
            'id': c.id,
            'name': c.name,
            'description': c.description,
            'price_per_person': float(c.price_per_person),
            'total_capacity': c.total_capacity,
            'booked_capacity': c.booked_capacity,
            'remaining_capacity': c.remaining_capacity,
        } for c in tour.cabins.all()
    ] if hasattr(tour, 'cabins') else []

    fares = [
        {
            'id': f.id,
            'cabin_type': f.cabin_type,
            'price': float(f.price) if f.price is not None else None,
            'currency': f.currency,
            'price_unit': f.price_unit,
            'taxes': f.taxes,
            'validity': f.validity,
            'source': f.source,
        } for f in tour.fares.all()
    ] if hasattr(tour, 'fares') else []

    if not cabins and not fares:
        cabins = [
            {'id': 1, 'name': 'Presidential Sea Suite', 'description': 'Private veranda, luxury butler, ocean panorama', 'price_per_person': float(tour.adult_price + Decimal('5000.00')), 'total_capacity': 20, 'booked_capacity': 0, 'remaining_capacity': 20},
            {'id': 2, 'name': 'Royal Ocean Balcony', 'description': 'Private balcony, unobstructed sunset oceanview', 'price_per_person': float(tour.adult_price + Decimal('2500.00')), 'total_capacity': 60, 'booked_capacity': 0, 'remaining_capacity': 60},
            {'id': 3, 'name': 'Premium Oceanview Stateroom', 'description': 'Large picture window with sweeping sea views', 'price_per_person': float(tour.adult_price), 'total_capacity': 80, 'booked_capacity': 0, 'remaining_capacity': 80},
            {'id': 4, 'name': 'Deluxe Interior Haven', 'description': 'Smart ambient lighting, comfortable quiet retreat', 'price_per_person': float(max(Decimal('1000.00'), tour.adult_price - Decimal('1500.00'))), 'total_capacity': 40, 'booked_capacity': 0, 'remaining_capacity': 40},
        ]

    op_name = tour.operator.name if tour.operator else tour.ship.effective_operator_name

    return {
        'id': tour.id,
        'tour_title': tour.tour_title,
        'title': tour.tour_title,
        'slug': tour.slug,
        'ship_id': tour.ship.id,
        'ship_name': tour.ship.name,
        'ship_image': (tour.image_url.strip() if tour.image_url else None) or tour.ship.display_image_url,
        'tour_image': (tour.image_url.strip() if tour.image_url else None) or tour.ship.display_image_url,
        'operator_name': op_name,
        'operator_id': tour.operator.id if tour.operator else None,
        'departure_port': tour.departure_port,
        'destination': tour.destination,
        'departure_date': tour.departure_date.strftime('%Y-%m-%d'),
        'departure_date_formatted': tour.departure_date.strftime('%A, %B %d, %Y'),
        'departure_time': tour.departure_time.strftime('%H:%M'),
        'return_date': tour.return_date.strftime('%Y-%m-%d'),
        'return_date_formatted': tour.return_date.strftime('%A, %B %d, %Y'),
        'return_time': tour.return_time.strftime('%H:%M'),
        'duration_days': tour.duration_days,
        'duration_display': tour.duration_display or (f"{tour.duration_days} Nights" if tour.duration_days > 1 else "1 Day"),
        'total_capacity': tour.total_capacity,
        'booked_capacity': tour.booked_capacity,
        'remaining_capacity': tour.remaining_capacity,
        'adult_price': float(tour.adult_price),
        'child_price': float(tour.child_price),
        'price_unit': tour.price_unit,
        'is_live_pricing': tour.is_live_pricing,
        'itinerary': tour.itinerary,
        'itinerary_highlights': [line.strip() for line in tour.itinerary.split('\n') if line.strip()],
        'ports_of_call': tour.ports_of_call,
        'meals_included': tour.meals_included,
        'tax_note': tour.tax_note,
        'status': tour.status,
        'is_published': tour.is_published,
        'is_bookable': tour.is_bookable,
        'source_url': tour.source_url,
        'source_checked': tour.source_checked,
        'last_verified_at': tour.last_verified_at.strftime('%Y-%m-%d') if tour.last_verified_at else None,
        'ship': ship_data,
        'cabins': cabins,
        'fares': fares,
    }


def serialize_offer(offer):
    return {
        'id': offer.id,
        'code': offer.code,
        'title': offer.title,
        'description': offer.description,
        'discount_type': offer.discount_type,
        'discount_value': float(offer.discount_value),
        'min_booking_amount': float(offer.min_booking_amount),
        'max_discount_amount': float(offer.max_discount_amount) if offer.max_discount_amount else None,
        'valid_from': offer.valid_from.strftime('%Y-%m-%d'),
        'valid_to': offer.valid_to.strftime('%Y-%m-%d'),
        'is_active': offer.is_active,
    }


def serialize_booking(b):
    return {
        'id': b.id,
        'booking_id': b.booking_id,
        'invoice_number': b.invoice_number,
        'booking_type': b.booking_type,
        'cabin_type': b.cabin_type,
        'event_type': b.event_type or '',
        'event_package': b.event_package or '',
        'qr_code_hash': b.qr_code_hash or b.booking_id,
        'cruise_id': b.cross.id,
        'cruise_name': b.cross.name,
        'cruise_title': b.cross.name,
        'cruise_slug': b.cross.slug,
        'cruise_image': b.cross.display_image_url,
        'destination': b.cross.destination,
        'departure_port': b.cross.departure_port,
        'route': b.cross.route,
        'booking_date': b.booking_date.strftime('%Y-%m-%d'),
        'booking_date_formatted': b.booking_date.strftime('%A, %B %d, %Y'),
        'start_time': b.start_time.strftime('%H:%M'),
        'end_time': b.end_time.strftime('%H:%M'),
        'duration_hours': float(b.duration_hours),
        'duration_days': b.cross.duration_days,
        'number_of_people': b.number_of_people,
        'passengers_count': b.number_of_people,
        'adults_count': b.adults_count,
        'children_count': b.children_count,
        'selected_extras': b.selected_extras or [],
        'promo_code': b.promo_code or '',
        'base_price': float(b.base_price),
        'subtotal': float(b.subtotal),
        'extras_amount': float(b.extras_amount),
        'discount_amount': float(b.discount_amount),
        'tax_amount': float(b.tax_amount),
        'total_price': float(b.total_price),
        'status': b.status,
        'tracking_status': b.tracking_status,
        'special_request': b.special_request or '',
        'special_requests': b.special_request or '',
        'cancellation_reason': b.cancellation_reason or '',
        'is_cancellable': b.is_cancellable,
        'can_review': b.can_be_reviewed,
        'created_at': b.created_at.strftime('%B %d, %Y'),
        'customer_name': b.user.get_full_name() or b.user.username,
        'customer_email': b.user.email,
        'customer_phone': b.user.phone or '',
        'operator_name': b.cross.effective_operator_name,
        'public_tour_id': b.public_tour.id if b.public_tour else None,
        'public_tour_title': b.public_tour.tour_title if b.public_tour else None,
        # Requirements #10, #12, #13
        'ticket_code': getattr(b, 'ticket_code', None) or f"TK-{b.booking_id.replace('CRS-', '')}",
        'ticket_status': getattr(b, 'ticket_status', 'VALID'),
        'owner_payout_amount': float(getattr(b, 'owner_payout_amount', 0)),
        'platform_commission_amount': float(getattr(b, 'platform_commission_amount', 0)),
        'net_platform_profit': float(getattr(b, 'net_platform_profit', 0)),
        # WhatsApp Tour Reminder Details
        'customer_whatsapp': getattr(b, 'customer_whatsapp', '') or '',
        'customer_whatsapp_masked': mask_whatsapp_number(getattr(b, 'customer_whatsapp', '')) if getattr(b, 'customer_whatsapp', '') else '',
        'whatsapp_reminder_opt_in': getattr(b, 'whatsapp_reminder_opt_in', True),
        'whatsapp_reminder_sent': getattr(b, 'whatsapp_reminder_sent', False),
        'whatsapp_reminder_sent_at': b.whatsapp_reminder_sent_at.isoformat() if getattr(b, 'whatsapp_reminder_sent_at', None) else None,
        'whatsapp_reminder_status': getattr(b, 'whatsapp_reminder_status', 'SCHEDULED'),
        'whatsapp_reminder_message_id': getattr(b, 'whatsapp_reminder_message_id', '') or '',
        'whatsapp_reminder_error': getattr(b, 'whatsapp_reminder_error', '') or '',
    }


# =====================================================================
# AUTHENTICATION APIS
# =====================================================================

@csrf_exempt
def api_me(request):
    if request.user.is_authenticated:
        return JsonResponse({'authenticated': True, 'user': get_user_dict(request.user)})
    return JsonResponse({'authenticated': False, 'user': None})


@csrf_exempt
def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    username_or_email = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username_or_email or not password:
        return JsonResponse({'error': 'Please provide username/email and password.'}, status=400)

    user_obj = User.objects.filter(
        Q(username__iexact=username_or_email) | Q(email__iexact=username_or_email)
    ).first()

    if not user_obj:
        return JsonResponse({'error': 'Invalid credentials. User not found.'}, status=400)

    user = authenticate(request, username=user_obj.username, password=password)
    if user is not None:
        if not user.is_active:
            return JsonResponse({'error': 'Account has been deactivated. Please contact support.'}, status=403)
        login(request, user)
        return JsonResponse({
            'success': True,
            'message': f'Welcome back, {user.first_name or user.username}!',
            'user': get_user_dict(user)
        })
    else:
        return JsonResponse({'error': 'Invalid password. Please check your credentials.'}, status=400)


@csrf_exempt
def api_register(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    raw_role = data.get('role', 'USER').strip().upper()
    role = 'OWNER' if raw_role in ['OWNER', 'CROSS_OWNER'] else 'USER'
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return JsonResponse({'error': 'Username, email, and password are required.'}, status=400)

    if len(password) < 6:
        return JsonResponse({'error': 'Password must be at least 6 characters.'}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({'error': 'Username is already taken.'}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({'error': 'An account with this email already exists.'}, status=400)

    is_approved = True if role == 'USER' else False  # Owner accounts require approval or auto-approve based on config
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        phone=phone,
        is_approved_owner=True  # Allow seamless owner testing
    )
    login(request, user)
    return JsonResponse({
        'success': True,
        'message': 'Account registered successfully.',
        'user': get_user_dict(user)
    })


@csrf_exempt
def api_logout(request):
    logout(request)
    return JsonResponse({'success': True, 'message': 'Logged out successfully.'})


@csrf_exempt
def api_profile(request):
    """GET current user profile or PUT to update name, phone, address, password."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required.'}, status=401)

    if request.method == 'GET':
        return JsonResponse({'user': get_user_dict(request.user)})

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        u = request.user
        if 'first_name' in data:
            u.first_name = data['first_name'].strip()
        if 'last_name' in data:
            u.last_name = data['last_name'].strip()
        if 'email' in data and data['email'].strip():
            new_email = data['email'].strip().lower()
            if User.objects.filter(email__iexact=new_email).exclude(id=u.id).exists():
                return JsonResponse({'error': 'Email is already taken by another account.'}, status=400)
            u.email = new_email
        if 'phone' in data:
            u.phone = data['phone'].strip()
        if 'whatsapp_number' in data:
            u.whatsapp_number = data['whatsapp_number'].strip()
        if 'address' in data:
            u.address = data['address'].strip()

        if 'password' in data and data['password'].strip():
            pwd = data['password'].strip()
            if len(pwd) < 6:
                return JsonResponse({'error': 'Password must be at least 6 characters.'}, status=400)
            u.set_password(pwd)
            u.save()
            login(request, u)  # Maintain session after password change
        else:
            u.save()

        return JsonResponse({
            'success': True,
            'message': 'Profile updated successfully.',
            'user': get_user_dict(u)
        })

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# =====================================================================
# CRUISE SHIPS & REQUIREMENT MATCHING APIS
# =====================================================================

def api_cruise_list(request):
    queryset = Cross.objects.filter(is_active=True, is_approved=True).prefetch_related('extras', 'charter_rates', 'operator', 'maintenance_periods')

    # Listing type: PRIVATE_CHARTER, PUBLIC_CRUISE, BOTH
    listing_type = request.GET.get('listing_type', '').strip().upper()
    if listing_type == 'PRIVATE_CHARTER':
        queryset = queryset.filter(Q(listing_type='PRIVATE_CHARTER') | Q(listing_type='BOTH'))
    elif listing_type == 'PUBLIC_CRUISE':
        queryset = queryset.filter(Q(listing_type='PUBLIC_CRUISE') | Q(listing_type='BOTH'))

    # General search query
    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(name__icontains=q) |
            Q(destination__icontains=q) |
            Q(route__icontains=q) |
            Q(location__icontains=q) |
            Q(operator__name__icontains=q) |
            Q(description__icontains=q)
        )

    # City / Destination / Location
    city = request.GET.get('city', '').strip() or request.GET.get('location', '').strip() or request.GET.get('destination', '').strip()
    if city and city.lower() != 'all':
        queryset = queryset.filter(
            Q(location__icontains=city) |
            Q(destination__icontains=city) |
            Q(route__icontains=city) |
            Q(departure_port__icontains=city)
        )

    # Controlled Vessel Category
    category = request.GET.get('vessel_category', '').strip() or request.GET.get('category', '').strip()
    if category and category.lower() != 'all':
        queryset = queryset.filter(Q(vessel_category=category) | Q(category=category))

    # Date filter (Check maintenance periods and drydocks)
    req_date_str = request.GET.get('date', '').strip()
    if req_date_str:
        try:
            req_date = datetime.strptime(req_date_str, '%Y-%m-%d').date()
            queryset = queryset.exclude(
                maintenance_periods__is_active=True,
                maintenance_periods__start_date__lte=req_date,
                maintenance_periods__end_date__gte=req_date
            )
        except ValueError:
            pass

    # Duration filter
    duration_query = request.GET.get('duration', '').strip().lower()
    if duration_query and duration_query != 'any':
        queryset = queryset.filter(
            Q(duration_display__icontains=duration_query) |
            Q(charter_rates__duration__icontains=duration_query)
        ).distinct()

    # Price range (in INR ₹)
    min_price = request.GET.get('min_price', '').strip()
    max_price = request.GET.get('max_price', '').strip() or request.GET.get('budget', '').strip()
    if min_price:
        try:
            queryset = queryset.filter(price__gte=Decimal(min_price))
        except Exception:
            pass
    if max_price:
        try:
            queryset = queryset.filter(price__lte=Decimal(max_price))
        except Exception:
            pass

    # Guest capacity requirement
    guests_str = request.GET.get('passengers', '').strip() or request.GET.get('guests', '').strip() or request.GET.get('capacity', '').strip()
    if guests_str:
        try:
            req_guests = int(guests_str)
            queryset = queryset.filter(Q(capacity__gte=req_guests) | Q(has_unknown_capacity=True))
        except ValueError:
            pass

    # Booking Purpose capability filter
    purpose = request.GET.get('purpose', '').strip().lower()
    if purpose:
        if 'wedding' in purpose:
            queryset = queryset.filter(supports_weddings=True)
        elif 'birthday' in purpose:
            queryset = queryset.filter(supports_birthdays=True)
        elif 'corporate' in purpose or 'business' in purpose:
            queryset = queryset.filter(supports_corporate=True)
        elif 'conference' in purpose:
            queryset = queryset.filter(supports_conferences=True)
        elif 'party' in purpose:
            queryset = queryset.filter(supports_parties=True)
        elif 'dinner' in purpose or 'gala' in purpose:
            queryset = queryset.filter(supports_dinners=True)
        elif 'tour' in purpose:
            queryset = queryset.filter(supports_public_tours=True)
        else:
            queryset = queryset.filter(supports_private_charter=True)

    # Sorting
    sort_by = request.GET.get('sort_by', 'popular')
    if sort_by == 'price_low':
        queryset = queryset.order_by('price')
    elif sort_by == 'price_high':
        queryset = queryset.order_by('-price')
    elif sort_by == 'capacity':
        queryset = queryset.order_by('-capacity')
    elif sort_by == 'rating':
        queryset = queryset.annotate(avg_r=Avg('reviews__rating')).order_by('-avg_r')
    else:
        queryset = queryset.order_by('-created_at')

    destinations = list(Cross.objects.filter(is_active=True).values_list('destination', flat=True).distinct())
    locations = list(Cross.objects.filter(is_active=True).values_list('location', flat=True).distinct())
    categories = ['YACHT', 'BOAT', 'PARTY_BOAT', 'RIVER_CRUISE', 'SEA_CRUISE', 'PASSENGER_CRUISE_SHIP', 'FERRY']

    cruises_data = [serialize_cruise(c) for c in queryset]

    return JsonResponse({
        'total': len(cruises_data),
        'cruises': cruises_data,
        'destinations': sorted(list(set([d for d in (destinations + locations) if d]))),
        'categories': categories,
    })


@csrf_exempt
def api_ship_match(request):
    """
    Requirement Matching Engine:
    Supports 2 distinct modes:
    1. PRIVATE_CHARTER: city, date, passengers, duration, vessel_size/category
    2. PUBLIC_CRUISE: departure, destination, date, passengers
    Returns exact matches first, followed by close alternatives.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
    else:
        data = request.GET

    mode = (data.get('mode') or data.get('booking_type') or data.get('product_type') or 'PRIVATE_CHARTER').strip().upper()

    # =========================================================================
    # PUBLIC CRUISE MATCHING MODE
    # =========================================================================
    if mode in ['PUBLIC', 'PUBLIC_CRUISE', 'TOUR']:
        dep = (data.get('departure') or data.get('departure_port') or '').strip().lower()
        dest = (data.get('destination') or '').strip().lower()
        date_str = (data.get('date') or data.get('departure_date') or '').strip()
        passengers = int(data.get('passengers') or data.get('guests') or data.get('number_of_people') or 1)

        tours_qs = PublicTour.objects.filter(is_published=True, status__in=['SCHEDULED', 'AVAILABLE']).select_related('ship', 'operator')
        if dep:
            tours_qs = tours_qs.filter(Q(departure_port__icontains=dep) | Q(ship__location__icontains=dep))
        if dest:
            tours_qs = tours_qs.filter(Q(destination__icontains=dest) | Q(ports_of_call__icontains=dest))
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                tours_qs = tours_qs.filter(departure_date__gte=target_date)
            except ValueError:
                pass
        else:
            tours_qs = tours_qs.filter(departure_date__gte=date.today())

        exact_tours = []
        alt_tours = []
        for t in tours_qs:
            serialized_t = serialize_tour(t)
            if t.remaining_capacity >= passengers:
                serialized_t['is_exact_match'] = True
                serialized_t['match_reasons'] = [f"{t.remaining_capacity} seats available for your party", f"Departs {t.departure_port}"]
                exact_tours.append(serialized_t)
            else:
                serialized_t['is_exact_match'] = False
                serialized_t['alternative_notes'] = [f"Only {t.remaining_capacity} seats remaining (requested {passengers})"]
                alt_tours.append(serialized_t)

        return JsonResponse({
            'mode': 'PUBLIC_CRUISE',
            'total_exact': len(exact_tours),
            'total_alternatives': len(alt_tours),
            'exact_matches': exact_tours,
            'close_alternatives': alt_tours,
            'results': exact_tours + alt_tours,
        })

    # =========================================================================
    # PRIVATE CHARTER MATCHING MODE
    # =========================================================================
    city = (data.get('city') or data.get('location') or data.get('destination') or '').strip().lower()
    guests = int(data.get('passengers') or data.get('guests') or data.get('number_of_people') or 12)
    duration_req = (data.get('duration') or '').strip().lower()
    category_req = (data.get('vessel_category') or data.get('vessel_size') or data.get('category') or '').strip().upper()
    req_date_str = (data.get('date') or data.get('booking_date') or '').strip()
    purpose = (data.get('purpose') or '').strip().lower()
    budget = float(data.get('budget') or 0)

    all_ships = Cross.objects.filter(
        is_active=True,
        is_approved=True
    ).filter(
        Q(listing_type='PRIVATE_CHARTER') | Q(listing_type='BOTH')
    ).prefetch_related('extras', 'reviews', 'charter_rates', 'maintenance_periods', 'operator')

    exact_matches = []
    close_alternatives = []

    for ship in all_ships:
        is_exact = True
        match_reasons = []
        alt_reasons = []

        # 1. City / Location match
        if city and city != 'all':
            ship_loc = f"{ship.location} {ship.departure_port} {ship.destination}".lower()
            if city in ship_loc:
                match_reasons.append(f"Operating in {ship.location}")
            else:
                is_exact = False
                alt_reasons.append(f"Base port is {ship.location} (Alternative Region)")

        # 2. Capacity match
        if ship.has_unknown_capacity:
            match_reasons.append(f"Capacity: {ship.display_capacity_text}")
        elif ship.capacity >= guests:
            match_reasons.append(f"Accommodates up to {ship.capacity} guests")
        else:
            is_exact = False
            alt_reasons.append(f"Capacity {ship.capacity} is less than requested {guests}")

        # 3. Vessel Category match
        if category_req and category_req != 'ALL':
            eff_cat = (ship.effective_category or '').upper()
            if category_req in eff_cat or eff_cat in category_req:
                match_reasons.append(f"Vessel Type: {ship.get_category_display() if hasattr(ship, 'get_category_display') else ship.effective_category}")
            else:
                is_exact = False
                alt_reasons.append(f"Vessel type is {ship.effective_category}")

        # 4. Duration match
        if duration_req and duration_req != 'any':
            has_matching_duration = False
            if duration_req in ship.duration_display.lower():
                has_matching_duration = True
            for r in ship.charter_rates.all():
                if duration_req in r.duration.lower():
                    has_matching_duration = True
                    break
            if has_matching_duration:
                match_reasons.append(f"Offers {duration_req} charter package")
            else:
                match_reasons.append(f"Standard basis: {ship.duration_display or ship.formatted_price_basis}")

        # 5. Purpose check
        if purpose:
            if ship.supports_purpose(purpose):
                match_reasons.append("Equipped for your planned event")
            else:
                is_exact = False
                alt_reasons.append(f"Standard charter available; not pre-configured for {purpose}")

        # 6. Date availability & Maintenance check
        if req_date_str:
            try:
                check_date = datetime.strptime(req_date_str, '%Y-%m-%d').date()
                in_maintenance = ship.maintenance_periods.filter(
                    is_active=True,
                    start_date__lte=check_date,
                    end_date__gte=check_date
                ).exists()
                if in_maintenance:
                    is_exact = False
                    alt_reasons.append("Undergoing scheduled drydock maintenance on selected date")
                else:
                    conflict = Booking.objects.filter(
                        cross=ship,
                        booking_date=check_date,
                        status__in=['PENDING', 'CONFIRMED']
                    ).exists()
                    if conflict:
                        is_exact = False
                        alt_reasons.append("Reserved for another party on selected date (flexible hours possible)")
                    else:
                        match_reasons.append("Available on requested date")
            except ValueError:
                pass

        # 7. Budget check (in INR)
        if budget > 0 and not ship.is_quote_based and float(ship.price) > (budget * 1.15):
            is_exact = False
            alt_reasons.append(f"Base rate (₹{ship.price:,.0f}) exceeds specified budget")
        elif budget > 0 and not ship.is_quote_based:
            match_reasons.append(f"Rate ({ship.formatted_price_basis}) fits budget")

        serialized = serialize_cruise(ship)
        serialized['match_reasons'] = match_reasons

        if is_exact:
            serialized['is_exact_match'] = True
            exact_matches.append(serialized)
        else:
            serialized['is_exact_match'] = False
            serialized['alternative_notes'] = alt_reasons
            close_alternatives.append(serialized)

    return JsonResponse({
        'mode': 'PRIVATE_CHARTER',
        'total_exact': len(exact_matches),
        'total_alternatives': len(close_alternatives),
        'exact_matches': exact_matches,
        'close_alternatives': close_alternatives,
        'results': exact_matches + close_alternatives,
    })



def api_cruise_detail(request, slug):
    try:
        if str(slug).isdigit():
            cruise = Cross.objects.prefetch_related('extras', 'reviews__user', 'public_tours', 'gallery_images').get(id=int(slug))
        else:
            cruise = Cross.objects.prefetch_related('extras', 'reviews__user', 'public_tours', 'gallery_images').get(slug=slug)
    except Cross.DoesNotExist:
        return JsonResponse({'error': 'Cruise vessel not found.'}, status=404)

    data = serialize_cruise(cruise)

    # Detailed itinerary breakdown
    itinerary_lines = [line.strip() for line in cruise.itinerary_highlights.split('\n') if line.strip()]
    dining_venues = [d.strip() for d in cruise.dining_venues.split(',') if d.strip()]
    entertainment = [e.strip() for e in cruise.entertainment.split(',') if e.strip()]

    # Standard Stateroom & Cabin Options with dynamic pricing multipliers
    base_fare = float(cruise.price)
    cabin_tiers = [
        {
            'id': 'suite',
            'name': 'Grand Presidential Ocean Suite',
            'multiplier': 1.8,
            'price_per_night': round(base_fare * 1.8, 2),
            'size': '85 sqm / 915 sqft',
            'features': ['Wraparound Teak Veranda', 'Dedicated European Butler', 'Private Jacuzzi', 'Complimentary Champagne Bar'],
            'capacity': 4,
            'available': True,
        },
        {
            'id': 'balcony',
            'name': 'Royal Panoramic Balcony Stateroom',
            'multiplier': 1.3,
            'price_per_night': round(base_fare * 1.3, 2),
            'size': '38 sqm / 410 sqft',
            'features': ['Floor-to-Ceiling Sliding Glass', 'Private Ocean Balcony', 'Sitting Area & Minibar', 'Luxury Linens'],
            'capacity': 3,
            'available': True,
        },
        {
            'id': 'oceanview',
            'name': 'Deluxe Oceanview Stateroom',
            'multiplier': 1.1,
            'price_per_night': round(base_fare * 1.1, 2),
            'size': '26 sqm / 280 sqft',
            'features': ['Oversized Picture Window Portal', 'Queen Plush Bed', 'Walk-in Wardrobe', 'Interactive Smart TV'],
            'capacity': 2,
            'available': True,
        },
        {
            'id': 'interior',
            'name': 'Signature Interior Stateroom',
            'multiplier': 1.0,
            'price_per_night': round(base_fare, 2),
            'size': '20 sqm / 215 sqft',
            'features': ['Soundproof Acoustic Isolation', 'Virtual Ocean Balcony Display', 'En-Suite Rain Shower', '24/7 Room Service'],
            'capacity': 2,
            'available': True,
        },
    ]

    # Reviews
    reviews = []
    for r in cruise.reviews.select_related('user').order_by('-created_at'):
        reviews.append({
            'id': r.id,
            'author': r.user.get_full_name() or r.user.username,
            'rating': r.rating,
            'comment': r.comment,
            'date': r.created_at.strftime('%B %d, %Y'),
        })

    # Public tours departing on this ship
    upcoming_tours = [serialize_tour(t) for t in cruise.public_tours.filter(is_published=True, departure_date__gte=date.today())]

    data['itinerary_timeline'] = itinerary_lines
    data['dining_venues_list'] = dining_venues
    data['entertainment_list'] = entertainment
    data['cabin_tiers'] = cabin_tiers
    data['reviews'] = reviews
    data['upcoming_tours'] = upcoming_tours

    return JsonResponse(data)


# =====================================================================
# PUBLIC CRUISE TOURS (PRODUCT B) APIS
# =====================================================================

def api_tour_list(request):
    """Lists published scheduled public cruise tours with live seat inventory."""
    queryset = PublicTour.objects.filter(is_published=True).select_related('ship', 'operator').prefetch_related('fares', 'cabins')

    # Destination filter
    destination = request.GET.get('destination', '').strip()
    if destination and destination.lower() != 'all':
        queryset = queryset.filter(Q(destination__icontains=destination) | Q(ports_of_call__icontains=destination))

    # Departure port filter
    departure_port = request.GET.get('departure', '').strip() or request.GET.get('departure_port', '').strip()
    if departure_port and departure_port.lower() != 'all':
        queryset = queryset.filter(Q(departure_port__icontains=departure_port) | Q(ship__location__icontains=departure_port))

    # Operator filter
    operator_query = request.GET.get('operator', '').strip()
    if operator_query:
        queryset = queryset.filter(Q(operator__name__icontains=operator_query) | Q(ship__name__icontains=operator_query))

    # Date filter
    date_str = request.GET.get('date', '').strip()
    if date_str:
        try:
            dep_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            queryset = queryset.filter(departure_date__gte=dep_date)
        except ValueError:
            pass
    else:
        # Default: today and future departures
        queryset = queryset.filter(departure_date__gte=date.today())

    # Passengers filter
    passengers_str = request.GET.get('passengers', '').strip()
    if passengers_str:
        try:
            req_pax = int(passengers_str)
            # Filter in Python or annotate remaining capacity
            queryset = [t for t in queryset if t.remaining_capacity >= req_pax]
        except ValueError:
            pass

    tours_data = [serialize_tour(t) for t in queryset]

    all_tours = PublicTour.objects.filter(is_published=True)
    departure_ports = sorted(list(set(all_tours.values_list('departure_port', flat=True))))
    destinations = sorted(list(set(all_tours.values_list('destination', flat=True))))

    return JsonResponse({
        'total': len(tours_data),
        'tours': tours_data,
        'departure_ports': departure_ports,
        'destinations': destinations,
    })


def api_tour_detail(request, slug):
    """Returns complete details of a scheduled public cruise tour."""
    try:
        if str(slug).isdigit():
            tour = PublicTour.objects.select_related('ship').get(id=int(slug))
        else:
            tour = PublicTour.objects.select_related('ship').get(slug=slug)
    except PublicTour.DoesNotExist:
        return JsonResponse({'error': 'Cruise tour not found.'}, status=404)

    return JsonResponse({'tour': serialize_tour(tour)})


# =====================================================================
# OFFERS & COUPONS APIS
# =====================================================================

def api_offers_list(request):
    today = date.today()
    offers = Offer.objects.filter(is_active=True, valid_from__lte=today, valid_to__gte=today)
    return JsonResponse({
        'offers': [serialize_offer(o) for o in offers]
    })


@csrf_exempt
def api_validate_coupon(request):
    """
    Validates a coupon code server-side against an order amount in INR (₹).
    Returns discount amount, net total, and validation status.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    code = data.get('code', '').strip().upper()
    amount = Decimal(str(data.get('amount', 0)))

    if not code:
        return JsonResponse({'error': 'Coupon code is required.'}, status=400)

    try:
        offer = Offer.objects.get(code__iexact=code, is_active=True)
    except Offer.DoesNotExist:
        return JsonResponse({'valid': False, 'error': 'Invalid or inactive promo coupon.'}, status=404)

    today = date.today()
    if offer.valid_from > today or offer.valid_to < today:
        return JsonResponse({'valid': False, 'error': 'This promotional offer has expired.'}, status=400)

    if amount < offer.min_booking_amount:
        return JsonResponse({
            'valid': False,
            'error': f'Minimum booking amount for code {offer.code} is ₹{offer.min_booking_amount:,.0f}.'
        }, status=400)

    discount = offer.calculate_discount(amount)
    return JsonResponse({
        'valid': True,
        'code': offer.code,
        'title': offer.title,
        'description': offer.description,
        'discount_amount': float(discount),
        'net_amount': float(max(Decimal('0.00'), amount - discount)),
    })


# =====================================================================
# PRIVATE EVENT PACKAGES & SHIP EXTRAS
# =====================================================================

def api_event_packages(request):
    event_types = [
        {'id': 'wedding', 'name': 'Ocean Wedding Ceremony & Gala', 'icon': 'Heart', 'desc': 'Say "I do" at sea under golden hour skies with luxury floral decor, mandap on observation deck, and five-course royal banquet.'},
        {'id': 'corporate', 'name': 'Corporate Leadership Summit', 'icon': 'Briefcase', 'desc': 'World-class conference at sea equipped with dual laser projection, satellite telepresence, and executive banquet lounge.'},
        {'id': 'birthday', 'name': 'Milestone Birthday & Private Party', 'icon': 'PartyPopper', 'desc': 'Unforgettable celebration with live DJ, signature cocktails, multi-tier birthday cake, and starlight deck access.'},
        {'id': 'anniversary', 'name': 'Luxury Anniversary Celebration', 'icon': 'Sparkles', 'desc': 'Romantic twilight charter with champagne reception, private acoustic quartet, and bespoke chef tasting menu.'},
        {'id': 'gala', 'name': 'Black-Tie Gala Dinner & Soiree', 'icon': 'Wine', 'desc': 'High-society maritime affair featuring red-carpet boarding, caviar bars, and aerial drone video coverage.'},
    ]

    packages = [
        {
            'id': 'diamond',
            'tier': 'Diamond Horizon (Ultra-Luxury)',
            'base_fee': 45000.0,
            'per_guest_fee': 1400.0,
            'highlights': ['Exclusive Vessel Top-Deck Charter', 'Five-Course Royal Plated Dinner', 'Premium Open Bar with Champagne & Vintage Spirits', 'Full Stage Sound, Lighting & Aerial Drone Videography', 'Dedicated Master of Ceremonies & Butler Team'],
            'recommended_for': 'Luxury Weddings, Grand Galas, Executive Summits',
        },
        {
            'id': 'emerald',
            'tier': 'Emerald Wave (Executive Class)',
            'base_fee': 28000.0,
            'per_guest_fee': 950.0,
            'highlights': ['Private Panorama Salon & Observation Lounge', 'Four-Course Gourmet Coastal Buffet', 'Curated Mocktail & Beverage Bar', 'Audiovisual Rigs & Live Acoustic Duo', 'Custom Themed Tablescape & Ambient Uplighting'],
            'recommended_for': 'Milestone Birthdays, Corporate Dinners, Anniversaries',
        },
        {
            'id': 'sapphire',
            'tier': 'Sapphire Anchor (Signature)',
            'base_fee': 15000.0,
            'per_guest_fee': 650.0,
            'highlights': ['Private Sunset Terrace Access', 'Hors d’Oeuvres & Gourmet Canapes Stations', 'Three-Hour Welcome Beverage Service', 'Integrated Sound System for Speeches & Playlists', 'Professional Voyage Event Coordinator'],
            'recommended_for': 'Private Cocktail Receptions, Seminars, Family Gatherings',
        },
    ]

    ships = Cross.objects.filter(is_active=True).values('id', 'name', 'slug', 'category', 'capacity', 'price', 'location')

    return JsonResponse({
        'event_types': event_types,
        'packages': packages,
        'charter_ships': list(ships),
    })


# =====================================================================
# BOOKINGS & RESERVATIONS APIS (PRODUCT A & PRODUCT B)
# =====================================================================

@csrf_exempt
def api_create_booking(request):
    """
    Creates either:
    A. PRODUCT A: Private Ship Booking (with custom extras, anti-double-booking check, duration pricing)
    B. PRODUCT B: Public Tour Ticket (with passenger seat inventory check, prevents overselling)
    Calculates 100% server-side Decimal prices in INR (₹) including taxes and discounts.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please sign in to complete your cruise reservation.'}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    raw_type = data.get('booking_type', 'EVENT').strip().upper()
    booking_type = 'TOUR' if 'TOUR' in raw_type else 'EVENT'

    public_tour = None
    cruise = None

    # Handle Public Tour Ticket Flow
    tour_id = data.get('public_tour_id') or data.get('tour_id')
    tour_slug = data.get('public_tour_slug') or data.get('tour_slug')

    if booking_type == 'TOUR' or tour_id or tour_slug:
        booking_type = 'TOUR'
        try:
            if tour_id:
                public_tour = PublicTour.objects.select_related('ship').get(id=tour_id)
            else:
                public_tour = PublicTour.objects.select_related('ship').get(slug=tour_slug)
        except PublicTour.DoesNotExist:
            return JsonResponse({'error': 'Selected public cruise tour is not found or no longer available.'}, status=404)
        cruise = public_tour.ship
    else:
        # Private Charter Flow
        cruise_id = data.get('cruise_id')
        cruise_slug = data.get('cruise_slug', '').strip()
        try:
            if cruise_id:
                cruise = Cross.objects.prefetch_related('extras').get(id=cruise_id, is_active=True)
            else:
                cruise = Cross.objects.prefetch_related('extras').get(slug=cruise_slug, is_active=True)
        except Cross.DoesNotExist:
            return JsonResponse({'error': 'Selected cruise vessel is not available.'}, status=404)

    # Disallow operator booking own vessel
    # Disallow operator booking own vessel
    if cruise.owner and cruise.owner == request.user and not request.user.is_superuser:
        return JsonResponse({'error': 'Cruise operators cannot book their own fleet vessels.'}, status=400)

    # Passenger headcounts
    adults_count = int(data.get('adults_count') or data.get('passengers_count') or data.get('number_of_people') or 1)
    children_count = int(data.get('children_count') or 0)
    total_people = adults_count + children_count

    if total_people <= 0:
        return JsonResponse({'error': 'Passenger count must be at least 1.'}, status=400)

    promo_code = data.get('promo_code', '').strip().upper()
    special_request = (data.get('special_requests') or data.get('special_request', '')).strip()
    cabin_type = data.get('cabin_type', 'Royal Balcony Stateroom').strip()

    # WhatsApp Tour Reminder Settings & Consent
    raw_whatsapp = (data.get('customer_whatsapp') or data.get('whatsapp_number') or '').strip()
    opt_in_val = data.get('whatsapp_reminder_opt_in', True)
    if isinstance(opt_in_val, str):
        whatsapp_opt_in = opt_in_val.lower() not in ['false', '0', 'no', 'off']
    else:
        whatsapp_opt_in = bool(opt_in_val)

    if not raw_whatsapp and request.user.is_authenticated:
        raw_whatsapp = getattr(request.user, 'whatsapp_number', '') or getattr(request.user, 'phone', '')

    norm_whatsapp = ''
    if raw_whatsapp:
        norm_whatsapp = normalize_whatsapp_number(raw_whatsapp)
        if not norm_whatsapp:
            return JsonResponse({
                'error': 'Please enter a valid 10-digit Indian mobile number or international number with country code for WhatsApp tour updates.'
            }, status=400)

    # =================================================================
    # ATOMIC TRANSACTION TO PREVENT DOUBLE-BOOKING & OVERSELLING
    # =================================================================
    with transaction.atomic():
        if booking_type == 'TOUR':
            # Lock the tour row
            tour_locked = PublicTour.objects.select_for_update().get(id=public_tour.id)
            if not tour_locked.is_bookable:
                return JsonResponse({'error': 'This cruise tour is no longer open for booking.'}, status=400)

            if tour_locked.remaining_capacity < total_people:
                return JsonResponse({
                    'error': f'Only {tour_locked.remaining_capacity} seats remain on this tour. You requested {total_people}.'
                }, status=400)

            booking_date = tour_locked.departure_date
            start_time = tour_locked.departure_time
            end_time = tour_locked.return_time
            duration_hours = Decimal(str(tour_locked.duration_days * 24))

            # Server Calculation for Public Tour: Adult Fare * Adults + Child Fare * Children + Cabin Surcharge
            adult_total = tour_locked.adult_price * Decimal(adults_count)
            child_total = tour_locked.child_price * Decimal(children_count)
            base_calc = adult_total + child_total

            # Cabin tier surcharge
            cabin_surcharge = Decimal('0.00')
            if 'Suite' in cabin_type:
                cabin_surcharge = Decimal('5000.00') * Decimal(adults_count)
            elif 'Balcony' in cabin_type:
                cabin_surcharge = Decimal('2500.00') * Decimal(adults_count)

            subtotal = base_calc + cabin_surcharge
            extras_amount = Decimal('0.00')
            selected_extras_list = []
            is_quote = False

            # Deduct booked seats atomically
            tour_locked.booked_capacity += total_people
            tour_locked.save()

        else:
            # Private Charter Flow
            booking_date_str = data.get('booking_date', '').strip()
            start_time_str = data.get('start_time', '16:00').strip()
            end_time_str = data.get('end_time', '22:00').strip()
            event_type = data.get('event_type', 'Private Event').strip()
            event_package = data.get('event_package', '').strip()

            try:
                booking_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({'error': 'Invalid date format. Expected YYYY-MM-DD.'}, status=400)

            if booking_date < date.today():
                return JsonResponse({'error': 'Cannot charter a vessel for a past date.'}, status=400)

            try:
                start_time = datetime.strptime(start_time_str, '%H:%M').time()
                end_time = datetime.strptime(end_time_str, '%H:%M').time()
            except ValueError:
                return JsonResponse({'error': 'Invalid time format. Expected HH:MM.'}, status=400)

            is_overnight = (start_time >= end_time)
            start_dt = datetime.combine(booking_date, start_time)
            if is_overnight:
                end_dt = datetime.combine(booking_date + timedelta(days=1), end_time)
            else:
                end_dt = datetime.combine(booking_date, end_time)

            duration_hours = Decimal(str(round((end_dt - start_dt).total_seconds() / 3600.0, 2)))
            if duration_hours <= Decimal('0.00'):
                duration_hours = Decimal('1.00')

            if not cruise.has_unknown_capacity and total_people > cruise.capacity:
                return JsonResponse({
                    'error': f'Guest count ({total_people}) exceeds maximum vessel capacity ({cruise.capacity}).'
                }, status=400)

            # Check Public Tour Conflict (Requirement #11)
            tour_conflict = PublicTour.objects.filter(
                ship=cruise,
                status__in=['SCHEDULED', 'BOARDING', 'DEPARTED'],
                departure_date__lte=booking_date,
                return_date__gte=booking_date
            ).exists()
            if tour_conflict:
                return JsonResponse({
                    'error': f'This vessel is scheduled on an active public cruise tour on {booking_date} and is not available for private charter.'
                }, status=409)

            # Check Maintenance Conflict (Requirement #9)
            if hasattr(cruise, 'maintenance_periods'):
                maintenance_conflict = cruise.maintenance_periods.filter(
                    is_active=True,
                    start_date__lte=booking_date,
                    end_date__gte=booking_date
                ).exists()
                if maintenance_conflict:
                    return JsonResponse({
                        'error': f'This vessel is undergoing scheduled drydock maintenance on {booking_date}. Please select another date.'
                    }, status=409)

            # Check Overlapping Booking Conflict
            conflict_filter = (
                Q(start_time__lt=end_time, end_time__gt=start_time)
                if not is_overnight
                else Q(start_time__lt=time(23, 59, 59), end_time__gt=start_time)
            )
            conflict = Booking.objects.select_for_update().filter(
                cross=cruise,
                booking_date=booking_date,
                status__in=['PENDING', 'CONFIRMED'],
            ).filter(conflict_filter).exists()

            if conflict:
                return JsonResponse({
                    'error': 'This vessel is already booked for the selected schedule. Please select another date or time slot.'
                }, status=409)

            # Base private ship charter pricing check
            rate_id = data.get('rate_id') or data.get('charter_rate_id')
            rate = None
            if rate_id:
                try:
                    rate = cruise.charter_rates.get(id=rate_id)
                except Exception:
                    pass

            is_quote = False
            if rate:
                if rate.is_quote_based or rate.price is None or rate.price_unit == 'QUOTE':
                    subtotal = Decimal('0.00')
                    is_quote = True
                elif rate.price_unit == 'PER_BOAT':
                    subtotal = rate.price
                elif rate.price_unit == 'PER_HOUR':
                    subtotal = rate.price * duration_hours
                elif rate.price_unit == 'PER_PERSON':
                    subtotal = rate.price * Decimal(total_people)
                else:
                    subtotal = rate.price
            elif cruise.is_quote_based or cruise.price_unit == 'QUOTE' or cruise.price == Decimal('0.00'):
                subtotal = Decimal('0.00')
                is_quote = True
            elif cruise.price_unit == 'PER_HOUR':
                subtotal = cruise.price * duration_hours
            elif cruise.price_unit == 'PER_PERSON':
                subtotal = cruise.price * Decimal(total_people)
            else:
                subtotal = cruise.price

            # Extras calculation (owner-configured extras)
            raw_extras = data.get('selected_extras', [])
            selected_extras_list = []
            extras_amount = Decimal('0.00')

            available_extras = {e.name.lower(): e for e in cruise.extras.filter(is_available=True)}
            for req_ex in raw_extras:
                ex_name = req_ex if isinstance(req_ex, str) else req_ex.get('name', '')
                matched_extra = available_extras.get(ex_name.lower())
                if matched_extra:
                    if matched_extra.pricing_mode == 'PER_GUEST':
                        cost = matched_extra.price * Decimal(total_people)
                    else:
                        cost = matched_extra.price
                    extras_amount += cost
                    selected_extras_list.append({
                        'name': matched_extra.name,
                        'price': float(matched_extra.price),
                        'mode': matched_extra.pricing_mode,
                        'calculated_cost': float(cost)
                    })

        # Calculate Discount
        discount_amount = Decimal('0.00')
        if promo_code and not is_quote:
            try:
                offer = Offer.objects.get(code__iexact=promo_code, is_active=True)
                discount_amount = offer.calculate_discount(subtotal + extras_amount)
            except Offer.DoesNotExist:
                discount_amount = Decimal('0.00')

        # Tax calculation
        if is_quote:
            tax_amount = Decimal('0.00')
            final_total = Decimal('0.00')
            b_status = 'PENDING'
            t_status = 'BOOKED'
        else:
            taxable_base = max(Decimal('0.00'), subtotal + extras_amount - discount_amount)
            tax_amount = Decimal(str(round(float(taxable_base * Decimal('0.18')), 2)))
            final_total = taxable_base + tax_amount
            b_status = 'CONFIRMED'
            t_status = 'CONFIRMED'

        # Create Booking Record
        booking = Booking.objects.create(
            user=request.user,
            cross=cruise,
            public_tour=public_tour,
            booking_type=booking_type,
            cabin_type=cabin_type,
            event_type=data.get('event_type') if booking_type == 'EVENT' else None,
            event_package=data.get('event_package') if booking_type == 'EVENT' else None,
            booking_date=booking_date,
            start_time=start_time,
            end_time=end_time,
            duration_hours=duration_hours,
            number_of_people=total_people,
            adults_count=adults_count,
            children_count=children_count,
            selected_extras=selected_extras_list,
            base_price=subtotal if booking_type == 'EVENT' else (public_tour.adult_price if public_tour else cruise.price),
            subtotal=subtotal,
            extras_amount=extras_amount,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_price=final_total,
            promo_code=promo_code,
            special_request=special_request,
            status=b_status,
            tracking_status=t_status,
            customer_whatsapp=norm_whatsapp or '',
            whatsapp_reminder_opt_in=whatsapp_opt_in,
            whatsapp_reminder_status='SCHEDULED' if (norm_whatsapp and whatsapp_opt_in) else ('OPTED_OUT' if not whatsapp_opt_in else 'SCHEDULED')
        )

    msg = f"Inquiry registered successfully! Reference: {booking.booking_id}. Operator will provide quotation." if is_quote else f"Reservation confirmed successfully! Reference: {booking.booking_id}"

    return JsonResponse({
        'success': True,
        'message': msg,
        'booking': serialize_booking(booking),
    })


def api_my_bookings(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    bookings = Booking.objects.filter(user=request.user).select_related('cross', 'public_tour').order_by('-booking_date', '-start_time')
    return JsonResponse({
        'total': bookings.count(),
        'bookings': [serialize_booking(b) for b in bookings]
    })


def api_booking_detail(request, booking_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.select_related('cross', 'user', 'cross__owner', 'cross__operator', 'public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    is_owner = (booking.cross.owner == request.user) if booking.cross.owner else False
    if booking.user != request.user and not is_owner and not request.user.is_staff:
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    return JsonResponse({'booking': serialize_booking(booking)})


def api_booking_invoice(request, booking_id):
    """Generates official INR (₹) tax invoice data with line items."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        b = Booking.objects.select_related('cross', 'user', 'cross__owner', 'cross__operator', 'public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    is_owner = (b.cross.owner == request.user) if b.cross.owner else False
    if b.user != request.user and not is_owner and not request.user.is_staff:
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    line_items = []
    if b.booking_type == 'TOUR' and b.public_tour:
        line_items.append({
            'description': f"Public Cruise Tour: {b.public_tour.tour_title} (Adults: {b.adults_count})",
            'quantity': b.adults_count,
            'unit_price': float(b.public_tour.adult_price),
            'total': float(b.public_tour.adult_price * b.adults_count),
        })
        if b.children_count > 0:
            line_items.append({
                'description': f"Child Fare (Children: {b.children_count})",
                'quantity': b.children_count,
                'unit_price': float(b.public_tour.child_price),
                'total': float(b.public_tour.child_price * b.children_count),
            })
    else:
        basis_note = "Price on Request / Quote" if b.subtotal == Decimal('0.00') else "Private Charter"
        line_items.append({
            'description': f"Private Ship Charter - {b.cross.name} ({b.event_type or basis_note})",
            'quantity': 1,
            'unit_price': float(b.subtotal),
            'total': float(b.subtotal),
        })

    for ex in (b.selected_extras or []):
        line_items.append({
            'description': f"Extra Service: {ex.get('name')}",
            'quantity': 1,
            'unit_price': float(ex.get('calculated_cost', ex.get('price', 0))),
            'total': float(ex.get('calculated_cost', ex.get('price', 0))),
        })

    op_company = b.cross.operator.name if b.cross.operator else (f"{b.cross.owner.username} Maritime Operations" if b.cross.owner else "Cross-Hunt Fleet")

    invoice_data = {
        'invoice_number': b.invoice_number,
        'booking_id': b.booking_id,
        'issue_date': b.created_at.strftime('%d %B %Y'),
        'customer_name': b.user.get_full_name() or b.user.username,
        'customer_email': b.user.email,
        'customer_phone': b.user.phone or 'N/A',
        'operator_name': b.cross.effective_operator_name,
        'operator_company': op_company,
        'ship_name': b.cross.name,
        'departure_port': b.cross.departure_port,
        'destination': b.cross.destination,
        'booking_date': b.booking_date.strftime('%d %B %Y'),
        'duration': f"{b.duration_hours} Hours" if b.duration_hours < 24 else f"{b.cross.duration_days} Days",
        'currency': 'INR (₹)',
        'currency_symbol': '₹',
        'line_items': line_items,
        'subtotal': float(b.subtotal),
        'extras_amount': float(b.extras_amount),
        'discount_amount': float(b.discount_amount),
        'tax_amount': float(b.tax_amount),
        'total_price': float(b.total_price),
        'status': b.status,
        'payment_status': 'PAID' if b.status in ['CONFIRMED', 'COMPLETED'] else 'PENDING',
    }

    return JsonResponse({'invoice': invoice_data})


@csrf_exempt
def api_cancel_booking(request, booking_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.select_related('public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if booking.user != request.user and not request.user.is_staff:
        return JsonResponse({'error': 'Permission denied.'}, status=403)

    if not booking.is_cancellable:
        return JsonResponse({'error': 'This reservation cannot be cancelled as it is past the allowed cutoff.'}, status=400)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    with transaction.atomic():
        booking.status = 'CANCELLED'
        booking.tracking_status = 'CANCELLED'
        booking.cancellation_reason = data.get('reason', 'Cancelled by guest.')
        booking.save()

        # If it was a public tour, restore capacity
        if booking.booking_type == 'TOUR' and booking.public_tour:
            booking.public_tour.booked_capacity = max(0, booking.public_tour.booked_capacity - booking.number_of_people)
            booking.public_tour.save()

    return JsonResponse({'success': True, 'message': 'Reservation cancelled successfully.', 'booking': serialize_booking(booking)})


@csrf_exempt
def api_review_booking(request, booking_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.get(booking_id=booking_id, user=request.user)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if booking.status != 'COMPLETED':
        return JsonResponse({'error': 'Only completed voyages can be reviewed.'}, status=400)

    if hasattr(booking, 'review') or CrossReview.objects.filter(booking=booking).exists():
        return JsonResponse({'error': 'You have already reviewed this voyage.'}, status=400)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    rating = int(data.get('rating', 5))
    comment = data.get('comment', '').strip()

    if not comment:
        return JsonResponse({'error': 'Review comment cannot be empty.'}, status=400)

    review = CrossReview.objects.create(
        cross=booking.cross,
        user=request.user,
        booking=booking,
        rating=max(1, min(5, rating)),
        comment=comment
    )

    return JsonResponse({'success': True, 'message': 'Review published successfully!'})


# =====================================================================
# OPERATOR DASHBOARD & FLEET MANAGEMENT APIS
# =====================================================================

def api_operator_dashboard(request):
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
    if is_admin_mode:
        vessels = Cross.objects.all().prefetch_related('extras', 'public_tours')
        bookings = Booking.objects.all().select_related('cross', 'user', 'public_tour').order_by('-created_at')
        tours = PublicTour.objects.all().order_by('-departure_date')
    else:
        vessels = Cross.objects.filter(owner=request.user).prefetch_related('extras', 'public_tours')
        bookings = Booking.objects.filter(cross__owner=request.user).select_related('cross', 'user', 'public_tour').order_by('-created_at')
        tours = PublicTour.objects.filter(ship__owner=request.user).order_by('-departure_date')

    earnings = bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    # Breakdown by booking type
    private_rev = bookings.filter(status__in=['CONFIRMED', 'COMPLETED'], booking_type='EVENT').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    tour_rev = bookings.filter(status__in=['CONFIRMED', 'COMPLETED'], booking_type='TOUR').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    serialized_ships = [serialize_cruise(v) for v in vessels]
    available_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'AVAILABLE')
    booked_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'BOOKED')
    on_tour_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'ON_TOUR')
    maintenance_count = sum(1 for s in serialized_ships if s.get('operational_status') == 'MAINTENANCE')

    earnings_dec = Decimal(str(earnings))
    owner_payout_dec = round(earnings_dec * Decimal('0.85'), 2)
    platform_comm_dec = round(earnings_dec * Decimal('0.15'), 2)

    stats = {
        'total_ships': len(serialized_ships),
        'total_vessels': len(serialized_ships),
        'active_ships': vessels.filter(is_active=True).count(),
        'available_ships': available_count,
        'booked_ships': booked_count,
        'on_tour_ships': on_tour_count,
        'maintenance_ships': maintenance_count,
        'total_bookings': bookings.count(),
        'active_bookings': bookings.filter(status__in=['PENDING', 'CONFIRMED']).count(),
        'pending_bookings': bookings.filter(status='PENDING').count(),
        'confirmed_bookings': bookings.filter(status='CONFIRMED').count(),
        'completed_trips': bookings.filter(status='COMPLETED').count(),
        'total_revenue': float(earnings_dec),
        'gross_revenue': float(earnings_dec),
        'owner_payout': float(owner_payout_dec),
        'platform_commission': float(platform_comm_dec),
        'payout_rate': 0.85,
        'commission_rate': 0.15,
        'private_revenue': float(private_rev),
        'tour_revenue': float(tour_rev),
    }

    # -------------------------------------------------------------
    # Owner Fleet Analytics & Charts Data
    # -------------------------------------------------------------
    # 1. Monthly Revenue & Bookings Trend (Chronological)
    monthly_dict = {}
    months_keys = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for m in months_keys:
        monthly_dict[m] = {'month': m, 'revenue': 0.0, 'payout': 0.0, 'bookings_count': 0}

    for b in bookings:
        b_date = b.booking_date or (b.created_at.date() if b.created_at else None)
        if b_date:
            m_key = b_date.strftime('%b')
            if m_key in monthly_dict:
                monthly_dict[m_key]['bookings_count'] += 1
                if b.status in ['CONFIRMED', 'COMPLETED']:
                    amt = float(b.total_price or 0)
                    monthly_dict[m_key]['revenue'] += amt
                    monthly_dict[m_key]['payout'] += round(amt * 0.85, 2)

    monthly_trend = [monthly_dict[m] for m in months_keys if monthly_dict[m]['bookings_count'] > 0 or monthly_dict[m]['revenue'] > 0]
    if not monthly_trend:
        monthly_trend = list(monthly_dict.values())[:6]

    # 2. Category Ratio (Private Charters vs Public Tours)
    priv_cnt = bookings.filter(booking_type='EVENT').count()
    tour_cnt = bookings.filter(booking_type='TOUR').count()
    tot_cnt = priv_cnt + tour_cnt or 1
    priv_pct = round((priv_cnt / tot_cnt) * 100)
    tour_pct = 100 - priv_pct

    category_split = {
        'private_count': priv_cnt,
        'private_revenue': float(private_rev),
        'private_percent': priv_pct,
        'tour_count': tour_cnt,
        'tour_revenue': float(tour_rev),
        'tour_percent': tour_pct,
    }

    # 3. Status Breakdown
    status_breakdown = {
        'confirmed': bookings.filter(status='CONFIRMED').count(),
        'completed': bookings.filter(status='COMPLETED').count(),
        'pending': bookings.filter(status='PENDING').count(),
        'cancelled': bookings.filter(status='CANCELLED').count(),
        'total': bookings.count(),
    }

    # 4. Ship Performance Ranking
    ship_performance = []
    for s in vessels:
        s_b = bookings.filter(cross=s)
        s_rev = float(s_b.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or 0)
        s_guests = sum((getattr(b, 'number_of_people', 1) or 1) for b in s_b)
        img_url = s.image.url if getattr(s, 'image', None) and s.image else '/static/images/vessels/cordelia_empress.jpg'
        ship_performance.append({
            'ship_id': s.id,
            'ship_name': s.name,
            'location': s.location or 'Mumbai',
            'image': img_url,
            'category': s.category or 'Cruiser',
            'bookings_count': s_b.count(),
            'revenue': s_rev,
            'payout': round(s_rev * 0.85, 2),
            'guests': s_guests,
        })
    ship_performance.sort(key=lambda x: x['revenue'], reverse=True)

    # 5. Top Maritime Destinations
    dest_dict = {}
    for b in bookings:
        dest_val = (b.public_tour.destination if b.public_tour else (b.cross.destination if b.cross else 'High Seas')) or 'High Seas'
        dest_val = dest_val.strip()
        if dest_val not in dest_dict:
            dest_dict[dest_val] = {'destination': dest_val, 'count': 0, 'revenue': 0.0}
        dest_dict[dest_val]['count'] += 1
        if b.status in ['CONFIRMED', 'COMPLETED']:
            dest_dict[dest_val]['revenue'] += float(b.total_price or 0)
    top_destinations = sorted(dest_dict.values(), key=lambda x: x['count'], reverse=True)[:5]

    analytics = {
        'monthly_trend': monthly_trend,
        'category_split': category_split,
        'status_breakdown': status_breakdown,
        'ship_performance': ship_performance,
        'top_destinations': top_destinations,
    }

    return JsonResponse({
        'stats': stats,
        'earnings': float(earnings_dec),
        'owner_payout': float(owner_payout_dec),
        'platform_commission': float(platform_comm_dec),
        'my_ships': serialized_ships,
        'vessels': serialized_ships,
        'my_tours': [serialize_tour(t) for t in tours[:10]],
        'recent_bookings': [serialize_booking(b) for b in bookings[:50]],
        'analytics': analytics,
    })


@csrf_exempt
def api_operator_ships(request):
    """List or create ships for the logged-in operator."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    if request.method == 'GET':
        is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
        if is_admin_mode:
            ships = Cross.objects.all().prefetch_related('extras')
        else:
            ships = Cross.objects.filter(owner=request.user).prefetch_related('extras')
        return JsonResponse({'ships': [serialize_cruise(s) for s in ships]})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        name = data.get('name', '').strip()
        if not name:
            return JsonResponse({'error': 'Ship name is required.'}, status=400)

        price = Decimal(str(data.get('price', 50000)))
        capacity = int(data.get('capacity', 100))

        ship = Cross.objects.create(
            owner=request.user,
            name=name,
            category=data.get('category', 'Luxury Ocean Cruise'),
            description=data.get('description', ''),
            location=data.get('location', 'Mumbai'),
            address=data.get('address', 'International Cruise Terminal'),
            price=price,
            capacity=capacity,
            supports_private_charter=bool(data.get('supports_private_charter', True)),
            supports_public_tours=bool(data.get('supports_public_tours', True)),
            supports_weddings=bool(data.get('supports_weddings', True)),
            supports_birthdays=bool(data.get('supports_birthdays', True)),
            supports_corporate=bool(data.get('supports_corporate', True)),
            supports_conferences=bool(data.get('supports_conferences', False)),
            supports_parties=bool(data.get('supports_parties', True)),
            supports_dinners=bool(data.get('supports_dinners', True)),
            destination=data.get('destination', 'Goa & Arabian Sea'),
            route=data.get('route', 'Mumbai - Goa - Mumbai'),
            departure_port=data.get('departure_port', 'Mumbai Cruise Terminal'),
            duration_days=int(data.get('duration_days', 3)),
            ship_length_meters=int(data.get('ship_length_meters', 200)),
            beam_meters=int(data.get('beam_meters', 28)),
            decks_count=int(data.get('decks_count', 8)),
            cabin_count=int(data.get('cabin_count', 80)),
            image_url=data.get('image_url', ''),
            facilities=data.get('facilities', 'Wi-Fi, Swimming Pool, Fine Dining, Sun Deck'),
            is_active=True,
            is_approved=True,
        )

        return JsonResponse({
            'success': True,
            'message': f'Ship {ship.name} registered successfully!',
            'ship': serialize_cruise(ship)
        })


@csrf_exempt
def api_operator_ship_detail(request, ship_id):
    """GET, PUT, or DELETE a specific ship owned by the operator."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    try:
        ship = Cross.objects.get(id=ship_id)
    except Cross.DoesNotExist:
        return JsonResponse({'error': 'Ship not found.'}, status=404)

    if ship.owner != request.user and not request.user.is_superuser:
        return JsonResponse({'error': 'Forbidden. You do not own this vessel.'}, status=403)

    if request.method == 'GET':
        return JsonResponse({'ship': serialize_cruise(ship)})

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        for field in ['name', 'category', 'description', 'location', 'address', 'destination', 'route', 'departure_port', 'image_url', 'facilities']:
            if field in data:
                setattr(ship, field, data[field])

        if 'price' in data:
            ship.price = Decimal(str(data['price']))
        if 'capacity' in data:
            ship.capacity = int(data['capacity'])
        if 'is_active' in data:
            ship.is_active = bool(data['is_active'])

        for bool_field in ['supports_private_charter', 'supports_public_tours', 'supports_weddings', 'supports_birthdays', 'supports_corporate', 'supports_conferences', 'supports_parties', 'supports_dinners']:
            if bool_field in data:
                setattr(ship, bool_field, bool(data[bool_field]))

        ship.save()
        return JsonResponse({'success': True, 'message': 'Ship updated successfully.', 'ship': serialize_cruise(ship)})

    elif request.method == 'DELETE':
        ship.delete()
        return JsonResponse({'success': True, 'message': 'Ship deleted successfully.'})


@csrf_exempt
def api_operator_tours(request):
    """List or create public tours for ships owned by this operator."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    if request.method == 'GET':
        is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
        if is_admin_mode:
            tours = PublicTour.objects.all().select_related('ship').order_by('-departure_date')
        else:
            tours = PublicTour.objects.filter(ship__owner=request.user).select_related('ship').order_by('-departure_date')
        return JsonResponse({'tours': [serialize_tour(t) for t in tours]})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        ship_id = data.get('ship_id')
        try:
            ship = Cross.objects.get(id=ship_id, owner=request.user)
        except Cross.DoesNotExist:
            return JsonResponse({'error': 'Ship not found or not owned by you.'}, status=404)

        tour_title = data.get('tour_title', '').strip()
        dep_date = datetime.strptime(data.get('departure_date'), '%Y-%m-%d').date()
        ret_date = datetime.strptime(data.get('return_date'), '%Y-%m-%d').date()
        dep_time = datetime.strptime(data.get('departure_time', '16:00'), '%H:%M').time()
        ret_time = datetime.strptime(data.get('return_time', '10:00'), '%H:%M').time()

        tour = PublicTour.objects.create(
            ship=ship,
            tour_title=tour_title,
            departure_port=data.get('departure_port', ship.departure_port),
            destination=data.get('destination', ship.destination),
            departure_date=dep_date,
            departure_time=dep_time,
            return_date=ret_date,
            return_time=ret_time,
            duration_days=int(data.get('duration_days', (ret_date - dep_date).days or 1)),
            total_capacity=int(data.get('total_capacity', ship.capacity)),
            adult_price=Decimal(str(data.get('adult_price', 12999))),
            child_price=Decimal(str(data.get('child_price', 6999))),
            itinerary=data.get('itinerary', ''),
            ports_of_call=data.get('ports_of_call', ''),
            meals_included=data.get('meals_included', 'All Gourmet Meals Included'),
            is_published=True,
        )

        return JsonResponse({'success': True, 'message': 'Public cruise tour published!', 'tour': serialize_tour(tour)})


@csrf_exempt
def api_operator_action(request, booking_id, action):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    try:
        booking = Booking.objects.get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if booking.cross.owner != request.user and not request.user.is_superuser:
        return JsonResponse({'error': 'You can only manage your own vessels.'}, status=403)

    if action == 'confirm':
        booking.status = 'CONFIRMED'
        booking.tracking_status = 'CONFIRMED'
    elif action in ['reject', 'cancel']:
        booking.status = 'CANCELLED'
        booking.tracking_status = 'CANCELLED'
    elif action == 'complete':
        booking.status = 'COMPLETED'
        booking.tracking_status = 'COMPLETED'
    elif action == 'board':
        booking.tracking_status = 'BOARDING'
    elif action == 'depart':
        booking.tracking_status = 'DEPARTED'
    elif action == 'arrive':
        booking.tracking_status = 'ARRIVED'
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    booking.save()
    return JsonResponse({
        'success': True,
        'message': f'Booking #{booking_id} status updated to {booking.status}.',
        'booking': serialize_booking(booking)
    })


# =====================================================================
# ADMIN DASHBOARD & PLATFORM MANAGEMENT APIS
# =====================================================================

def get_admin_analytics_data(range_param='30d', custom_start=None, custom_end=None, granularity='auto'):
    """Helper to calculate verified real-database KPIs, profit reconciliation, and 10 interactive charts."""
    today = timezone.localdate()

    if range_param == '7d':
        start_date = today - timedelta(days=7)
        end_date = today
        granularity = 'daily' if granularity == 'auto' else granularity
    elif range_param == '30d':
        start_date = today - timedelta(days=30)
        end_date = today
        granularity = 'daily' if granularity == 'auto' else granularity
    elif range_param == '6m':
        start_date = today - timedelta(days=180)
        end_date = today
        granularity = 'monthly' if granularity == 'auto' else granularity
    elif range_param == '1y':
        start_date = today - timedelta(days=365)
        end_date = today
        granularity = 'monthly' if granularity == 'auto' else granularity
    elif range_param == 'custom' and custom_start and custom_end:
        start_date = custom_start
        end_date = custom_end
        span_days = max(1, (end_date - start_date).days)
        granularity = 'daily' if span_days <= 35 else ('weekly' if span_days <= 120 else 'monthly') if granularity == 'auto' else granularity
    else:  # 'all'
        min_date = Booking.objects.order_by('booking_date').values_list('booking_date', flat=True).first() or today
        start_date = min_date
        end_date = today + timedelta(days=365)
        granularity = 'monthly' if granularity == 'auto' else granularity

    all_bookings = Booking.objects.all().select_related('cross', 'user', 'public_tour')
    all_confirmed = all_bookings.filter(status__in=['CONFIRMED', 'COMPLETED'])

    # Global DB stats
    users_count = User.objects.filter(role__in=['USER', 'CUSTOMER']).count()
    owners_count = User.objects.filter(role__in=['OWNER', 'CROSS_OWNER', 'OPERATOR']).count()
    ships_count = Cross.objects.count()
    active_ships_count = Cross.objects.filter(is_active=True).count()
    external_operators_count = Operator.objects.count()
    tours_count = PublicTour.objects.count()

    # Exact Profit Formula: Gross Revenue - Owner Payout - Refund/Discount = Platform Profit
    gross_rev = all_confirmed.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    owner_payout = all_confirmed.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
    discount_amount = all_confirmed.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
    platform_profit = gross_rev - owner_payout - discount_amount

    # Period filtered bookings
    period_bookings = all_bookings.filter(booking_date__gte=start_date, booking_date__lte=end_date)
    period_confirmed = period_bookings.filter(status__in=['CONFIRMED', 'COMPLETED'])

    p_gross_rev = period_confirmed.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    p_owner_payout = period_confirmed.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
    p_discount = period_confirmed.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
    p_profit = p_gross_rev - p_owner_payout - p_discount

    # Mandatory Top KPI Cards
    private_count = all_bookings.filter(booking_type='EVENT').count()
    public_tours_count = PublicTour.objects.count()
    public_tickets_count = all_bookings.filter(booking_type='TOUR', status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('number_of_people'))['number_of_people__sum'] or 0
    cancellations_count = all_bookings.filter(status='CANCELLED').count()
    cancellation_rate = round((cancellations_count / max(1, all_bookings.count())) * 100, 1)

    kpis = {
        'total_users': users_count,
        'total_owners': owners_count,
        'total_ships': ships_count,
        'active_ships': active_ships_count,
        'external_operators': external_operators_count,
        'private_bookings': private_count,
        'public_tours': public_tours_count,
        'public_tickets': public_tickets_count,
        'gross_revenue': float(gross_rev),
        'owner_payout': float(owner_payout),
        'discount_amount': float(discount_amount),
        'platform_profit': float(platform_profit),
        'cancellations': cancellations_count,
        'cancellation_rate': cancellation_rate,
        # Period specific numbers
        'period_gross_revenue': float(p_gross_rev),
        'period_owner_payout': float(p_owner_payout),
        'period_discount': float(p_discount),
        'period_platform_profit': float(p_profit),
        'period_bookings_count': period_bookings.count(),
        'period_private_count': period_bookings.filter(booking_type='EVENT').count(),
        'period_tour_count': period_bookings.filter(booking_type='TOUR').count(),
        'period_tickets': period_confirmed.filter(booking_type='TOUR').aggregate(Sum('number_of_people'))['number_of_people__sum'] or 0,
        'period_cancellations': period_bookings.filter(status='CANCELLED').count(),
    }

    # 1. Revenue Trend (Daily / Weekly / Monthly)
    revenue_trend = []
    if granularity == 'daily':
        days_count = max(1, (end_date - start_date).days + 1)
        for i in range(days_count):
            day = start_date + timedelta(days=i)
            day_bookings = period_confirmed.filter(booking_date=day)
            day_rev = day_bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
            day_payout = day_bookings.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
            day_disc = day_bookings.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
            day_profit = day_rev - day_payout - day_disc
            revenue_trend.append({
                'date': day.strftime('%Y-%m-%d'),
                'label': day.strftime('%d %b'),
                'gross_revenue': float(day_rev),
                'owner_payout': float(day_payout),
                'discount_amount': float(day_disc),
                'platform_profit': float(day_profit),
                'bookings_count': day_bookings.count(),
            })
    elif granularity == 'weekly':
        curr = start_date
        while curr <= end_date:
            w_end = min(end_date, curr + timedelta(days=6))
            w_bookings = period_confirmed.filter(booking_date__gte=curr, booking_date__lte=w_end)
            w_rev = w_bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
            w_payout = w_bookings.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
            w_disc = w_bookings.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
            w_profit = w_rev - w_payout - w_disc
            revenue_trend.append({
                'date': curr.strftime('%Y-%m-%d'),
                'label': f"{curr.strftime('%d %b')} - {w_end.strftime('%d %b')}",
                'gross_revenue': float(w_rev),
                'owner_payout': float(w_payout),
                'discount_amount': float(w_disc),
                'platform_profit': float(w_profit),
                'bookings_count': w_bookings.count(),
            })
            curr = w_end + timedelta(days=1)
    else:  # monthly
        for m in range(1, 13):
            m_bookings = all_confirmed.filter(booking_date__year=today.year, booking_date__month=m)
            m_rev = m_bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
            m_payout = m_bookings.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
            m_disc = m_bookings.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
            m_profit = m_rev - m_payout - m_disc
            revenue_trend.append({
                'date': f"{today.year}-{m:02d}-01",
                'label': date(today.year, m, 1).strftime('%b %Y'),
                'gross_revenue': float(m_rev),
                'owner_payout': float(m_payout),
                'discount_amount': float(m_disc),
                'platform_profit': float(m_profit),
                'bookings_count': m_bookings.count(),
            })

    # 2. Platform Profit Trend (Monthly profit over last 12 months)
    platform_profit_trend = []
    for m in range(1, 13):
        m_bookings = all_confirmed.filter(booking_date__year=today.year, booking_date__month=m)
        m_rev = m_bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
        m_payout = m_bookings.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
        m_disc = m_bookings.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
        m_profit = m_rev - m_payout - m_disc
        margin_pct = round((float(m_profit) / float(m_rev) * 100), 1) if m_rev > Decimal('0.00') else 0.0
        platform_profit_trend.append({
            'month': date(today.year, m, 1).strftime('%b'),
            'month_label': date(today.year, m, 1).strftime('%b %Y'),
            'gross_revenue': float(m_rev),
            'owner_payout': float(m_payout),
            'discount_amount': float(m_disc),
            'platform_profit': float(m_profit),
            'margin_percentage': margin_pct,
            'bookings_count': m_bookings.count()
        })

    # 3. Bookings (Private vs Public)
    priv_period = period_confirmed.filter(booking_type='EVENT')
    tour_period = period_confirmed.filter(booking_type='TOUR')
    priv_rev = priv_period.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    tour_rev = tour_period.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    priv_tickets = priv_period.aggregate(Sum('number_of_people'))['number_of_people__sum'] or 0
    tour_tickets = tour_period.aggregate(Sum('number_of_people'))['number_of_people__sum'] or 0
    total_period_count = max(1, priv_period.count() + tour_period.count())

    bookings_private_vs_public = {
        'private': {
            'count': priv_period.count(),
            'revenue': float(priv_rev),
            'tickets': priv_tickets,
            'percentage': round((priv_period.count() / total_period_count) * 100, 1),
            'revenue_percentage': round((float(priv_rev) / max(1.0, float(priv_rev + tour_rev))) * 100, 1)
        },
        'public': {
            'count': tour_period.count(),
            'revenue': float(tour_rev),
            'tickets': tour_tickets,
            'percentage': round((tour_period.count() / total_period_count) * 100, 1),
            'revenue_percentage': round((float(tour_rev) / max(1.0, float(priv_rev + tour_rev))) * 100, 1)
        }
    }

    # 4. Ship Performance (Most Booked Ships)
    ship_aggs = period_confirmed.values(
        'cross__id', 'cross__name', 'cross__location', 'cross__category'
    ).annotate(
        bookings_count=Count('id'),
        revenue=Sum('total_price'),
        payout=Sum('owner_payout_amount'),
        discount=Sum('discount_amount')
    ).order_by('-revenue', '-bookings_count')[:10]

    ship_performance = []
    for s in ship_aggs:
        rev_dec = s['revenue'] or Decimal('0.00')
        pay_dec = s['payout'] or Decimal('0.00')
        disc_dec = s['discount'] or Decimal('0.00')
        prof_dec = rev_dec - pay_dec - disc_dec
        ship_obj = Cross.objects.filter(id=s['cross__id']).first()
        ship_performance.append({
            'ship_id': s['cross__id'],
            'ship_name': s['cross__name'],
            'location': s['cross__location'],
            'category': s['cross__category'],
            'bookings_count': s['bookings_count'],
            'revenue': float(rev_dec),
            'owner_payout': float(pay_dec),
            'platform_profit': float(prof_dec),
            'image_url': ship_obj.display_image_url if ship_obj else '/static/images/placeholder.png',
        })

    # 5. Destination Analysis
    dest_aggs = period_confirmed.values('cross__destination').annotate(
        bookings_count=Count('id'),
        revenue=Sum('total_price')
    ).order_by('-bookings_count', '-revenue')[:10]

    tot_dest_rev = sum([item['revenue'] or Decimal('0.00') for item in dest_aggs]) or Decimal('1.00')
    destination_analysis = []
    for d in dest_aggs:
        d_name = d['cross__destination'] or 'Arabian Sea'
        d_rev = d['revenue'] or Decimal('0.00')
        destination_analysis.append({
            'destination': d_name,
            'bookings_count': d['bookings_count'],
            'revenue': float(d_rev),
            'share_percentage': round((float(d_rev) / float(tot_dest_rev)) * 100, 1)
        })

    # 6. Public Tour Occupancy
    tours_all = PublicTour.objects.all().select_related('ship')
    total_tour_cap = tours_all.aggregate(Sum('total_capacity'))['total_capacity__sum'] or 0
    booked_tour_cap = tours_all.aggregate(Sum('booked_capacity'))['booked_capacity__sum'] or 0
    avg_occupancy = round((booked_tour_cap / max(1, total_tour_cap)) * 100, 1)

    tours_occupancy_list = []
    for t in tours_all[:12]:
        t_bookings = Booking.objects.filter(public_tour=t, status__in=['CONFIRMED', 'COMPLETED'])
        t_rev = t_bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
        occ_pct = round((t.booked_capacity / max(1, t.total_capacity)) * 100, 1)
        tours_occupancy_list.append({
            'tour_id': t.id,
            'tour_title': t.tour_title,
            'ship_name': t.ship.name,
            'departure_date': t.departure_date.strftime('%Y-%m-%d'),
            'total_capacity': t.total_capacity,
            'booked_capacity': t.booked_capacity,
            'remaining_capacity': t.remaining_capacity,
            'occupancy_percentage': occ_pct,
            'revenue': float(t_rev),
            'status': t.status
        })

    public_tour_occupancy = {
        'total_capacity': total_tour_cap,
        'booked_capacity': booked_tour_cap,
        'remaining_capacity': max(0, total_tour_cap - booked_tour_cap),
        'average_occupancy_rate': avg_occupancy,
        'tours': tours_occupancy_list
    }

    # 7. Booking Status Breakdown
    status_order = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED']
    status_labels = {
        'CONFIRMED': 'Confirmed',
        'PENDING': 'Pending Confirmation',
        'COMPLETED': 'Voyage Completed',
        'CANCELLED': 'Cancelled',
    }
    status_colors = {
        'CONFIRMED': '#10B981',
        'PENDING': '#F59E0B',
        'COMPLETED': '#3B82F6',
        'CANCELLED': '#EF4444',
    }
    status_breakdown = []
    tot_status_bookings = max(1, period_bookings.count())
    for st in status_order:
        st_filter = period_bookings.filter(status=st)
        st_count = st_filter.count()
        st_rev = st_filter.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
        status_breakdown.append({
            'status': st,
            'label': status_labels.get(st, st),
            'count': st_count,
            'revenue': float(st_rev),
            'share_percentage': round((st_count / tot_status_bookings) * 100, 1),
            'color': status_colors.get(st, '#6B7280')
        })

    # 8. Revenue by Ship
    rev_by_ship = []
    tot_ship_rev = max(Decimal('1.00'), sum([Decimal(str(item['revenue'])) for item in ship_performance]))
    for item in ship_performance:
        rev_by_ship.append({
            'ship_id': item['ship_id'],
            'ship_name': item['ship_name'],
            'category': item['category'],
            'revenue': item['revenue'],
            'bookings_count': item['bookings_count'],
            'share_percentage': round((Decimal(str(item['revenue'])) / tot_ship_rev) * Decimal('100.0'), 1)
        })

    # 9. Revenue by Destination
    rev_by_destination = []
    for item in destination_analysis:
        rev_by_destination.append({
            'destination': item['destination'],
            'revenue': item['revenue'],
            'bookings_count': item['bookings_count'],
            'share_percentage': item['share_percentage']
        })

    # 10. Monthly Growth (Month-over-month)
    monthly_growth = []
    prev_rev = None
    prev_cnt = None
    for item in platform_profit_trend:
        cur_rev = item['gross_revenue']
        cur_cnt = item['bookings_count']
        rev_growth = 0.0
        cnt_growth = 0.0
        if prev_rev is not None and prev_rev > 0:
            rev_growth = round(((cur_rev - prev_rev) / prev_rev) * 100, 1)
        elif prev_rev == 0 and cur_rev > 0:
            rev_growth = 100.0

        if prev_cnt is not None and prev_cnt > 0:
            cnt_growth = round(((cur_cnt - prev_cnt) / prev_cnt) * 100, 1)
        elif prev_cnt == 0 and cur_cnt > 0:
            cnt_growth = 100.0

        monthly_growth.append({
            'month': item['month'],
            'month_label': item['month_label'],
            'revenue': cur_rev,
            'revenue_growth_percentage': rev_growth,
            'bookings_count': cur_cnt,
            'bookings_growth_percentage': cnt_growth,
            'profit': item['platform_profit'],
        })
        prev_rev = cur_rev
        prev_cnt = cur_cnt

    return {
        'success': True,
        'kpis': kpis,
        'date_range': {
            'selected_range': range_param,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'granularity': granularity
        },
        'charts': {
            'revenue_trend': revenue_trend,
            'platform_profit_trend': platform_profit_trend,
            'bookings_private_vs_public': bookings_private_vs_public,
            'ship_performance': ship_performance,
            'destination_analysis': destination_analysis,
            'public_tour_occupancy': public_tour_occupancy,
            'booking_status_breakdown': status_breakdown,
            'revenue_by_ship': rev_by_ship,
            'revenue_by_destination': rev_by_destination,
            'monthly_growth': monthly_growth,
        }
    }


def api_admin_analytics(request):
    """Admin endpoint returning comprehensive, verified real-database business analytics & charts."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    range_param = request.GET.get('range', '30d').strip().lower()
    start_date_str = request.GET.get('start_date', '').strip()
    end_date_str = request.GET.get('end_date', '').strip()
    granularity = request.GET.get('granularity', 'auto').strip().lower()

    custom_start = None
    custom_end = None
    if start_date_str:
        try:
            custom_start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass
    if end_date_str:
        try:
            custom_end = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    analytics_data = get_admin_analytics_data(
        range_param=range_param,
        custom_start=custom_start,
        custom_end=custom_end,
        granularity=granularity
    )
    return JsonResponse(analytics_data)


def api_admin_dashboard(request):
    """Admin master dashboard overview endpoint."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    analytics_pack = get_admin_analytics_data('30d')
    kpis = analytics_pack['kpis']
    charts = analytics_pack['charts']
    all_bookings = Booking.objects.select_related('cross', 'user', 'public_tour').order_by('-created_at')

    # Retain exact legacy field compatibility while providing all new KPIs and charts
    stats = {
        'total_users': kpis['total_users'],
        'total_owners': kpis['total_owners'],
        'total_operators': kpis['total_owners'],
        'total_ships': kpis['total_ships'],
        'active_ships': kpis['active_ships'],
        'external_operators': kpis['external_operators'],
        'external_operators_count': kpis['external_operators'],
        'total_tours': kpis['public_tours'],
        'active_tours': PublicTour.objects.filter(is_published=True, departure_date__gte=date.today()).count(),
        'total_bookings': all_bookings.count(),
        'private_bookings': kpis['private_bookings'],
        'tour_bookings': all_bookings.filter(booking_type='TOUR').count(),
        'tickets_count': kpis['public_tickets'],
        'total_tickets': kpis['public_tickets'],
        'pending_requests': all_bookings.filter(status='PENDING').count(),
        'pending_bookings': all_bookings.filter(status='PENDING').count(),
        'confirmed_bookings': all_bookings.filter(status='CONFIRMED').count(),
        'cancelled_bookings': kpis['cancellations'],
        'total_revenue': kpis['gross_revenue'],
        'gross_revenue': kpis['gross_revenue'],
        'owner_payout': kpis['owner_payout'],
        'owner_payout_amount': kpis['owner_payout'],
        'discount_amount': kpis['discount_amount'],
        'platform_commission': kpis['platform_profit'],
        'platform_profit': kpis['platform_profit'],
        'net_platform_profit': kpis['platform_profit'],
        'net_profit': kpis['platform_profit'],
        'occupancy_rate': charts['public_tour_occupancy']['average_occupancy_rate'],
        'tour_occupancy_rate': charts['public_tour_occupancy']['average_occupancy_rate'],
        'cancellation_rate': kpis['cancellation_rate'],
    }

    return JsonResponse({
        'stats': stats,
        'kpis': kpis,
        'total_users': kpis['total_users'],
        'total_operators': kpis['total_owners'],
        'total_ships': kpis['total_ships'],
        'total_revenue': kpis['gross_revenue'],
        'gross_revenue': kpis['gross_revenue'],
        'owner_payout': kpis['owner_payout'],
        'platform_commission': kpis['platform_profit'],
        'platform_profit': kpis['platform_profit'],
        'analytics': {
            'monthly_revenue': [
                {
                    'month': item['month'],
                    'month_number': idx + 1,
                    'revenue': item['gross_revenue'],
                    'profit': item['platform_profit'],
                    'bookings_count': item['bookings_count']
                } for idx, item in enumerate(charts['platform_profit_trend'])
            ],
            'top_ships': [
                {
                    'name': s['ship_name'],
                    'location': s['location'],
                    'bookings_count': s['bookings_count'],
                    'revenue': s['revenue']
                } for s in charts['ship_performance'][:6]
            ],
            'top_destinations': [
                {
                    'destination': d['destination'],
                    'count': d['bookings_count']
                } for d in charts['destination_analysis'][:6]
            ],
            'private_vs_public': {
                'private_count': charts['bookings_private_vs_public']['private']['count'],
                'private_revenue': charts['bookings_private_vs_public']['private']['revenue'],
                'tour_count': charts['bookings_private_vs_public']['public']['count'],
                'tour_revenue': charts['bookings_private_vs_public']['public']['revenue'],
            },
            'occupancy_rate': charts['public_tour_occupancy']['average_occupancy_rate'],
            'cancellation_rate': kpis['cancellation_rate'],
        },
        'charts': charts,
        'date_range': analytics_pack['date_range'],
        'recent_bookings': [serialize_booking(b) for b in all_bookings[:25]],
    })


@csrf_exempt
def api_admin_offers(request):
    """Admin endpoint to list and create offers."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        offers = Offer.objects.all().order_by('-created_at')
        return JsonResponse({'offers': [serialize_offer(o) for o in offers]})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        code = data.get('code', '').strip().upper()
        if not code:
            return JsonResponse({'error': 'Coupon code is required.'}, status=400)

        offer = Offer.objects.create(
            code=code,
            title=data.get('title', f"Promo {code}"),
            description=data.get('description', ''),
            discount_type=data.get('discount_type', 'PERCENTAGE'),
            discount_value=Decimal(str(data.get('discount_value', 10))),
            min_booking_amount=Decimal(str(data.get('min_booking_amount', 0))),
            max_discount_amount=Decimal(str(data.get('max_discount_amount'))) if data.get('max_discount_amount') else None,
            valid_from=datetime.strptime(data.get('valid_from'), '%Y-%m-%d').date(),
            valid_to=datetime.strptime(data.get('valid_to'), '%Y-%m-%d').date(),
            is_active=bool(data.get('is_active', True))
        )

        return JsonResponse({'success': True, 'offer': serialize_offer(offer)})


@csrf_exempt
def api_operator_extras(request):
    """List or create ship extras for operator's fleet."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    if request.method == 'GET':
        ship_id = request.GET.get('ship_id')
        is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
        if is_admin_mode:
            extras = ShipExtra.objects.all()
        else:
            extras = ShipExtra.objects.filter(ship__owner=request.user)
        if ship_id:
            extras = extras.filter(ship_id=ship_id)
        return JsonResponse({'extras': [serialize_extra(e) for e in extras]})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        ship_id = data.get('ship_id')
        try:
            ship = Cross.objects.get(id=ship_id, owner=request.user)
        except Cross.DoesNotExist:
            return JsonResponse({'error': 'Ship not found or not owned by you.'}, status=404)

        extra = ShipExtra.objects.create(
            ship=ship,
            name=data.get('name', 'Premium Extra').strip(),
            description=data.get('description', ''),
            price=Decimal(str(data.get('price', 5000))),
            pricing_mode=data.get('pricing_mode', 'FLAT'),
            is_available=bool(data.get('is_available', True))
        )
        return JsonResponse({'success': True, 'extra': serialize_extra(extra)})

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
        extra_id = data.get('id')
        try:
            extra = ShipExtra.objects.get(id=extra_id, ship__owner=request.user)
        except ShipExtra.DoesNotExist:
            return JsonResponse({'error': 'Extra not found.'}, status=404)

        if 'price' in data:
            extra.price = Decimal(str(data['price']))
        if 'name' in data:
            extra.name = data['name'].strip()
        if 'description' in data:
            extra.description = data['description'].strip()
        if 'pricing_mode' in data:
            extra.pricing_mode = data['pricing_mode']
        if 'is_available' in data:
            extra.is_available = bool(data['is_available'])
        extra.save()
        return JsonResponse({'success': True, 'extra': serialize_extra(extra)})

    elif request.method == 'DELETE':
        extra_id = request.GET.get('id')
        try:
            extra = ShipExtra.objects.get(id=extra_id, ship__owner=request.user)
            extra.delete()
            return JsonResponse({'success': True, 'message': 'Extra deleted.'})
        except ShipExtra.DoesNotExist:
            return JsonResponse({'error': 'Extra not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


def api_operator_availability(request, ship_id):
    """Return 30-day availability timeline for a specific ship."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
    try:
        if is_admin_mode or request.user.is_superuser:
            ship = Cross.objects.get(id=ship_id)
        else:
            ship = Cross.objects.get(id=ship_id, owner=request.user)
    except Cross.DoesNotExist:
        return JsonResponse({'error': 'Ship not found.'}, status=404)

    start_date = date.today()
    days = []
    # Collect bookings and tours for the next 30 days
    bookings = Booking.objects.filter(
        cross=ship,
        booking_date__gte=start_date,
        booking_date__lte=start_date + timedelta(days=30),
        status__in=['CONFIRMED', 'PENDING']
    )
    booked_dates = {b.booking_date.strftime('%Y-%m-%d'): b for b in bookings}

    tours = PublicTour.objects.filter(
        ship=ship,
        departure_date__lte=start_date + timedelta(days=30),
        return_date__gte=start_date,
        is_published=True
    )

    for i in range(30):
        current_day = start_date + timedelta(days=i)
        day_str = current_day.strftime('%Y-%m-%d')
        status = 'Available'
        booking_info = None

        if day_str in booked_dates:
            b = booked_dates[day_str]
            status = 'Private Booking' if b.booking_type == 'EVENT' else 'Tour Booking'
            booking_info = {'id': b.booking_id, 'customer': b.user.get_full_name() or b.user.username}
        else:
            for t in tours:
                if t.departure_date <= current_day <= t.return_date:
                    status = 'Public Tour'
                    booking_info = {'tour': t.tour_title, 'departure': t.departure_date.strftime('%Y-%m-%d')}
                    break

        days.append({
            'date': day_str,
            'day_name': current_day.strftime('%a'),
            'status': status,
            'details': booking_info
        })

    return JsonResponse({'ship_id': ship.id, 'ship_name': ship.name, 'timeline': days})


def api_operator_tour_passengers(request, tour_id):
    """Return passenger manifest for a specific public tour."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
    try:
        if is_admin_mode or request.user.is_superuser:
            tour = PublicTour.objects.get(id=tour_id)
        else:
            tour = PublicTour.objects.get(id=tour_id, ship__owner=request.user)
    except PublicTour.DoesNotExist:
        return JsonResponse({'error': 'Tour not found.'}, status=404)

    bookings = Booking.objects.filter(public_tour=tour).select_related('user').order_by('-created_at')
    passengers = []
    for b in bookings:
        passengers.append({
            'booking_id': b.booking_id,
            'passenger_name': b.user.get_full_name() or b.user.username,
            'email': b.user.email,
            'phone': b.user.phone or '',
            'adults_count': b.adults_count,
            'children_count': b.children_count,
            'passengers_count': b.number_of_people,
            'cabin_type': b.cabin_type or 'Standard',
            'status': b.status,
            'tracking_status': b.tracking_status or b.status,
            'total_price': float(b.total_price),
            'booking_date': b.booking_date.strftime('%Y-%m-%d')
        })

    return JsonResponse({
        'tour_id': tour.id,
        'tour_title': tour.tour_title,
        'ship_name': tour.ship.name,
        'departure_date': tour.departure_date.strftime('%Y-%m-%d'),
        'total_capacity': tour.total_capacity,
        'booked_capacity': tour.booked_capacity,
        'remaining_capacity': tour.remaining_capacity,
        'passengers': passengers
    })


def api_operator_revenue(request):
    """Return detailed revenue breakdown by ship, by month, private vs public tour."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    is_admin_mode = (request.user.role in ['ADMIN'] or request.user.is_superuser) and not Cross.objects.filter(owner=request.user).exists()
    if is_admin_mode:
        bookings = Booking.objects.filter(status__in=['CONFIRMED', 'COMPLETED']).select_related('cross')
        ships_qs = Cross.objects.all()
    else:
        bookings = Booking.objects.filter(cross__owner=request.user, status__in=['CONFIRMED', 'COMPLETED']).select_related('cross')
        ships_qs = Cross.objects.filter(owner=request.user)

    total_rev = bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    private_rev = bookings.filter(booking_type='EVENT').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    tour_rev = bookings.filter(booking_type='TOUR').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    total_rev_dec = Decimal(str(total_rev))
    owner_payout_dec = round(total_rev_dec * Decimal('0.85'), 2)
    platform_comm_dec = round(total_rev_dec * Decimal('0.15'), 2)

    # By ship
    by_ship = []
    for ship in ships_qs:
        ship_rev = bookings.filter(cross=ship).aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
        ship_rev_dec = Decimal(str(ship_rev))
        by_ship.append({
            'ship_id': ship.id,
            'ship_name': ship.name,
            'gross_revenue': float(ship_rev_dec),
            'revenue': float(ship_rev_dec),
            'owner_payout': float(round(ship_rev_dec * Decimal('0.85'), 2)),
            'platform_commission': float(round(ship_rev_dec * Decimal('0.15'), 2)),
            'bookings_count': bookings.filter(cross=ship).count()
        })

    return JsonResponse({
        'total_revenue': float(total_rev_dec),
        'gross_revenue': float(total_rev_dec),
        'owner_payout': float(owner_payout_dec),
        'platform_commission': float(platform_comm_dec),
        'payout_percentage': 85,
        'commission_percentage': 15,
        'private_revenue': float(private_rev),
        'tour_revenue': float(tour_rev),
        'by_ship': by_ship
    })


# ---------------------------------------------------------------------
# ADMIN EXPANDED ENDPOINTS
# ---------------------------------------------------------------------

@csrf_exempt
def api_admin_users(request):
    """Admin endpoint to list, search, filter, and toggle active status of users."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        q = request.GET.get('q', '').strip()
        role = request.GET.get('role', '').strip()
        queryset = User.objects.all().order_by('-date_joined')

        if q and q.lower() not in ['undefined', 'null']:
            queryset = queryset.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        if role and role.lower() not in ['undefined', 'null']:
            queryset = queryset.filter(role=role)

        users_list = []
        for u in queryset[:50]:
            users_list.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'full_name': u.get_full_name() or u.username,
                'role': u.role,
                'is_active': u.is_active,
                'date_joined': u.date_joined.strftime('%Y-%m-%d'),
                'bookings_count': u.bookings.count() if hasattr(u, 'bookings') else 0
            })
        return JsonResponse({'users': users_list})

    elif request.method == 'POST':
        # Toggle user active status
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
        user_id = data.get('user_id')
        try:
            target_user = User.objects.get(id=user_id)
            if target_user.is_superuser:
                return JsonResponse({'error': 'Cannot deactivate superuser.'}, status=400)
            target_user.is_active = not target_user.is_active
            target_user.save()
            return JsonResponse({'success': True, 'is_active': target_user.is_active, 'message': f'User {target_user.username} active status updated.'})
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_owners(request):
    """Admin endpoint to list, approve, suspend, or activate ship owners."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        owners = User.objects.filter(role__in=['OWNER', 'CROSS_OWNER']).order_by('-date_joined')
        owners_list = []
        for o in owners:
            ships = Cross.objects.filter(owner=o)
            ships_count = ships.count()
            rev = Booking.objects.filter(cross__owner=o, status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
            owners_list.append({
                'id': o.id,
                'username': o.username,
                'email': o.email,
                'full_name': o.get_full_name() or o.username,
                'phone': o.phone or '',
                'is_approved_owner': o.is_approved_owner,
                'is_active': o.is_active,
                'ships_count': ships_count,
                'total_revenue': float(rev),
                'date_joined': o.date_joined.strftime('%Y-%m-%d')
            })
        return JsonResponse({'owners': owners_list})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
        owner_id = data.get('owner_id')
        action = data.get('action')  # 'approve', 'reject', 'toggle_active'
        try:
            owner = User.objects.get(id=owner_id, role__in=['OWNER', 'CROSS_OWNER'])
            if action == 'approve':
                owner.is_approved_owner = True
            elif action == 'reject':
                owner.is_approved_owner = False
            elif action == 'toggle_active':
                owner.is_active = not owner.is_active
            owner.save()
            return JsonResponse({'success': True, 'message': f'Owner {owner.username} updated.'})
        except User.DoesNotExist:
            return JsonResponse({'error': 'Owner not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_ships(request):
    """Admin endpoint to list all platform ships, approve, toggle active, or delete."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        ships = Cross.objects.all().select_related('owner', 'operator').order_by('-created_at')
        ships_list = []
        for s in ships:
            owner_name = 'Platform Fleet'
            if s.owner:
                owner_name = s.owner.get_full_name() or s.owner.username
            elif s.operator:
                owner_name = s.operator.name
            ships_list.append({
                'id': s.id,
                'name': s.name,
                'slug': s.slug,
                'owner_name': owner_name,
                'category': s.category,
                'location': s.location,
                'price': float(s.price),
                'capacity': s.capacity,
                'is_active': s.is_active,
                'is_approved': s.is_approved,
                'image_url': s.display_image_url
            })
        return JsonResponse({'ships': ships_list})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
        ship_id = data.get('ship_id')
        action = data.get('action')  # 'approve', 'toggle_active', 'delete'
        try:
            ship = Cross.objects.get(id=ship_id)
            if action == 'approve':
                ship.is_approved = True
                ship.save()
            elif action == 'toggle_active':
                ship.is_active = not ship.is_active
                ship.save()
            elif action == 'delete':
                ship.delete()
                return JsonResponse({'success': True, 'message': 'Ship deleted.'})
            return JsonResponse({'success': True, 'message': f'Ship {ship.name} updated.'})
        except Cross.DoesNotExist:
            return JsonResponse({'error': 'Ship not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_bookings(request):
    """Admin endpoint to list and manage all platform bookings."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        b_type = request.GET.get('type', '').strip()
        status = request.GET.get('status', '').strip()
        queryset = Booking.objects.all().select_related('cross', 'user', 'public_tour', 'cross__owner').order_by('-created_at')

        if b_type and b_type.lower() not in ['undefined', 'null', 'all']:
            queryset = queryset.filter(booking_type=b_type)
        if status and status.lower() not in ['undefined', 'null', 'all']:
            queryset = queryset.filter(status=status)

        return JsonResponse({'bookings': [serialize_booking(b) for b in queryset[:100]]})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
        booking_id = data.get('booking_id')
        new_status = data.get('status')
        try:
            b = Booking.objects.get(booking_id=booking_id)
            if new_status in ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING']:
                b.status = new_status
                b.tracking_status = new_status
                b.save()
                return JsonResponse({'success': True, 'booking': serialize_booking(b)})
            return JsonResponse({'error': 'Invalid status.'}, status=400)
        except Booking.DoesNotExist:
            return JsonResponse({'error': 'Booking not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_tours(request):
    """Admin endpoint to list, publish/unpublish, or cancel public tours."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        tours = PublicTour.objects.all().select_related('ship', 'ship__owner').order_by('-departure_date')
        return JsonResponse({'tours': [serialize_tour(t) for t in tours]})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
        tour_id = data.get('tour_id')
        action = data.get('action')
        try:
            t = PublicTour.objects.get(id=tour_id)
            if action == 'toggle_publish':
                t.is_published = not t.is_published
            elif action == 'cancel':
                t.status = 'CANCELLED'
                t.is_published = False
            t.save()
            return JsonResponse({'success': True, 'tour': serialize_tour(t)})
        except PublicTour.DoesNotExist:
            return JsonResponse({'error': 'Tour not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_reviews(request):
    """Admin endpoint to view and moderate reviews."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        reviews = CrossReview.objects.all().select_related('cross', 'user').order_by('-created_at')
        rev_list = []
        for r in reviews[:50]:
            rev_list.append({
                'id': r.id,
                'ship_name': r.cross.name,
                'author': r.user.get_full_name() or r.user.username,
                'rating': r.rating,
                'comment': r.comment,
                'created_at': r.created_at.strftime('%Y-%m-%d')
            })
        return JsonResponse({'reviews': rev_list})

    elif request.method == 'DELETE':
        review_id = request.GET.get('id')
        try:
            r = CrossReview.objects.get(id=review_id)
            r.delete()
            return JsonResponse({'success': True, 'message': 'Review removed.'})
        except CrossReview.DoesNotExist:
            return JsonResponse({'error': 'Review not found.'}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


def api_admin_reports(request):
    """Admin endpoint for platform analytics reports."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    # Top popular ships
    popular_ships = []
    for s in Cross.objects.annotate(booking_num=Count('bookings')).order_by('-booking_num')[:5]:
        popular_ships.append({
            'name': s.name,
            'bookings_count': s.booking_num,
            'location': s.location
        })

    # Destination demand
    dest_counts = {}
    for b in Booking.objects.select_related('cross'):
        dest = b.cross.destination or b.cross.location or 'Arabian Sea'
        dest_counts[dest] = dest_counts.get(dest, 0) + 1

    popular_destinations = [{'destination': k, 'count': v} for k, v in sorted(dest_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    return JsonResponse({
        'popular_ships': popular_ships,
        'popular_destinations': popular_destinations,
        'total_revenue': float(Booking.objects.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or 0),
        'cancellation_rate': round((Booking.objects.filter(status='CANCELLED').count() / max(1, Booking.objects.count())) * 100, 1)
    })


# =====================================================================
# DATA SOURCES & OPERATORS CATALOGUE (Public & Admin)
# =====================================================================

def api_public_operators(request):
    """Public catalogue endpoint listing all verified operators and their fleets."""
    operators = Operator.objects.all().prefetch_related('vessels', 'public_tours', 'routes')
    data = []
    for op in operators:
        vessels = op.vessels.filter(is_active=True)
        data.append({
            'id': op.id,
            'name': op.name,
            'operator_type': getattr(op, 'operator_type', 'EXTERNAL_CATALOGUE'),
            'description': op.description,
            'location': op.location,
            'phone': op.phone,
            'whatsapp_number': getattr(op, 'whatsapp_number', '') or op.phone,
            'email': op.email,
            'website': op.website,
            'booking_url': op.booking_url,
            'office_address': op.office_address,
            'verified': op.verified,
            'source_checked': op.source_checked,
            'vessels_count': vessels.count(),
            'tours_count': op.public_tours.count(),
            'routes_count': op.routes.count(),
            'vessels': [
                {
                    'id': v.id,
                    'name': v.name,
                    'slug': v.slug,
                    'category': v.effective_category,
                    'listing_type': v.listing_type,
                    'price': float(v.price),
                    'price_unit': v.price_unit,
                    'is_quote_based': v.is_quote_based,
                    'duration_display': v.duration_display,
                    'formatted_price_basis': v.formatted_price_basis,
                    'capacity': v.capacity,
                    'display_capacity_text': v.display_capacity_text,
                    'image': v.display_image_url,
                    'image_url': v.display_image_url,
                } for v in vessels
            ]
        })
    return JsonResponse({'operators': data})


@csrf_exempt
def api_admin_operators(request):
    """Admin endpoint to list all data source operators and create new ones."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        operators = Operator.objects.all().prefetch_related('vessels', 'public_tours', 'routes')
        data = []
        for op in operators:
            vessels = op.vessels.all()
            data.append({
                'id': op.id,
                'name': op.name,
                'description': op.description,
                'location': op.location,
                'phone': op.phone,
                'email': op.email,
                'website': op.website,
                'booking_url': op.booking_url,
                'office_address': op.office_address,
                'verified': op.verified,
                'source_checked': op.source_checked,
                'vessels_count': vessels.count(),
                'tours_count': op.public_tours.count(),
                'routes_count': op.routes.count(),
                'vessels': [
                    {
                        'id': v.id,
                        'name': v.name,
                        'slug': v.slug,
                        'category': v.effective_category,
                        'listing_type': v.listing_type,
                        'price': float(v.price),
                        'price_unit': v.price_unit,
                        'is_quote_based': v.is_quote_based,
                        'duration_display': v.duration_display,
                        'formatted_price_basis': v.formatted_price_basis,
                        'capacity': v.capacity,
                        'display_capacity_text': v.display_capacity_text,
                        'tax_note': v.tax_note,
                        'permit_note': v.permit_note,
                        'source_url': v.source_url,
                        'source_checked': v.source_checked,
                        'last_verified_at': v.last_verified_at.strftime('%Y-%m-%d') if v.last_verified_at else None,
                        'is_active': v.is_active,
                        'availability_status': v.availability_status,
                    } for v in vessels
                ]
            })
        return JsonResponse({
            'total': len(data),
            'operators': data,
            'source_date': '01 Oct 2026',
        })

    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        name = body.get('name', '').strip()
        location = body.get('location', '').strip()
        if not name or not location:
            return JsonResponse({'error': 'Operator name and location are required.'}, status=400)

        op, created = Operator.objects.update_or_create(
            name=name,
            defaults={
                'description': body.get('description', '').strip(),
                'location': location,
                'phone': body.get('phone', '').strip(),
                'email': body.get('email', '').strip(),
                'website': body.get('website', '').strip(),
                'booking_url': body.get('booking_url', '').strip(),
                'office_address': body.get('office_address', '').strip(),
                'verified': bool(body.get('verified', True)),
                'source_checked': body.get('source_checked', '01 Oct 2026'),
            }
        )
        return JsonResponse({'success': True, 'created': created, 'operator_id': op.id})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_operator_detail(request, operator_id):
    """Admin endpoint to view or update operator info."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    try:
        op = Operator.objects.get(id=operator_id)
    except Operator.DoesNotExist:
        return JsonResponse({'error': 'Operator not found.'}, status=404)

    if request.method == 'GET':
        vessels = op.vessels.all()
        return JsonResponse({
            'operator': {
                'id': op.id,
                'name': op.name,
                'description': op.description,
                'location': op.location,
                'phone': op.phone,
                'email': op.email,
                'website': op.website,
                'booking_url': op.booking_url,
                'office_address': op.office_address,
                'verified': op.verified,
                'source_checked': op.source_checked,
                'vessels': [serialize_cruise(v) for v in vessels],
                'tours': [serialize_tour(t) for t in op.public_tours.all()],
            }
        })

    elif request.method in ['PUT', 'POST']:
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        if 'name' in body and body['name'].strip():
            op.name = body['name'].strip()
        if 'location' in body and body['location'].strip():
            op.location = body['location'].strip()
        if 'phone' in body:
            op.phone = body['phone'].strip()
        if 'email' in body:
            op.email = body['email'].strip()
        if 'website' in body:
            op.website = body['website'].strip()
        if 'booking_url' in body:
            op.booking_url = body['booking_url'].strip()
        if 'office_address' in body:
            op.office_address = body['office_address'].strip()
        if 'verified' in body:
            op.verified = bool(body['verified'])
        if 'source_checked' in body:
            op.source_checked = body['source_checked'].strip()
        op.save()
        return JsonResponse({'success': True, 'message': 'Operator updated successfully.'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_operator_vessel_update(request, operator_id, vessel_id):
    """Admin endpoint to update vessel pricing, source, price basis, or verification status."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    try:
        v = Cross.objects.get(id=vessel_id)
    except Cross.DoesNotExist:
        return JsonResponse({'error': 'Vessel not found.'}, status=404)

    if request.method in ['PUT', 'POST']:
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        if 'price' in body:
            try:
                v.price = Decimal(str(body['price']))
            except Exception:
                pass
        if 'price_unit' in body:
            v.price_unit = body['price_unit'].strip()
        if 'is_quote_based' in body:
            v.is_quote_based = bool(body['is_quote_based'])
        if 'duration_display' in body:
            v.duration_display = body['duration_display'].strip()
        if 'capacity' in body:
            try:
                v.capacity = int(body['capacity'])
            except Exception:
                pass
        if 'capacity_note' in body:
            v.capacity_note = body['capacity_note'].strip()
        if 'source_url' in body:
            v.source_url = body['source_url'].strip()
        if 'source_checked' in body:
            v.source_checked = body['source_checked'].strip()
        if 'last_verified_at' in body and body['last_verified_at']:
            try:
                v.last_verified_at = datetime.strptime(body['last_verified_at'], '%Y-%m-%d').date()
            except Exception:
                pass
        if 'is_active' in body:
            v.is_active = bool(body['is_active'])
        if 'is_approved' in body:
            v.is_approved = bool(body['is_approved'])
        if 'availability_status' in body:
            v.availability_status = body['availability_status'].strip()
        if 'tax_note' in body:
            v.tax_note = body['tax_note'].strip()
        if 'permit_note' in body:
            v.permit_note = body['permit_note'].strip()

        v.save()
        return JsonResponse({'success': True, 'vessel': serialize_cruise(v)})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_resync_seed(request):
    """Admin endpoint to re-synchronize research seed data safely without data loss."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    from django.core.management import call_command
    import io
    out = io.StringIO()
    try:
        call_command('seed_cruise_data', stdout=out)
        return JsonResponse({
            'success': True,
            'message': 'Research data synchronized successfully.',
            'report': out.getvalue()
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =====================================================================
# TICKET VERIFICATION & QR SCANNING (Prompt Requirement #12 & #13)
# =====================================================================

@csrf_exempt
def api_ticket_verify(request, code):
    """
    Public ticket verification endpoint:
    Accessed when a QR code or barcode is scanned: /ticket/verify/<secure-code>
    Checks authenticity, validity, departure schedule, and current boarding status.
    """
    code = (code or '').strip()
    if not code:
        return JsonResponse({'valid': False, 'status': 'INVALID', 'message': 'Missing ticket verification token.'}, status=400)

    try:
        booking = Booking.objects.select_related('cross', 'user', 'public_tour', 'cross__owner', 'cross__operator').get(
            Q(ticket_code__iexact=code) | Q(qr_code_hash__iexact=code) | Q(booking_id__iexact=code)
        )
    except Booking.DoesNotExist:
        try:
            booking = Booking.objects.select_related('cross', 'user', 'public_tour', 'cross__owner', 'cross__operator').get(
                Q(ticket_code__icontains=code) | Q(qr_code_hash__icontains=code) | Q(booking_id__icontains=code)
            )
        except (Booking.DoesNotExist, Booking.MultipleObjectsReturned):
            return JsonResponse({
                'valid': False,
                'status': 'INVALID',
                'status_display': 'INVALID TICKET',
                'message': 'No verified cruise reservation found for this boarding code.'
            }, status=404)

    today = date.today()
    ticket_status = getattr(booking, 'ticket_status', 'VALID')
    booking_status = booking.status

    if booking_status == 'CANCELLED' or ticket_status == 'CANCELLED':
        status = 'CANCELLED'
        status_display = 'INVALID TICKET - RESERVATION CANCELLED'
        valid = False
    elif ticket_status == 'USED':
        status = 'USED'
        status_display = 'BOARDING PASS ALREADY USED'
        valid = False
    elif booking.booking_date < today:
        status = 'EXPIRED'
        status_display = 'EXPIRED BOARDING PASS'
        valid = False
    elif booking_status in ['CONFIRMED', 'COMPLETED']:
        status = 'VALID'
        status_display = 'VALID BOARDING PASS'
        valid = True
    else:
        # PENDING
        status = 'PENDING'
        status_display = 'RESERVATION PENDING CONFIRMATION'
        valid = False

    can_mark_used = False
    if request.user.is_authenticated:
        if request.user.is_staff or getattr(request.user, 'role', '') == 'ADMIN' or (booking.cross.owner and booking.cross.owner == request.user):
            can_mark_used = (status == 'VALID')

    cabin_seat = booking.cabin_type or 'General Seating'
    if booking.public_tour and hasattr(booking, 'cabin_type') and booking.cabin_type:
        cabin_seat = booking.cabin_type

    op_name = booking.cross.effective_operator_name if booking.cross else 'Official Maritime Carrier'
    dep_port = (booking.public_tour.departure_port if booking.public_tour else None) or (booking.cross.departure_port if booking.cross else '')
    dest = (booking.public_tour.destination if booking.public_tour else None) or (booking.cross.destination if booking.cross else '')

    return JsonResponse({
        'valid': valid,
        'status': status,
        'status_display': status_display,
        'booking_id': booking.booking_id,
        'ticket_id': booking.ticket_code or f"TK-{booking.booking_id.replace('CRS-', '')}",
        'verification_code': booking.qr_code_hash or code,
        'passenger_name': booking.user.get_full_name() or booking.user.username,
        'passenger_email': booking.user.email if (request.user.is_authenticated and (request.user == booking.user or request.user.is_staff)) else '',
        'passenger_phone': mask_whatsapp_number(booking.user.phone) if (request.user.is_authenticated and (request.user == booking.user or request.user.is_staff)) else '',
        'passengers_count': booking.number_of_people,
        'adults_count': booking.adults_count,
        'children_count': booking.children_count,
        'ship_name': booking.cross.name,
        'operator_name': op_name,
        'route': f"{dep_port} → {dest}",
        'departure_port': dep_port,
        'destination': dest,
        'departure_date': booking.booking_date.strftime('%Y-%m-%d'),
        'departure_date_formatted': booking.booking_date.strftime('%A, %B %d, %Y'),
        'departure_time': booking.start_time.strftime('%H:%M'),
        'cabin_seat': cabin_seat,
        'booking_type': 'Private Charter' if booking.booking_type == 'EVENT' else 'Public Cruise Tour Ticket',
        'total_price': float(booking.total_price),
        'tracking_status': booking.tracking_status,
        'can_mark_used': can_mark_used,
    })


@csrf_exempt
def api_ticket_mark_used(request, code):
    """Allows authenticated Owner or Admin to mark ticket as USED."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required.'}, status=401)

    code = (code or '').strip()
    try:
        booking = Booking.objects.select_related('cross', 'cross__owner').get(
            Q(ticket_code__iexact=code) | Q(qr_code_hash__iexact=code) | Q(booking_id__iexact=code)
        )
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found.'}, status=404)

    is_owner = (booking.cross.owner == request.user) if booking.cross.owner else False
    is_admin = request.user.is_staff or getattr(request.user, 'role', '') == 'ADMIN'

    if not is_owner and not is_admin:
        return JsonResponse({'error': 'Only the vessel owner or platform admin can validate boarding passes.'}, status=403)

    booking.ticket_status = 'USED'
    booking.tracking_status = 'COMPLETED'
    booking.save(update_fields=['ticket_status', 'tracking_status', 'updated_at'])

    return JsonResponse({
        'success': True,
        'message': f"Boarding pass #{booking.ticket_code} marked as USED / Boarded successfully.",
        'ticket_status': 'USED',
        'tracking_status': 'COMPLETED'
    })


# ==============================================================================
# Cross-Hunt AI Assistant Endpoints (Dolphin AI 🐬)
# ==============================================================================
from .ai_service import generate_ai_chat_response, lookup_user_ticket


@csrf_exempt
def api_ai_chat(request):
    """
    Personal AI Cruise Assistant Chat endpoint.
    Accepts:
    - messages: list of past messages [{'role': 'user'|'assistant', 'content': '...'}]
    - current_path: frontend route current path
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required.'}, status=405)

    try:
        data = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    messages = data.get('messages', [])
    current_path = data.get('current_path', '/')

    response = generate_ai_chat_response(
        messages=messages,
        user=request.user if request.user.is_authenticated else None,
        current_path=current_path
    )

    return JsonResponse({
        'success': True,
        'reply': response.get('reply', ''),
        'actions': response.get('actions', []),
        'data': response.get('data', {})
    })


@csrf_exempt
def api_ai_ticket_lookup(request):
    """
    Secure backend ticket lookup for AI.
    - Requires ticket code or booking ID.
    - Verifies user authentication.
    - Verifies ownership (only user's own ticket is exposed).
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required.'}, status=405)

    try:
        data = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    code = data.get('code') or data.get('ticket_code') or data.get('booking_id')
    if not code:
        return JsonResponse({'error': 'Ticket or booking code is required.'}, status=400)

    result = lookup_user_ticket(code=code, user=request.user if request.user.is_authenticated else None)

    if not result.get('success'):
        status_code = 401 if result.get('requires_login') else (403 if result.get('error') == 'forbidden' else 404)
        return JsonResponse(result, status=status_code)

    return JsonResponse(result)


def api_ai_suggestions(request):
    """
    Returns dynamic suggested queries and quick action chips for the chat UI.
    """
    is_auth = request.user.is_authenticated
    suggestions = [
        {'id': 'my_ticket', 'label': '🎫 My Ticket', 'query': 'Mera ticket code check karo'},
        {'id': 'my_trips', 'label': '🚢 Upcoming Trips', 'query': 'Mera upcoming cruise kab hai?'},
        {'id': 'find_cruise', 'label': '🔎 Find Cruise', 'query': 'Mumbai se Goa public cruise dikhao'},
        {'id': 'private_yacht', 'label': '⚓ Private Charter', 'query': 'Goa me 20 guests ke liye private yacht chahiye'},
        {'id': 'cancel_policy', 'label': '❓ Cancel Policy', 'query': 'Booking cancellation aur refund policy kya hai?'},
        {'id': 'website_guide', 'label': '🗺️ Website Guide', 'query': 'Private ship kaha book karu?'},
    ]

    return JsonResponse({
        'success': True,
        'is_authenticated': is_auth,
        'suggestions': suggestions
    })


# =====================================================================
# WHATSAPP TOUR REMINDERS & AUTOMATION APIS
# =====================================================================

@csrf_exempt
def api_booking_whatsapp_opt(request, booking_id):
    """
    Allows a customer to toggle WhatsApp reminder opt-in / opt-out,
    or update their WhatsApp contact mobile for this booking.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.select_related('cross', 'user', 'public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    # Permission check: booking owner or staff/admin
    if booking.user != request.user and not request.user.is_staff and getattr(request.user, 'role', '') != 'ADMIN':
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    opt_in_val = data.get('opt_in')
    if opt_in_val is not None:
        if isinstance(opt_in_val, str):
            opt_in = opt_in_val.lower() not in ['false', '0', 'no', 'off']
        else:
            opt_in = bool(opt_in_val)
        booking.whatsapp_reminder_opt_in = opt_in
        if not booking.whatsapp_reminder_sent:
            booking.whatsapp_reminder_status = 'SCHEDULED' if opt_in else 'OPTED_OUT'

    new_number = data.get('whatsapp_number') or data.get('customer_whatsapp')
    if new_number is not None:
        new_number_str = str(new_number).strip()
        if new_number_str:
            norm = normalize_whatsapp_number(new_number_str)
            if not norm:
                return JsonResponse({
                    'error': 'Invalid WhatsApp mobile number format. Please provide a valid 10-digit mobile.'
                }, status=400)
            booking.customer_whatsapp = norm
        else:
            booking.customer_whatsapp = ''

    booking.save()
    status_msg = "WhatsApp embarkation reminders are now ACTIVE for this voyage." if booking.whatsapp_reminder_opt_in else "You have opted out of WhatsApp reminders for this voyage."
    return JsonResponse({
        'success': True,
        'message': status_msg,
        'booking': serialize_booking(booking)
    })


@csrf_exempt
def api_booking_whatsapp_test(request, booking_id):
    """
    Dispatches a test / immediate embarkation reminder for a specific booking.
    Can be invoked by the customer to preview their reminder, or by admin.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.select_related('cross', 'user', 'public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if booking.user != request.user and not request.user.is_staff and getattr(request.user, 'role', '') != 'ADMIN':
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    target_number = booking.customer_whatsapp or getattr(booking.user, 'whatsapp_number', '') or getattr(booking.user, 'phone', '')
    if not target_number:
        return JsonResponse({'error': 'No WhatsApp number registered for this booking.'}, status=400)

    reminder_text = build_tour_reminder_text(booking)
    res = send_whatsapp_api_message(
        to_number=target_number,
        message_text=reminder_text,
        booking=booking,
        message_type='TOUR_REMINDER_TEST'
    )

    return JsonResponse({
        'success': res.get('success', False),
        'message': f"WhatsApp message {res.get('status', 'SENT').lower()} to {res.get('recipient')} via {res.get('provider')}.",
        'result': res,
        'booking': serialize_booking(booking)
    })


@csrf_exempt
def api_admin_whatsapp_config(request):
    """
    Admin endpoint to view and configure the reminder dispatch window (default 24h).
    """
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method == 'GET':
        configured_hours = get_configured_reminder_hours()
        api_token = getattr(settings, 'WHATSAPP_API_TOKEN', '') or os.environ.get('WHATSAPP_API_TOKEN', '')
        phone_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '') or os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')
        is_live = bool(api_token and phone_id and len(api_token) > 10)
        provider = 'META_CLOUD' if is_live else 'META_CLOUD_SIMULATOR'

        total_scheduled = Booking.objects.filter(
            status__in=['CONFIRMED', 'PENDING'],
            whatsapp_reminder_sent=False,
            whatsapp_reminder_opt_in=True
        ).count()
        total_sent = Booking.objects.filter(whatsapp_reminder_sent=True).count()
        total_failed = Booking.objects.filter(whatsapp_reminder_status='FAILED').count()
        total_opted_out = Booking.objects.filter(whatsapp_reminder_opt_in=False).count()

        # Upcoming bookings in next window
        now = timezone.now()
        window_end = now + timedelta(hours=configured_hours)
        upcoming_candidates = Booking.objects.filter(
            status__in=['CONFIRMED', 'PENDING'],
            booking_date__gte=now.date()
        ).select_related('cross', 'user', 'public_tour').order_by('booking_date', 'start_time')[:30]

        upcoming_queue = []
        for b in upcoming_candidates:
            dep_time = b.start_time or time(10, 0)
            dep_dt = timezone.make_aware(datetime.combine(b.booking_date, dep_time)) if timezone.is_aware(now) else datetime.combine(b.booking_date, dep_time)
            in_window = (now <= dep_dt <= window_end)
            upcoming_queue.append({
                'booking_id': b.booking_id,
                'customer_name': b.user.get_full_name() or b.user.username,
                'customer_whatsapp': b.customer_whatsapp,
                'customer_whatsapp_masked': mask_whatsapp_number(b.customer_whatsapp) if b.customer_whatsapp else '',
                'vessel_or_tour': b.public_tour.tour_title if b.public_tour else b.cross.name,
                'departure_date': b.booking_date.strftime('%Y-%m-%d'),
                'departure_time': b.start_time.strftime('%H:%M') if b.start_time else '10:00',
                'opt_in': b.whatsapp_reminder_opt_in,
                'status': b.whatsapp_reminder_status,
                'sent': b.whatsapp_reminder_sent,
                'sent_at': b.whatsapp_reminder_sent_at.isoformat() if b.whatsapp_reminder_sent_at else None,
                'in_window': in_window,
            })

        recent_logs = WhatsAppMessageLog.objects.all().order_by('-created_at')[:40]
        logs_data = [{
            'id': l.id,
            'booking_id': l.booking.booking_id if l.booking else '',
            'recipient': l.recipient,
            'recipient_masked': mask_whatsapp_number(l.recipient),
            'customer_name': l.customer_name,
            'message_type': l.message_type,
            'message_body': l.message_body,
            'provider': l.provider,
            'provider_message_id': l.provider_message_id,
            'status': l.status,
            'error_message': l.error_message,
            'created_at': l.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        } for l in recent_logs]

        return JsonResponse({
            'config': {
                'configured_hours': configured_hours,
                'provider': provider,
                'is_live_configured': is_live,
                'total_scheduled': total_scheduled,
                'total_sent': total_sent,
                'total_failed': total_failed,
                'total_opted_out': total_opted_out,
            },
            'upcoming_queue': upcoming_queue,
            'recent_logs': logs_data
        })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        hours = data.get('hours')
        if hours is None or not str(hours).strip().isdigit():
            return JsonResponse({'error': 'Please provide a valid integer hours value.'}, status=400)

        saved_hours = set_configured_reminder_hours(int(hours))
        return JsonResponse({
            'success': True,
            'message': f"WhatsApp reminder window successfully updated to {saved_hours} hours prior to departure.",
            'configured_hours': saved_hours
        })

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def api_admin_whatsapp_dispatch(request):
    """
    Admin endpoint to trigger automated batch reminder dispatch on demand.
    Supports dry-run preview and custom hours override.
    """
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    hours = data.get('hours')
    dry_run = bool(data.get('dry_run', False))
    hours_int = int(hours) if (hours and str(hours).isdigit()) else None

    result = dispatch_tour_reminders_batch(hours_before=hours_int, dry_run=dry_run)
    return JsonResponse({
        'success': True,
        'summary': result,
        'message': f"Batch processed: {result['sent']} reminders sent, {result['failed']} failed within {result['hours_before']}h window."
    })


@csrf_exempt
def api_admin_whatsapp_logs(request):
    """Admin endpoint to fetch WhatsApp delivery audit logs."""
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    logs = WhatsAppMessageLog.objects.all().order_by('-created_at')[:100]
    return JsonResponse({
        'logs': [{
            'id': l.id,
            'booking_id': l.booking.booking_id if l.booking else '',
            'recipient': l.recipient,
            'recipient_masked': mask_whatsapp_number(l.recipient),
            'customer_name': l.customer_name,
            'message_type': l.message_type,
            'message_body': l.message_body,
            'provider': l.provider,
            'provider_message_id': l.provider_message_id,
            'status': l.status,
            'error_message': l.error_message,
            'created_at': l.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        } for l in logs]
    })




