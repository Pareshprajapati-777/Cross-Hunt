import json
import uuid
from decimal import Decimal
from datetime import datetime, date, time, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Avg, Sum, Count
from crosses.models import Cross, CrossReview, ShipExtra, PublicTour, Offer
from bookings.models import Booking

User = get_user_model()


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


def serialize_cruise(cruise):
    extras = [serialize_extra(e) for e in cruise.extras.filter(is_available=True)]
    return {
        'id': cruise.id,
        'title': cruise.name,
        'name': cruise.name,
        'slug': cruise.slug,
        'category': cruise.category,
        'destination': cruise.destination,
        'route': cruise.route,
        'departure_port': cruise.departure_port,
        'location': cruise.location,
        'address': cruise.address,
        'price': float(cruise.price),
        'price_per_day': float(cruise.price),
        'capacity': cruise.capacity,
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
        'review_count': cruise.review_count,
        'operator_name': cruise.owner.get_full_name() or cruise.owner.username,
        'operator_id': cruise.owner.id,
        'is_active': cruise.is_active,
        'is_approved': cruise.is_approved,
        'is_available': cruise.is_active and cruise.is_approved,
        'extras': extras,
    }

# Backward compatible alias
serialize_ship = serialize_cruise


def serialize_tour(tour):
    ship_data = serialize_cruise(tour.ship)
    return {
        'id': tour.id,
        'tour_title': tour.tour_title,
        'title': tour.tour_title,
        'slug': tour.slug,
        'ship_id': tour.ship.id,
        'ship_name': tour.ship.name,
        'ship_slug': tour.ship.slug,
        'ship_image': tour.ship.display_image_url,
        'departure_port': tour.departure_port,
        'destination': tour.destination,
        'departure_date': tour.departure_date.strftime('%Y-%m-%d'),
        'departure_date_formatted': tour.departure_date.strftime('%A, %B %d, %Y'),
        'departure_time': tour.departure_time.strftime('%H:%M'),
        'return_date': tour.return_date.strftime('%Y-%m-%d'),
        'return_date_formatted': tour.return_date.strftime('%A, %B %d, %Y'),
        'return_time': tour.return_time.strftime('%H:%M'),
        'duration_days': tour.duration_days,
        'total_capacity': tour.total_capacity,
        'booked_capacity': tour.booked_capacity,
        'remaining_capacity': tour.remaining_capacity,
        'adult_price': float(tour.adult_price),
        'child_price': float(tour.child_price),
        'itinerary': tour.itinerary,
        'itinerary_highlights': [line.strip() for line in tour.itinerary.split('\n') if line.strip()],
        'ports_of_call': tour.ports_of_call,
        'meals_included': tour.meals_included,
        'status': tour.status,
        'is_published': tour.is_published,
        'is_bookable': tour.is_bookable,
        'ship': ship_data,
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
        'operator_name': b.cross.owner.get_full_name() or b.cross.owner.username,
        'public_tour_id': b.public_tour.id if b.public_tour else None,
        'public_tour_title': b.public_tour.tour_title if b.public_tour else None,
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
    queryset = Cross.objects.filter(is_active=True, is_approved=True)

    # General search query
    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(name__icontains=q) |
            Q(destination__icontains=q) |
            Q(route__icontains=q) |
            Q(location__icontains=q) |
            Q(description__icontains=q)
        )

    # Destination / Location
    destination = request.GET.get('destination', '').strip() or request.GET.get('location', '').strip()
    if destination:
        queryset = queryset.filter(Q(destination__icontains=destination) | Q(location__icontains=destination))

    # Category
    category = request.GET.get('category', '').strip()
    if category:
        queryset = queryset.filter(category=category)

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
    guests_str = request.GET.get('guests', '').strip() or request.GET.get('capacity', '').strip()
    if guests_str:
        try:
            req_guests = int(guests_str)
            queryset = queryset.filter(capacity__gte=req_guests)
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
    categories = list(Cross.objects.filter(is_active=True).values_list('category', flat=True).distinct())

    cruises_data = [serialize_cruise(c) for c in queryset]

    return JsonResponse({
        'total': len(cruises_data),
        'cruises': cruises_data,
        'destinations': [d for d in set(destinations + locations) if d],
        'categories': [c for c in categories if c],
    })


@csrf_exempt
def api_ship_match(request):
    """
    Requirement Matching Engine:
    Accepts customer requirements (purpose, guests, date, budget in INR ₹, location, duration)
    and queries actual database records.
    Returns exact matches first, followed by close alternatives.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST
    else:
        data = request.GET

    purpose = (data.get('purpose') or '').strip().lower()
    guests = int(data.get('guests') or data.get('number_of_people') or 50)
    budget = float(data.get('budget') or 0)
    req_date_str = (data.get('date') or data.get('booking_date') or '').strip()
    location = (data.get('location') or data.get('departure_port') or '').strip().lower()

    # Query all active ships
    all_ships = Cross.objects.filter(is_active=True, is_approved=True).prefetch_related('extras', 'reviews')

    exact_matches = []
    close_alternatives = []

    for ship in all_ships:
        is_exact = True
        match_reasons = []
        alt_reasons = []

        # 1. Purpose check
        if purpose and not ship.supports_purpose(purpose):
            is_exact = False
            alt_reasons.append(f"Supports private charter, but not specifically customized for {purpose}")
        else:
            match_reasons.append("Supports your event purpose")

        # 2. Capacity check
        if ship.capacity < guests:
            is_exact = False
            alt_reasons.append(f"Capacity {ship.capacity} is less than requested {guests}")
        else:
            match_reasons.append(f"Accommodates up to {ship.capacity} guests")

        # 3. Budget check (in INR)
        if budget > 0 and float(ship.price) > (budget * 1.15):
            is_exact = False
            alt_reasons.append(f"Base price (₹{ship.price:,.0f}) exceeds budget")
        elif budget > 0:
            match_reasons.append(f"Base price ₹{ship.price:,.0f} fits within budget")

        # 4. Location check
        if location:
            ship_loc = f"{ship.location} {ship.departure_port} {ship.destination}".lower()
            if location not in ship_loc:
                is_exact = False
                alt_reasons.append(f"Home port is {ship.location}")
            else:
                match_reasons.append(f"Departs from {ship.location}")

        # 5. Date availability check
        if req_date_str:
            try:
                check_date = datetime.strptime(req_date_str, '%Y-%m-%d').date()
                conflict = Booking.objects.filter(
                    cross=ship,
                    booking_date=check_date,
                    status__in=['PENDING', 'CONFIRMED']
                ).exists()
                if conflict:
                    is_exact = False
                    alt_reasons.append("Has another booking on selected date (alternate hours may be available)")
                else:
                    match_reasons.append("Date is currently free")
            except ValueError:
                pass

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
        'total_exact': len(exact_matches),
        'total_alternatives': len(close_alternatives),
        'exact_matches': exact_matches,
        'close_alternatives': close_alternatives,
        'results': exact_matches + close_alternatives,
    })


def api_cruise_detail(request, slug):
    try:
        cruise = Cross.objects.prefetch_related('extras', 'reviews__user', 'public_tours').get(slug=slug)
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
    queryset = PublicTour.objects.filter(is_published=True).select_related('ship')

    destination = request.GET.get('destination', '').strip()
    if destination:
        queryset = queryset.filter(Q(destination__icontains=destination) | Q(ports_of_call__icontains=destination))

    departure_port = request.GET.get('departure_port', '').strip()
    if departure_port:
        queryset = queryset.filter(departure_port__icontains=departure_port)

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

    tours_data = [serialize_tour(t) for t in queryset]
    return JsonResponse({
        'total': len(tours_data),
        'tours': tours_data
    })


def api_tour_detail(request, slug):
    """Returns complete details of a scheduled public cruise tour."""
    try:
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
    if cruise.owner == request.user and not request.user.is_superuser:
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

            if start_time >= end_time:
                return JsonResponse({'error': 'Disembarkation time must be after embarkation start time.'}, status=400)

            if total_people > cruise.capacity:
                return JsonResponse({
                    'error': f'Guest count ({total_people}) exceeds maximum vessel capacity ({cruise.capacity}).'
                }, status=400)

            # Check Overlapping Booking Conflict
            conflict = Booking.objects.select_for_update().filter(
                cross=cruise,
                booking_date=booking_date,
                status__in=['PENDING', 'CONFIRMED'],
                start_time__lt=end_time,
                end_time__gt=start_time
            ).exists()

            if conflict:
                return JsonResponse({
                    'error': 'This vessel is already booked for the selected schedule. Please select another date or time slot.'
                }, status=409)

            start_dt = datetime.combine(booking_date, start_time)
            end_dt = datetime.combine(booking_date, end_time)
            duration_hours = Decimal(str(round((end_dt - start_dt).total_seconds() / 3600.0, 2)))

            # Base private ship charter pricing
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
        if promo_code:
            try:
                offer = Offer.objects.get(code__iexact=promo_code, is_active=True)
                discount_amount = offer.calculate_discount(subtotal + extras_amount)
            except Offer.DoesNotExist:
                discount_amount = Decimal('0.00')

        # Calculate 18% GST / Maritime Tourism Tax
        taxable_base = max(Decimal('0.00'), subtotal + extras_amount - discount_amount)
        tax_amount = Decimal(str(round(float(taxable_base * Decimal('0.18')), 2)))

        final_total = taxable_base + tax_amount

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
            base_price=cruise.price if booking_type == 'EVENT' else (public_tour.adult_price if public_tour else cruise.price),
            subtotal=subtotal,
            extras_amount=extras_amount,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_price=final_total,
            promo_code=promo_code,
            special_request=special_request,
            status='CONFIRMED',
            tracking_status='CONFIRMED'
        )

    return JsonResponse({
        'success': True,
        'message': f'Reservation confirmed successfully! Reference: {booking.booking_id}',
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
        booking = Booking.objects.select_related('cross', 'user', 'cross__owner', 'public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if booking.user != request.user and booking.cross.owner != request.user and not request.user.is_staff:
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    return JsonResponse({'booking': serialize_booking(booking)})


def api_booking_invoice(request, booking_id):
    """Generates official INR (₹) tax invoice data with line items."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        b = Booking.objects.select_related('cross', 'user', 'cross__owner', 'public_tour').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if b.user != request.user and b.cross.owner != request.user and not request.user.is_staff:
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
        line_items.append({
            'description': f"Private Ship Charter - {b.cross.name} ({b.event_type or 'Event'})",
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

    invoice_data = {
        'invoice_number': b.invoice_number,
        'booking_id': b.booking_id,
        'issue_date': b.created_at.strftime('%d %B %Y'),
        'customer_name': b.user.get_full_name() or b.user.username,
        'customer_email': b.user.email,
        'customer_phone': b.user.phone or 'N/A',
        'operator_name': b.cross.owner.get_full_name() or b.cross.owner.username,
        'operator_company': f"{b.cross.owner.username} Maritime Operations",
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

    vessels = Cross.objects.filter(owner=request.user).prefetch_related('extras', 'public_tours')
    bookings = Booking.objects.filter(cross__owner=request.user).select_related('cross', 'user', 'public_tour').order_by('-created_at')

    earnings = bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    # Breakdown by booking type
    private_rev = bookings.filter(status__in=['CONFIRMED', 'COMPLETED'], booking_type='EVENT').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    tour_rev = bookings.filter(status__in=['CONFIRMED', 'COMPLETED'], booking_type='TOUR').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    stats = {
        'total_ships': vessels.count(),
        'total_vessels': vessels.count(),
        'active_ships': vessels.filter(is_active=True).count(),
        'active_bookings': bookings.filter(status__in=['PENDING', 'CONFIRMED']).count(),
        'pending_bookings': bookings.filter(status='PENDING').count(),
        'confirmed_bookings': bookings.filter(status='CONFIRMED').count(),
        'completed_trips': bookings.filter(status='COMPLETED').count(),
        'total_revenue': float(earnings),
        'private_revenue': float(private_rev),
        'tour_revenue': float(tour_rev),
    }

    tours = PublicTour.objects.filter(ship__owner=request.user).order_by('-departure_date')

    return JsonResponse({
        'stats': stats,
        'earnings': float(earnings),
        'my_ships': [serialize_cruise(v) for v in vessels],
        'vessels': [serialize_cruise(v) for v in vessels],
        'my_tours': [serialize_tour(t) for t in tours[:10]],
        'recent_bookings': [serialize_booking(b) for b in bookings[:20]],
    })


@csrf_exempt
def api_operator_ships(request):
    """List or create ships for the logged-in operator."""
    if not request.user.is_authenticated or (not getattr(request.user, 'is_owner', False) and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    if request.method == 'GET':
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

def api_admin_dashboard(request):
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    users_count = User.objects.filter(role='USER').count()
    operators_count = User.objects.filter(role__in=['OWNER', 'CROSS_OWNER']).count()
    vessels_count = Cross.objects.count()
    active_vessels_count = Cross.objects.filter(is_active=True).count()
    tours_count = PublicTour.objects.count()
    active_tours_count = PublicTour.objects.filter(is_published=True, departure_date__gte=date.today()).count()

    all_bookings = Booking.objects.select_related('cross', 'user', 'public_tour').order_by('-created_at')
    total_rev = all_bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    # Private vs Public distribution
    private_count = all_bookings.filter(booking_type='EVENT').count()
    tour_count = all_bookings.filter(booking_type='TOUR').count()

    stats = {
        'total_users': users_count,
        'total_operators': operators_count,
        'total_ships': vessels_count,
        'active_ships': active_vessels_count,
        'total_tours': tours_count,
        'active_tours': active_tours_count,
        'total_bookings': all_bookings.count(),
        'private_bookings': private_count,
        'tour_bookings': tour_count,
        'pending_bookings': all_bookings.filter(status='PENDING').count(),
        'confirmed_bookings': all_bookings.filter(status='CONFIRMED').count(),
        'total_revenue': float(total_rev),
    }

    return JsonResponse({
        'stats': stats,
        'total_users': users_count,
        'total_operators': operators_count,
        'total_ships': vessels_count,
        'total_revenue': float(total_rev),
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

    try:
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

    try:
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

    bookings = Booking.objects.filter(cross__owner=request.user, status__in=['CONFIRMED', 'COMPLETED']).select_related('cross')
    total_rev = bookings.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    private_rev = bookings.filter(booking_type='EVENT').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    tour_rev = bookings.filter(booking_type='TOUR').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

    # By ship
    by_ship = []
    for ship in Cross.objects.filter(owner=request.user):
        ship_rev = bookings.filter(cross=ship).aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
        by_ship.append({
            'ship_id': ship.id,
            'ship_name': ship.name,
            'revenue': float(ship_rev),
            'bookings_count': bookings.filter(cross=ship).count()
        })

    return JsonResponse({
        'total_revenue': float(total_rev),
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

        if q:
            queryset = queryset.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        if role:
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
        ships = Cross.objects.all().select_related('owner').order_by('-created_at')
        ships_list = []
        for s in ships:
            ships_list.append({
                'id': s.id,
                'name': s.name,
                'slug': s.slug,
                'owner_name': s.owner.get_full_name() or s.owner.username,
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
        b_type = request.GET.get('type')
        status = request.GET.get('status')
        queryset = Booking.objects.all().select_related('cross', 'user', 'public_tour', 'cross__owner').order_by('-created_at')

        if b_type:
            queryset = queryset.filter(booking_type=b_type)
        if status:
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

