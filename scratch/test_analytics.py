import os
import django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cross_booking.settings')
django.setup()

from crosses.models import Cross, Operator, PublicTour
from bookings.models import Booking
from accounts.models import User
from django.db.models import Sum, Count, Q

def test_kpi():
    users_count = User.objects.filter(role__in=['USER', 'CUSTOMER']).count()
    owners_count = User.objects.filter(role__in=['OWNER', 'CROSS_OWNER']).count()
    ships_count = Cross.objects.count()
    
    confirmed = Booking.objects.filter(status__in=['CONFIRMED', 'COMPLETED'])
    gross_rev = confirmed.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    owner_payout = confirmed.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
    discount = confirmed.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
    profit = gross_rev - owner_payout - discount
    
    private_bookings = Booking.objects.filter(booking_type='EVENT').count()
    public_tours = PublicTour.objects.count()
    public_tickets = Booking.objects.filter(booking_type='TOUR', status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('number_of_people'))['number_of_people__sum'] or 0
    cancelled = Booking.objects.filter(status='CANCELLED').count()
    
    print("Users:", users_count)
    print("Owners:", owners_count)
    print("Ships:", ships_count)
    print("Private Bookings:", private_bookings)
    print("Public Tours:", public_tours)
    print("Public Tickets:", public_tickets)
    print("Gross Revenue:", gross_rev)
    print("Owner Payout:", owner_payout)
    print("Discount:", discount)
    print("Platform Profit:", profit)
    print("Cancelled:", cancelled)
    
test_kpi()
