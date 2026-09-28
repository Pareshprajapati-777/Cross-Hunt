import json
from decimal import Decimal
from datetime import datetime, date, time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Avg, Sum, Count
from crosses.models import Cross, CrossReview
from bookings.models import Booking

User = get_user_model()


def get_user_dict(user):
    if not user.is_authenticated:
        return None
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone or '',
        'role': user.role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_approved_owner': user.is_approved_owner,
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
            return JsonResponse({'error': 'Account has been deactivated.'}, status=403)
        login(request, user)
        return JsonResponse({
            'success': True,
            'message': f'Welcome back, {user.first_name or user.username}!',
            'user': get_user_dict(user)
        })
    else:
        return JsonResponse({'error': 'Invalid password.'}, status=400)


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
    role = data.get('role', 'USER').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return JsonResponse({'error': 'Username, email, and password are required.'}, status=400)

    if len(password) < 6:
        return JsonResponse({'error': 'Password must be at least 6 characters.'}, status=400)

    if role not in ['USER', 'CROSS_OWNER']:
        return JsonResponse({'error': 'Invalid role specified.'}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({'error': 'Username is already taken.'}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({'error': 'An account with this email already exists.'}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        phone=phone
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


# =====================================================================
# CRUISE SHIPS & TOURS APIS
# =====================================================================

def serialize_cruise(cruise):
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
        'price': float(cruise.price),
        'price_per_day': float(cruise.price),
        'capacity': cruise.capacity,
        'duration_days': cruise.duration_days,
        'ship_length_meters': cruise.ship_length_meters,
        'decks_count': cruise.decks_count,
        'image': cruise.display_image_url,
        'image_url': cruise.display_image_url,
        'description': cruise.description,
        'facilities': cruise.get_facilities_list(),
        'rules': cruise.rules,
        'cancellation_policy': cruise.cancellation_policy,
        'average_rating': cruise.average_rating,
        'review_count': cruise.review_count,
        'operator_name': cruise.owner.get_full_name() or cruise.owner.username,
        'is_active': cruise.is_active,
        'is_available': cruise.is_active and cruise.is_approved,
    }


def api_cruise_list(request):
    queryset = Cross.objects.filter(is_active=True, is_approved=True)

    # Search query
    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(name__icontains=q) |
            Q(destination__icontains=q) |
            Q(route__icontains=q) |
            Q(location__icontains=q) |
            Q(description__icontains=q)
        )

    # Destination filter
    destination = request.GET.get('destination', '').strip()
    if destination:
        queryset = queryset.filter(destination__icontains=destination)

    # Category filter
    category = request.GET.get('category', '').strip()
    if category:
        queryset = queryset.filter(category=category)

    # Price range
    min_price = request.GET.get('min_price', '').strip()
    max_price = request.GET.get('max_price', '').strip()
    if min_price:
        try:
            queryset = queryset.filter(price__gte=float(min_price))
        except ValueError:
            pass
    if max_price:
        try:
            queryset = queryset.filter(price__lte=float(max_price))
        except ValueError:
            pass

    # Duration filter
    duration = request.GET.get('duration', '').strip()
    if duration:
        try:
            queryset = queryset.filter(duration_days=int(duration))
        except ValueError:
            pass

    # Sorting
    sort_by = request.GET.get('sort_by', 'popular')
    if sort_by == 'price_low':
        queryset = queryset.order_by('price')
    elif sort_by == 'price_high':
        queryset = queryset.order_by('-price')
    elif sort_by == 'rating':
        queryset = queryset.annotate(avg_r=Avg('reviews__rating')).order_by('-avg_r')
    else:
        queryset = queryset.order_by('-created_at')

    destinations = list(Cross.objects.filter(is_active=True).values_list('destination', flat=True).distinct())
    categories = list(Cross.objects.filter(is_active=True).values_list('category', flat=True).distinct())

    cruises_data = [serialize_cruise(c) for c in queryset]

    return JsonResponse({
        'total': len(cruises_data),
        'cruises': cruises_data,
        'destinations': [d for d in destinations if d],
        'categories': [c for c in categories if c],
    })


def api_cruise_detail(request, slug):
    try:
        cruise = Cross.objects.get(slug=slug)
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
            'name': 'Royal Panoramic Balcony',
            'multiplier': 1.3,
            'price_per_night': round(base_fare * 1.3, 2),
            'size': '38 sqm / 410 sqft',
            'features': ['Floor-to-Ceiling Sliding Glass', 'Private Ocean Balcony', 'Sitting Area & Minibar', 'Luxury Robes & Linens'],
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

    data['itinerary_timeline'] = itinerary_lines
    data['dining_venues_list'] = dining_venues
    data['entertainment_list'] = entertainment
    data['cabin_tiers'] = cabin_tiers
    data['reviews'] = reviews

    return JsonResponse(data)


# =====================================================================
# PRIVATE MARITIME EVENTS APIS
# =====================================================================

def api_event_packages(request):
    event_types = [
        {'id': 'wedding', 'name': 'Ocean Wedding Ceremony & Gala', 'icon': 'Heart', 'desc': 'Say "I do" at sea under golden hour skies with luxury floral decor, harpist, and five-course dinner.'},
        {'id': 'corporate', 'name': 'Corporate Leadership Summit', 'icon': 'Briefcase', 'desc': 'World-class conference at sea equipped with dual laser projection, satellite telepresence, and banquet lounge.'},
        {'id': 'birthday', 'name': 'Milestone Birthday & Private Party', 'icon': 'PartyPopper', 'desc': 'Unforgettable celebration with live DJ, signature cocktails, multi-tier birthday cake, and starlight deck access.'},
        {'id': 'anniversary', 'name': 'Luxury Anniversary Celebration', 'icon': 'Sparkles', 'desc': 'Romantic twilight charter with champagne reception, private acoustic quartet, and bespoke chef tasting menu.'},
        {'id': 'gala', 'name': 'Black-Tie Gala Dinner & Soiree', 'icon': 'Wine', 'desc': 'High-society maritime affair featuring red-carpet boarding, caviar bars, and aerial drone video coverage.'},
    ]

    packages = [
        {
            'id': 'diamond',
            'tier': 'Diamond Horizon (Ultra-Luxury)',
            'base_fee': 4500.0,
            'per_guest_fee': 140.0,
            'highlights': ['Exclusive Vessel Top-Deck Charter', 'Five-Course Michelin-Inspired Plated Dinner', 'Premium Open Bar with Champagne & Vintage Spirits', 'Full Stage Sound, Lighting & Aerial Drone Videography', 'Dedicated Master of Ceremonies & Butler Team'],
            'recommended_for': 'Luxury Weddings, Grand Galas, Executive Summits',
        },
        {
            'id': 'emerald',
            'tier': 'Emerald Wave (Executive Class)',
            'base_fee': 2800.0,
            'per_guest_fee': 95.0,
            'highlights': ['Private Panorama Salon & Observation Lounge', 'Four-Course Gourmet Coastal Buffet', 'Curated Wine & Craft Cocktail Bar', 'Audiovisual Rigs & Live Acoustic Duo', 'Custom Themed Tablescape & Ambient Uplighting'],
            'recommended_for': 'Milestone Birthdays, Corporate Dinners, Anniversaries',
        },
        {
            'id': 'sapphire',
            'tier': 'Sapphire Anchor (Signature)',
            'base_fee': 1500.0,
            'per_guest_fee': 65.0,
            'highlights': ['Private Sunset Terrace Access', 'Hors d’Oeuvres & Gourmet Charcuterie Stations', 'Three-Hour Welcome Bar & Signature Punch', 'Integrated Sound System for Speeches & Playlists', 'Professional Voyage Event Coordinator'],
            'recommended_for': 'Private Cocktail Receptions, Seminars, Family Gatherings',
        },
    ]

    # Available ships for chartering
    ships = Cross.objects.filter(is_active=True).values('id', 'name', 'slug', 'category', 'capacity', 'price', 'location')

    return JsonResponse({
        'event_types': event_types,
        'packages': packages,
        'charter_ships': list(ships),
    })


# =====================================================================
# BOOKINGS & RESERVATIONS APIS
# =====================================================================

def serialize_booking(b):
    return {
        'id': b.id,
        'booking_id': b.booking_id,
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
        'base_price': float(b.base_price),
        'total_price': float(b.total_price),
        'status': b.status,
        'special_request': b.special_request or '',
        'special_requests': b.special_request or '',
        'cancellation_reason': b.cancellation_reason or '',
        'is_cancellable': b.is_cancellable,
        'can_review': b.can_be_reviewed,
        'created_at': b.created_at.strftime('%B %d, %Y'),
    }


@csrf_exempt
def api_create_booking(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please sign in to complete your reservation.'}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    cruise_id = data.get('cruise_id')
    cruise_slug = data.get('cruise_slug', '').strip()
    booking_date_str = data.get('booking_date', '').strip()
    start_time_str = data.get('start_time', '10:00').strip()
    end_time_str = data.get('end_time', '18:00').strip()
    number_of_people = int(data.get('passengers_count') or data.get('number_of_people', 1))
    special_request = (data.get('special_requests') or data.get('special_request', '')).strip()
    raw_type = data.get('booking_type', 'TOUR').strip().upper()
    booking_type = 'EVENT' if 'EVENT' in raw_type else 'TOUR'
    cabin_type = data.get('cabin_type', 'Royal Balcony Stateroom').strip()
    event_type = data.get('event_type', '').strip()
    event_package = data.get('event_package', '').strip()

    try:
        if cruise_id:
            cruise = Cross.objects.get(id=cruise_id, is_active=True)
        else:
            cruise = Cross.objects.get(slug=cruise_slug, is_active=True)
    except Cross.DoesNotExist:
        return JsonResponse({'error': 'Selected cruise vessel is not available.'}, status=404)

    # Disallow owner booking own vessel
    if cruise.owner == request.user and not request.user.is_superuser:
        return JsonResponse({'error': 'Cruise operators cannot book their own fleet vessels.'}, status=400)

    # Date validation
    try:
        booking_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Invalid date format. Expected YYYY-MM-DD.'}, status=400)

    if booking_date < date.today():
        return JsonResponse({'error': 'Cannot reserve a departure date in the past.'}, status=400)

    # Time validation
    try:
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
    except ValueError:
        return JsonResponse({'error': 'Invalid time format. Expected HH:MM.'}, status=400)

    if start_time >= end_time:
        return JsonResponse({'error': 'End time must be after departure start time.'}, status=400)

    # Capacity check
    if number_of_people <= 0:
        return JsonResponse({'error': 'Number of passengers must be at least 1.'}, status=400)

    if number_of_people > cruise.capacity:
        return JsonResponse({'error': f'Passenger count ({number_of_people}) exceeds vessel capacity ({cruise.capacity}).'}, status=400)

    # Server-Side Duration & Price Calculation
    start_dt = datetime.combine(booking_date, start_time)
    end_dt = datetime.combine(booking_date, end_time)
    duration_hours = Decimal(str(round((end_dt - start_dt).total_seconds() / 3600.0, 2)))

    # Calculation logic
    if booking_type == 'EVENT':
        package_base = Decimal('2800.00')
        per_guest = Decimal('95.00')
        if 'Diamond' in event_package:
            package_base = Decimal('4500.00')
            per_guest = Decimal('140.00')
        elif 'Sapphire' in event_package:
            package_base = Decimal('1500.00')
            per_guest = Decimal('65.00')
        total_price = package_base + (per_guest * Decimal(number_of_people))
    else:
        multiplier = Decimal('1.0')
        if 'Suite' in cabin_type:
            multiplier = Decimal('1.8')
        elif 'Balcony' in cabin_type:
            multiplier = Decimal('1.3')
        elif 'Oceanview' in cabin_type:
            multiplier = Decimal('1.1')
        
        # Total = base price * duration (days equivalent or hourly block) * cabin multiplier * passengers
        days_factor = Decimal(str(max(1, cruise.duration_days)))
        total_price = (cruise.price * days_factor * multiplier) * Decimal(str(number_of_people))

    total_price = Decimal(str(round(float(total_price), 2)))

    # Anti-Double Booking Check inside Atomic Transaction
    with transaction.atomic():
        conflict = Booking.objects.select_for_update().filter(
            cross=cruise,
            booking_date=booking_date,
            status__in=['PENDING', 'CONFIRMED'],
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()

        if conflict:
            return JsonResponse({'error': 'This vessel or charter slot is already booked for the selected schedule. Please choose another date or time.'}, status=409)

        booking = Booking.objects.create(
            user=request.user,
            cross=cruise,
            booking_type=booking_type,
            cabin_type=cabin_type,
            event_type=event_type,
            event_package=event_package,
            booking_date=booking_date,
            start_time=start_time,
            end_time=end_time,
            duration_hours=duration_hours,
            base_price=cruise.price,
            total_price=total_price,
            number_of_people=number_of_people,
            special_request=special_request,
            status='PENDING'
        )

    return JsonResponse({
        'success': True,
        'message': f'Booking created successfully! Reference: {booking.booking_id}',
        'booking': serialize_booking(booking),
    })


def api_my_bookings(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    bookings = Booking.objects.filter(user=request.user).select_related('cross').order_by('-booking_date', '-start_time')
    return JsonResponse({
        'total': bookings.count(),
        'bookings': [serialize_booking(b) for b in bookings]
    })


def api_booking_detail(request, booking_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.select_related('cross', 'user', 'cross__owner').get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    # Permission check: booking owner, vessel owner, or staff
    if booking.user != request.user and booking.cross.owner != request.user and not request.user.is_staff:
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    return JsonResponse({'booking': serialize_booking(booking)})


@csrf_exempt
def api_cancel_booking(request, booking_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        booking = Booking.objects.get(booking_id=booking_id)
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

    booking.status = 'CANCELLED'
    booking.cancellation_reason = data.get('reason', 'Cancelled by guest.')
    booking.save()

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
# OPERATOR & ADMIN DASHBOARD APIS
# =====================================================================

def api_operator_dashboard(request):
    if not request.user.is_authenticated or (request.user.role != 'CROSS_OWNER' and not request.user.is_superuser):
        return JsonResponse({'error': 'Operator access required.'}, status=403)

    vessels = Cross.objects.filter(owner=request.user)
    bookings = Booking.objects.filter(cross__owner=request.user).select_related('cross', 'user').order_by('-created_at')

    earnings = bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or 0
    stats = {
        'total_ships': vessels.count(),
        'total_vessels': vessels.count(),
        'active_bookings': bookings.filter(status='PENDING').count() + bookings.filter(status='CONFIRMED').count(),
        'completed_trips': bookings.filter(status='COMPLETED').count(),
        'total_revenue': float(earnings),
    }

    return JsonResponse({
        'stats': stats,
        'total_vessels': vessels.count(),
        'active_vessels': vessels.filter(is_active=True).count(),
        'total_bookings': bookings.count(),
        'pending_bookings': bookings.filter(status='PENDING').count(),
        'confirmed_bookings': bookings.filter(status='CONFIRMED').count(),
        'completed_bookings': bookings.filter(status='COMPLETED').count(),
        'earnings': float(earnings),
        'my_ships': [serialize_cruise(v) for v in vessels],
        'vessels': [serialize_cruise(v) for v in vessels],
        'recent_bookings': [serialize_booking(b) for b in bookings[:15]],
    })


@csrf_exempt
def api_operator_action(request, booking_id, action):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated or (request.user.role != 'CROSS_OWNER' and not request.user.is_superuser):
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    try:
        booking = Booking.objects.get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found.'}, status=404)

    if booking.cross.owner != request.user and not request.user.is_superuser:
        return JsonResponse({'error': 'You can only manage your own vessels.'}, status=403)

    if action == 'confirm':
        booking.status = 'CONFIRMED'
    elif action in ['reject', 'cancel']:
        booking.status = 'CANCELLED'
    elif action == 'complete':
        booking.status = 'COMPLETED'
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    booking.save()
    return JsonResponse({'success': True, 'message': f'Booking #{booking_id} status updated to {booking.status}.', 'booking': serialize_booking(booking)})


def api_admin_dashboard(request):
    if not request.user.is_authenticated or (request.user.role != 'ADMIN' and not request.user.is_superuser and not request.user.is_staff):
        return JsonResponse({'error': 'Admin privileges required.'}, status=403)

    users_count = User.objects.filter(role='USER').count()
    operators_count = User.objects.filter(role='CROSS_OWNER').count()
    vessels_count = Cross.objects.count()
    active_vessels_count = Cross.objects.filter(is_active=True).count()
    
    all_bookings = Booking.objects.select_related('cross', 'user').order_by('-created_at')
    total_rev = all_bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or 0

    stats = {
        'total_users': users_count,
        'total_operators': operators_count,
        'total_ships': vessels_count,
        'total_bookings': all_bookings.count(),
        'total_revenue': float(total_rev),
    }

    return JsonResponse({
        'stats': stats,
        'total_users': users_count,
        'total_operators': operators_count,
        'total_vessels': vessels_count,
        'active_vessels': active_vessels_count,
        'total_bookings': all_bookings.count(),
        'pending_bookings': all_bookings.filter(status='PENDING').count(),
        'confirmed_bookings': all_bookings.filter(status='CONFIRMED').count(),
        'total_revenue': float(total_rev),
        'recent_bookings': [serialize_booking(b) for b in all_bookings[:20]],
    })
