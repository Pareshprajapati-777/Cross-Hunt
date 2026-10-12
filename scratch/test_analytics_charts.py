import os
import sys
sys.path.insert(0, '.')
import django
from decimal import Decimal
from datetime import date, datetime, timedelta
import json
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cross_booking.settings')
django.setup()

from crosses.models import Cross, Operator, PublicTour
from bookings.models import Booking
from accounts.models import User
from django.db.models import Sum, Count, Q

def get_admin_analytics_data(range_param='30d', custom_start=None, custom_end=None, granularity='auto'):
    today = timezone_today = date(2026, 10, 5)

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
        span_days = (end_date - start_date).days
        granularity = 'daily' if span_days <= 35 else ('weekly' if span_days <= 120 else 'monthly') if granularity == 'auto' else granularity
    else: # all
        min_date = Booking.objects.order_by('booking_date').values_list('booking_date', flat=True).first() or today
        start_date = min_date
        end_date = today + timedelta(days=365)
        granularity = 'monthly' if granularity == 'auto' else granularity

    all_bookings = Booking.objects.all().select_related('cross', 'user', 'public_tour')
    all_confirmed = all_bookings.filter(status__in=['CONFIRMED', 'COMPLETED'])
    
    # Global DB stats
    users_count = User.objects.filter(role__in=['USER', 'CUSTOMER']).count()
    owners_count = User.objects.filter(role__in=['OWNER', 'CROSS_OWNER']).count()
    ships_count = Cross.objects.count()
    
    # Global revenue & profit (Formula: Gross Revenue - Owner Payout - Refund/Discount = Platform Profit)
    gross_rev = all_confirmed.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    owner_payout = all_confirmed.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
    discount_amount = all_confirmed.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
    platform_profit = gross_rev - owner_payout - discount_amount
    
    # Period bookings
    period_bookings = all_bookings.filter(booking_date__gte=start_date, booking_date__lte=end_date)
    period_confirmed = period_bookings.filter(status__in=['CONFIRMED', 'COMPLETED'])
    
    p_gross_rev = period_confirmed.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
    p_owner_payout = period_confirmed.aggregate(Sum('owner_payout_amount'))['owner_payout_amount__sum'] or Decimal('0.00')
    p_discount = period_confirmed.aggregate(Sum('discount_amount'))['discount_amount__sum'] or Decimal('0.00')
    p_profit = p_gross_rev - p_owner_payout - p_discount
    
    # Top KPI Cards
    private_count = all_bookings.filter(booking_type='EVENT').count()
    public_tours_count = PublicTour.objects.count()
    public_tickets_count = all_bookings.filter(booking_type='TOUR', status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('number_of_people'))['number_of_people__sum'] or 0
    cancellations_count = all_bookings.filter(status='CANCELLED').count()
    cancellation_rate = round((cancellations_count / max(1, all_bookings.count())) * 100, 1)

    kpis = {
        'total_users': users_count,
        'total_owners': owners_count,
        'total_ships': ships_count,
        'private_bookings': private_count,
        'public_tours': public_tours_count,
        'public_tickets': public_tickets_count,
        'gross_revenue': float(gross_rev),
        'owner_payout': float(owner_payout),
        'discount_amount': float(discount_amount),
        'platform_profit': float(platform_profit),
        'cancellations': cancellations_count,
        'cancellation_rate': cancellation_rate,
        # Period specific
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
    else: # monthly
        # Loop through 12 months of current year or range
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
    for t in tours_all[:10]:
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

    analytics_response = {
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
    return analytics_response

res = get_admin_analytics_data('30d')
print("Successfully verified all 10 charts. Chart keys:", list(res['charts'].keys()))
