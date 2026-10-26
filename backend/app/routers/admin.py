from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc, asc
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta, time
from decimal import Decimal
import json
import re

from backend.app.database.session import get_db
from backend.app.dependencies.auth import get_current_user, require_admin
from backend.app.models.user import User
from backend.app.models.operator import Operator
from backend.app.models.cross import Cross, Route, ShipExtra
from backend.app.models.tour import PublicTour
from backend.app.models.activity import Activity
import os
import urllib.parse
from backend.app.models.booking import Booking, PlatformNotification, WhatsAppMessageLog, SystemSetting
from backend.app.models.offer import Offer, CrossReview
from backend.app.services.serializers import serialize_cruise, serialize_tour, serialize_booking, serialize_offer, serialize_transaction
from backend.app.services.whatsapp_service import (
    get_configured_reminder_hours,
    set_configured_reminder_hours,
    mask_whatsapp_number,
    dispatch_tour_reminders_batch,
    get_whatsapp_credentials,
    build_tour_reminder_text,
    normalize_whatsapp_number
)
from backend.app.core.config import settings
from backend.app.core.cache import cache
from backend.app.services.trip_lifecycle_service import run_lifecycle_check_throttled

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_analytics_data(
    db: Session,
    range_param: str = '30d',
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    granularity: str = 'auto'
) -> Dict[str, Any]:
    run_lifecycle_check_throttled(db)
    today = date.today()

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
        first_b = db.query(Booking).order_by(asc(Booking.booking_date)).first()
        start_date = first_b.booking_date if (first_b and first_b.booking_date) else today
        end_date = today + timedelta(days=365)
        granularity = 'monthly' if granularity == 'auto' else granularity

    all_bookings = db.query(Booking).all()
    all_confirmed = [b for b in all_bookings if b.status in ['CONFIRMED', 'COMPLETED']]

    # Global DB stats (User count is strictly regular passengers/customers)
    users_count = db.query(User).filter(
        User.role.notin_(['ADMIN', 'OWNER', 'CROSS_OWNER', 'OPERATOR']),
        User.is_superuser == False
    ).count()
    owners_count = db.query(User).filter(User.role.in_(['OWNER', 'CROSS_OWNER', 'OPERATOR'])).count()
    ships_count = db.query(Cross).count()
    active_ships_count = db.query(Cross).filter(Cross.is_active == True).count()
    external_operators_count = db.query(Operator).count()
    tours_count = db.query(PublicTour).count()

    # Profit calculations
    gross_rev = sum((b.total_price or Decimal('0.00')) for b in all_confirmed)
    owner_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in all_confirmed)
    discount_amount = sum((b.discount_amount or Decimal('0.00')) for b in all_confirmed)
    platform_profit = gross_rev - owner_payout - discount_amount

    # Period filtered bookings
    period_bookings = [b for b in all_bookings if b.booking_date and start_date <= b.booking_date <= end_date]
    period_confirmed = [b for b in period_bookings if b.status in ['CONFIRMED', 'COMPLETED']]

    p_gross_rev = sum((b.total_price or Decimal('0.00')) for b in period_confirmed)
    p_owner_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in period_confirmed)
    p_discount = sum((b.discount_amount or Decimal('0.00')) for b in period_confirmed)
    p_profit = p_gross_rev - p_owner_payout - p_discount

    private_count = sum(1 for b in all_bookings if b.booking_type == 'EVENT')
    public_tickets_count = sum((b.number_of_people or 0) for b in all_confirmed if b.booking_type == 'TOUR')
    cancellations_count = sum(1 for b in all_bookings if b.status == 'CANCELLED')
    cancellation_rate = round((cancellations_count / max(1, len(all_bookings))) * 100, 1)

    kpis = {
        'total_users': users_count,
        'total_owners': owners_count,
        'total_ships': ships_count,
        'active_ships': active_ships_count,
        'external_operators': external_operators_count,
        'private_bookings': private_count,
        'public_tours': tours_count,
        'public_tickets': public_tickets_count,
        'gross_revenue': float(gross_rev),
        'owner_payout': float(owner_payout),
        'discount_amount': float(discount_amount),
        'platform_profit': float(platform_profit),
        'cancellations': cancellations_count,
        'cancellation_rate': cancellation_rate,
        'period_gross_revenue': float(p_gross_rev),
        'period_owner_payout': float(p_owner_payout),
        'period_discount': float(p_discount),
        'period_platform_profit': float(p_profit),
        'period_bookings_count': len(period_bookings),
        'period_private_count': sum(1 for b in period_bookings if b.booking_type == 'EVENT'),
        'period_tour_count': sum(1 for b in period_bookings if b.booking_type == 'TOUR'),
        'period_tickets': sum((b.number_of_people or 0) for b in period_confirmed if b.booking_type == 'TOUR'),
        'period_cancellations': sum(1 for b in period_bookings if b.status == 'CANCELLED'),
    }

    # 1. Revenue Trend
    revenue_trend = []
    if granularity == 'daily':
        days_count = max(1, (end_date - start_date).days + 1)
        for i in range(days_count):
            day = start_date + timedelta(days=i)
            day_bookings = [b for b in period_confirmed if b.booking_date == day]
            day_rev = sum((b.total_price or Decimal('0.00')) for b in day_bookings)
            day_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in day_bookings)
            day_disc = sum((b.discount_amount or Decimal('0.00')) for b in day_bookings)
            day_profit = day_rev - day_payout - day_disc
            revenue_trend.append({
                'date': day.strftime('%Y-%m-%d'),
                'label': day.strftime('%d %b'),
                'gross_revenue': float(day_rev),
                'owner_payout': float(day_payout),
                'discount_amount': float(day_disc),
                'platform_profit': float(day_profit),
                'bookings_count': len(day_bookings),
            })
    elif granularity == 'weekly':
        curr = start_date
        while curr <= end_date:
            w_end = min(end_date, curr + timedelta(days=6))
            w_bookings = [b for b in period_confirmed if curr <= b.booking_date <= w_end]
            w_rev = sum((b.total_price or Decimal('0.00')) for b in w_bookings)
            w_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in w_bookings)
            w_disc = sum((b.discount_amount or Decimal('0.00')) for b in w_bookings)
            w_profit = w_rev - w_payout - w_disc
            revenue_trend.append({
                'date': curr.strftime('%Y-%m-%d'),
                'label': f"{curr.strftime('%d %b')} - {w_end.strftime('%d %b')}",
                'gross_revenue': float(w_rev),
                'owner_payout': float(w_payout),
                'discount_amount': float(w_disc),
                'platform_profit': float(w_profit),
                'bookings_count': len(w_bookings),
            })
            curr = w_end + timedelta(days=1)
    else:  # monthly
        for m in range(1, 13):
            m_bookings = [b for b in all_confirmed if b.booking_date and b.booking_date.year == today.year and b.booking_date.month == m]
            m_rev = sum((b.total_price or Decimal('0.00')) for b in m_bookings)
            m_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in m_bookings)
            m_disc = sum((b.discount_amount or Decimal('0.00')) for b in m_bookings)
            m_profit = m_rev - m_payout - m_disc
            revenue_trend.append({
                'date': f"{today.year}-{m:02d}-01",
                'label': date(today.year, m, 1).strftime('%b %Y'),
                'gross_revenue': float(m_rev),
                'owner_payout': float(m_payout),
                'discount_amount': float(m_disc),
                'platform_profit': float(m_profit),
                'bookings_count': len(m_bookings),
            })

    # 2. Platform Profit Trend
    platform_profit_trend = []
    for m in range(1, 13):
        m_bookings = [b for b in all_confirmed if b.booking_date and b.booking_date.year == today.year and b.booking_date.month == m]
        m_rev = sum((b.total_price or Decimal('0.00')) for b in m_bookings)
        m_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in m_bookings)
        m_disc = sum((b.discount_amount or Decimal('0.00')) for b in m_bookings)
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
            'bookings_count': len(m_bookings)
        })

    # 3. Bookings (Private vs Public)
    priv_period = [b for b in period_confirmed if b.booking_type == 'EVENT']
    tour_period = [b for b in period_confirmed if b.booking_type == 'TOUR']
    priv_rev = sum((b.total_price or Decimal('0.00')) for b in priv_period)
    tour_rev = sum((b.total_price or Decimal('0.00')) for b in tour_period)
    priv_tickets = sum((b.number_of_people or 0) for b in priv_period)
    tour_tickets = sum((b.number_of_people or 0) for b in tour_period)
    total_period_count = max(1, len(priv_period) + len(tour_period))

    bookings_private_vs_public = {
        'private': {
            'count': len(priv_period),
            'revenue': float(priv_rev),
            'tickets': priv_tickets,
            'percentage': round((len(priv_period) / total_period_count) * 100, 1),
            'revenue_percentage': round((float(priv_rev) / max(1.0, float(priv_rev + tour_rev))) * 100, 1)
        },
        'public': {
            'count': len(tour_period),
            'revenue': float(tour_rev),
            'tickets': tour_tickets,
            'percentage': round((len(tour_period) / total_period_count) * 100, 1),
            'revenue_percentage': round((float(tour_rev) / max(1.0, float(priv_rev + tour_rev))) * 100, 1)
        }
    }

    # 4. Ship Performance
    ships_map = {s.id: s for s in db.query(Cross).all()}
    ship_aggs = {}
    for b in period_confirmed:
        if b.cross_id not in ship_aggs:
            ship_aggs[b.cross_id] = {'count': 0, 'revenue': Decimal('0.00'), 'payout': Decimal('0.00'), 'discount': Decimal('0.00')}
        ship_aggs[b.cross_id]['count'] += 1
        ship_aggs[b.cross_id]['revenue'] += (b.total_price or Decimal('0.00'))
        ship_aggs[b.cross_id]['payout'] += (b.owner_payout_amount or Decimal('0.00'))
        ship_aggs[b.cross_id]['discount'] += (b.discount_amount or Decimal('0.00'))

    sorted_ships = sorted(ship_aggs.items(), key=lambda x: (x[1]['revenue'], x[1]['count']), reverse=True)[:10]
    ship_performance = []
    for s_id, data in sorted_ships:
        s_obj = ships_map.get(s_id)
        if s_obj:
            prof = data['revenue'] - data['payout'] - data['discount']
            ship_performance.append({
                'ship_id': s_id,
                'ship_name': s_obj.name,
                'location': s_obj.location,
                'category': s_obj.effective_category,
                'bookings_count': data['count'],
                'revenue': float(data['revenue']),
                'owner_payout': float(data['payout']),
                'platform_profit': float(prof),
                'image_url': s_obj.display_image_url,
            })

    # 5. Destination Analysis
    dest_aggs = {}
    for b in period_confirmed:
        d_name = (b.cross.destination if b.cross else 'Arabian Sea') or 'Arabian Sea'
        if d_name not in dest_aggs:
            dest_aggs[d_name] = {'count': 0, 'revenue': Decimal('0.00')}
        dest_aggs[d_name]['count'] += 1
        dest_aggs[d_name]['revenue'] += (b.total_price or Decimal('0.00'))

    sorted_dest = sorted(dest_aggs.items(), key=lambda x: (x[1]['count'], x[1]['revenue']), reverse=True)[:10]
    tot_dest_rev = sum((x[1]['revenue'] for x in sorted_dest)) or Decimal('1.00')
    destination_analysis = []
    for d_name, data in sorted_dest:
        destination_analysis.append({
            'destination': d_name,
            'bookings_count': data['count'],
            'revenue': float(data['revenue']),
            'share_percentage': round((float(data['revenue']) / float(tot_dest_rev)) * 100, 1)
        })

    # 6. Public Tour Occupancy
    tours_all = db.query(PublicTour).all()
    total_tour_cap = sum((t.total_capacity or 0) for t in tours_all)
    booked_tour_cap = sum((t.booked_capacity or 0) for t in tours_all)
    avg_occupancy = round((booked_tour_cap / max(1, total_tour_cap)) * 100, 1)

    tours_occupancy_list = []
    for t in tours_all[:12]:
        t_bookings = [b for b in all_confirmed if b.public_tour_id == t.id]
        t_rev = sum((b.total_price or Decimal('0.00')) for b in t_bookings)
        occ_pct = round((t.booked_capacity / max(1, t.total_capacity)) * 100, 1)
        tours_occupancy_list.append({
            'tour_id': t.id,
            'tour_title': t.tour_title,
            'ship_name': t.ship.name if t.ship else '',
            'departure_date': t.departure_date.strftime('%Y-%m-%d') if t.departure_date else '',
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
    tot_status_bookings = max(1, len(period_bookings))
    for st in status_order:
        st_items = [b for b in period_bookings if b.status == st]
        st_rev = sum((b.total_price or Decimal('0.00')) for b in st_items)
        status_breakdown.append({
            'status': st,
            'label': status_labels.get(st, st),
            'count': len(st_items),
            'revenue': float(st_rev),
            'share_percentage': round((len(st_items) / tot_status_bookings) * 100, 1),
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

    # 10. Monthly Growth
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


@router.get("/analytics/")
@router.get("/analytics")
def get_admin_analytics(
    range: str = '30d',
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    granularity: str = 'auto',
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    c_start = None
    c_end = None
    if start_date:
        try:
            c_start = datetime.strptime(start_date.strip(), '%Y-%m-%d').date()
        except ValueError:
            pass
    if end_date:
        try:
            c_end = datetime.strptime(end_date.strip(), '%Y-%m-%d').date()
        except ValueError:
            pass

    return get_admin_analytics_data(
        db=db,
        range_param=range.strip().lower(),
        custom_start=c_start,
        custom_end=c_end,
        granularity=granularity.strip().lower()
    )


@router.get("/dashboard/")
@router.get("/dashboard")
def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    analytics_pack = get_admin_analytics_data(db, '30d')
    kpis = analytics_pack['kpis']
    charts = analytics_pack['charts']
    all_bookings = db.query(Booking).order_by(desc(Booking.created_at), desc(Booking.id)).all()

    stats = {
        'total_users': kpis['total_users'],
        'total_owners': kpis['total_owners'],
        'total_operators': kpis['total_owners'],
        'total_ships': kpis['total_ships'],
        'active_ships': kpis['active_ships'],
        'external_operators': kpis['external_operators'],
        'external_operators_count': kpis['external_operators'],
        'total_tours': kpis['public_tours'],
        'active_tours': db.query(PublicTour).filter(PublicTour.is_published == True, PublicTour.departure_date >= date.today()).count(),
        'total_activities': db.query(Activity).count(),
        'active_activities': db.query(Activity).filter(Activity.is_active == True).count(),
        'total_bookings': len(all_bookings),
        'private_bookings': kpis['private_bookings'],
        'tour_bookings': sum(1 for b in all_bookings if b.booking_type == 'TOUR'),
        'activity_bookings': sum(1 for b in all_bookings if b.booking_type == 'ACTIVITY'),
        'tickets_count': kpis['public_tickets'],
        'total_tickets': kpis['public_tickets'],
        'pending_requests': sum(1 for b in all_bookings if b.status == 'PENDING'),
        'pending_bookings': sum(1 for b in all_bookings if b.status == 'PENDING'),
        'confirmed_bookings': sum(1 for b in all_bookings if b.status == 'CONFIRMED'),
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

    return {
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
    }


@router.get("/offers/")
@router.get("/offers")
def list_admin_offers(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    offers = db.query(Offer).order_by(desc(Offer.created_at), desc(Offer.id)).all()
    return {'offers': [serialize_offer(o) for o in offers]}


@router.post("/offers/")
@router.post("/offers")
async def create_admin_offer(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    code = data.get('code', '').strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required.")

    valid_from = datetime.strptime(data.get('valid_from'), '%Y-%m-%d').date()
    valid_to = datetime.strptime(data.get('valid_to'), '%Y-%m-%d').date()

    offer = Offer(
        code=code,
        title=data.get('title', f"Promo {code}"),
        description=data.get('description', ''),
        discount_type=data.get('discount_type', 'PERCENTAGE'),
        discount_value=Decimal(str(data.get('discount_value', 10))),
        min_booking_amount=Decimal(str(data.get('min_booking_amount', 0))),
        max_discount_amount=Decimal(str(data.get('max_discount_amount'))) if data.get('max_discount_amount') else None,
        valid_from=valid_from,
        valid_to=valid_to,
        is_active=bool(data.get('is_active', True))
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    cache.invalidate("offers")

    # Automatically broadcast an OFFER platform notification to ALL_USERS so it immediately appears in the notification bell
    if offer.is_active:
        discount_str = f"{float(offer.discount_value)}% OFF" if offer.discount_type == 'PERCENTAGE' else f"₹{float(offer.discount_value):,.0f} OFF"
        min_spend_str = f" on bookings of ₹{float(offer.min_booking_amount):,.0f}+" if offer.min_booking_amount and offer.min_booking_amount > 0 else ""

        custom_desc = offer.description.strip() if offer.description else ""
        if custom_desc:
            if offer.code not in custom_desc.upper():
                notif_msg = f"Use coupon code {offer.code} to claim {discount_str} instant discount{min_spend_str}! {custom_desc}"
            else:
                notif_msg = custom_desc
        else:
            notif_msg = f"Use promo coupon code {offer.code} at checkout to claim {discount_str} instant discount on luxury yacht private charters and public tours{min_spend_str}."

        notif = PlatformNotification(
            title=offer.title[:200],
            message=notif_msg,
            notification_type="OFFER",
            target_audience="ALL_USERS",
            target_user_id=None,
            action_link="/explore",
            sender_name="Marketing Director",
            is_read=False,
            recipients_count=max(1, db.query(User).count()),
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()

    return {'success': True, 'offer': serialize_offer(offer)}


@router.post("/offers/{offer_id}/toggle-active/")
@router.post("/offers/{offer_id}/toggle-active")
@router.put("/offers/{offer_id}/toggle-active/")
@router.put("/offers/{offer_id}/toggle-active")
def toggle_admin_offer_active(
    offer_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    offer.is_active = not bool(offer.is_active)
    db.commit()
    db.refresh(offer)
    cache.invalidate("offers")

    if offer.is_active:
        # Check if notification exists; if not, create it
        existing_n = db.query(PlatformNotification).filter(
            PlatformNotification.notification_type == 'OFFER',
            PlatformNotification.message.ilike(f"%{offer.code}%")
        ).first()
        if not existing_n:
            discount_str = f"{float(offer.discount_value)}% OFF" if offer.discount_type == 'PERCENTAGE' else f"₹{float(offer.discount_value):,.0f} OFF"
            min_spend_str = f" on bookings of ₹{float(offer.min_booking_amount):,.0f}+" if offer.min_booking_amount and offer.min_booking_amount > 0 else ""
            notif = PlatformNotification(
                title=offer.title[:200],
                message=f"Use promo coupon code {offer.code} to claim {discount_str} discount{min_spend_str}! {offer.description or ''}".strip(),
                notification_type="OFFER",
                target_audience="ALL_USERS",
                target_user_id=None,
                action_link="/explore",
                sender_name="Marketing Director",
                is_read=False,
                recipients_count=max(1, db.query(User).count()),
                created_at=datetime.utcnow()
            )
            db.add(notif)
            db.commit()
    else:
        # Deactivated: remove notification so users don't see inactive coupon
        db.query(PlatformNotification).filter(
            PlatformNotification.notification_type == 'OFFER',
            PlatformNotification.message.ilike(f"%{offer.code}%")
        ).delete(synchronize_session=False)
        db.commit()

    return {
        "success": True,
        "offer": serialize_offer(offer),
        "message": f"Promo code '{offer.code}' is now {'activated' if offer.is_active else 'deactivated'}."
    }


@router.delete("/offers/{offer_id}/")
@router.delete("/offers/{offer_id}")
def delete_admin_offer(
    offer_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    code = offer.code
    db.delete(offer)
    db.commit()
    cache.invalidate("offers")

    # Clean up corresponding notification
    db.query(PlatformNotification).filter(
        PlatformNotification.notification_type == 'OFFER',
        PlatformNotification.message.ilike(f"%{code}%")
    ).delete(synchronize_session=False)
    db.commit()

    return {
        "success": True,
        "message": f"Promo voucher '{code}' deleted successfully."
    }


@router.get("/users/")
@router.get("/users")
def list_admin_users(
    q: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    verified: Optional[str] = None,
    page: int = 1,
    page_size: int = 500,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # User Management is strictly for Passengers & Customers (Excludes ADMIN and OWNER)
    query = db.query(User).filter(
        User.role.notin_(['ADMIN', 'OWNER', 'CROSS_OWNER', 'OPERATOR']),
        User.is_superuser == False
    ).order_by(desc(User.date_joined), desc(User.id))

    if q:
        query = query.filter(
            or_(
                User.username.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
                User.first_name.ilike(f"%{q}%"),
                User.last_name.ilike(f"%{q}%"),
                User.phone.ilike(f"%{q}%")
            )
        )
    if role:
        query = query.filter(User.role.ilike(role))
    if status:
        if status.upper() == 'ACTIVE':
            query = query.filter(User.is_active == True)
        elif status.upper() in ['BLOCKED', 'SUSPENDED', 'INACTIVE']:
            query = query.filter(User.is_active == False)
    if verified:
        if verified.upper() == 'VERIFIED':
            query = query.filter(User.is_verified == True)
        elif verified.upper() == 'UNVERIFIED':
            query = query.filter(User.is_verified == False)

    total_records = query.count()
    if page_size <= 0:
        users_page = query.all()
    else:
        offset = (page - 1) * page_size
        users_page = query.offset(offset).limit(page_size).all()

    page_user_ids = [u.id for u in users_page]
    booking_stats = {}
    if page_user_ids:
        b_records = db.query(Booking).filter(Booking.user_id.in_(page_user_ids)).all()
        for b in b_records:
            if b.user_id not in booking_stats:
                booking_stats[b.user_id] = {'count': 0, 'spent': 0.0}
            booking_stats[b.user_id]['count'] += 1
            if b.status in ['CONFIRMED', 'COMPLETED']:
                booking_stats[b.user_id]['spent'] += float(b.total_price or 0)

    users_list = []
    for u in users_page:
        b_info = booking_stats.get(u.id, {'count': 0, 'spent': 0.0})
        users_list.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'full_name': u.full_name or u.username,
            'phone': u.phone or '',
            'whatsapp_number': u.whatsapp_number or '',
            'role': u.role,
            'is_active': u.is_active,
            'is_verified': bool(u.is_verified),
            'block_reason': u.block_reason or '',
            'date_joined': u.date_joined.strftime('%Y-%m-%d') if u.date_joined else '',
            'date_joined_iso': u.date_joined.isoformat() if u.date_joined else '',
            'bookings_count': b_info['count'],
            'total_spent': b_info['spent'],
            'is_superuser': u.is_superuser
        })

    passenger_base = db.query(User).filter(
        User.role.notin_(['ADMIN', 'OWNER', 'CROSS_OWNER', 'OPERATOR']),
        User.is_superuser == False
    )
    total_users_count = passenger_base.count()
    verified_users_count = passenger_base.filter(User.is_verified == True).count()
    active_users_count = passenger_base.filter(User.is_active == True).count()
    blocked_users_count = passenger_base.filter(User.is_active == False).count()
    total_customers = passenger_base.filter(User.role.in_(['USER', 'CUSTOMER'])).count()
    total_owners = db.query(User).filter(User.role.in_(['OWNER', 'CROSS_OWNER'])).count()

    total_pages = (total_records + page_size - 1) // page_size
    pagination = {
        'page': page,
        'page_size': page_size,
        'total_records': total_records,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }

    return {
        'users': users_list,
        'stats': {
            'total_users': total_users_count,
            'verified_users': verified_users_count,
            'active_users': active_users_count,
            'blocked_users': blocked_users_count,
            'total_customers': total_customers,
            'total_owners': total_owners
        },
        'pagination': pagination
    }


@router.post("/users/")
@router.post("/users")
async def admin_user_action(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    user_id = data.get('user_id')
    action = data.get('action', 'toggle_active')

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if action in ['toggle_active', 'block', 'unblock']:
        if target_user.is_superuser:
            raise HTTPException(status_code=400, detail="Cannot block or suspend a superuser.")
        if action == 'block':
            target_user.is_active = False
            target_user.block_reason = data.get('reason', 'Suspended by platform administrator')
        elif action == 'unblock':
            target_user.is_active = True
            target_user.block_reason = ''
        else:
            target_user.is_active = not target_user.is_active
            if not target_user.is_active:
                target_user.block_reason = data.get('reason', 'Deactivated by admin')
            else:
                target_user.block_reason = ''
        db.commit()
        return {
            'success': True,
            'is_active': target_user.is_active,
            'block_reason': target_user.block_reason,
            'message': f"User @{target_user.username} {'unblocked/activated' if target_user.is_active else 'blocked/suspended'}."
        }

    elif action in ['verify', 'unverify', 'toggle_verify']:
        if action == 'verify':
            target_user.is_verified = True
        elif action == 'unverify':
            target_user.is_verified = False
        else:
            target_user.is_verified = not target_user.is_verified
        db.commit()
        return {
            'success': True,
            'is_verified': target_user.is_verified,
            'message': f"User @{target_user.username} verification status updated to {'Verified' if target_user.is_verified else 'Unverified'}."
        }

    elif action == 'update_user':
        full_name = data.get('full_name', '').strip()
        if full_name:
            parts = full_name.split(' ', 1)
            target_user.first_name = parts[0]
            target_user.last_name = parts[1] if len(parts) > 1 else ''
        if 'email' in data and data['email'].strip():
            target_user.email = data['email'].strip()
        if 'phone' in data:
            target_user.phone = data['phone'].strip()
        if 'whatsapp_number' in data:
            target_user.whatsapp_number = data['whatsapp_number'].strip()
        if 'role' in data and data['role'] in ['USER', 'OWNER', 'ADMIN']:
            target_user.role = data['role']
        db.commit()
        return {
            'success': True,
            'message': f'User @{target_user.username} profile updated successfully.',
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'email': target_user.email,
                'full_name': target_user.full_name or target_user.username,
                'phone': target_user.phone or '',
                'whatsapp_number': target_user.whatsapp_number or '',
                'role': target_user.role,
                'is_active': target_user.is_active,
                'is_verified': bool(target_user.is_verified),
            }
        }

    elif action == 'user_details':
        user_bookings = db.query(Booking).filter(Booking.user_id == target_user.id).order_by(desc(Booking.created_at), desc(Booking.id)).all()
        spent = sum(float(b.total_price or 0) for b in user_bookings if b.status in ['CONFIRMED', 'COMPLETED'])
        return {
            'success': True,
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'email': target_user.email,
                'full_name': target_user.full_name or target_user.username,
                'phone': target_user.phone or '',
                'whatsapp_number': target_user.whatsapp_number or '',
                'role': target_user.role,
                'is_active': target_user.is_active,
                'is_verified': bool(target_user.is_verified),
                'block_reason': target_user.block_reason or '',
                'date_joined': target_user.date_joined.strftime('%Y-%m-%d %H:%M') if target_user.date_joined else '',
                'bookings_count': len(user_bookings),
                'total_spent': spent,
                'bookings': [serialize_booking(b) for b in user_bookings[:20]]
            }
        }

    raise HTTPException(status_code=400, detail="Invalid action requested.")


@router.get("/owners/")
@router.get("/owners")
def list_admin_owners(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    owners = db.query(User).filter(User.role.in_(['OWNER', 'CROSS_OWNER'])).order_by(desc(User.date_joined), desc(User.id)).all()
    owners_list = []
    for o in owners:
        ships = db.query(Cross).filter(Cross.owner_id == o.id).all()
        ship_ids = [s.id for s in ships]
        bookings = db.query(Booking).filter(Booking.cross_id.in_(ship_ids), Booking.status.in_(['CONFIRMED', 'COMPLETED'])).all()
        rev = sum(float(b.total_price or 0) for b in bookings)
        owners_list.append({
            'id': o.id,
            'username': o.username,
            'email': o.email,
            'full_name': o.full_name or o.username,
            'phone': o.phone or '',
            'is_approved_owner': o.is_approved_owner,
            'is_active': o.is_active,
            'ships_count': len(ships),
            'total_revenue': rev,
            'date_joined': o.date_joined.strftime('%Y-%m-%d') if o.date_joined else ''
        })
    return {'owners': owners_list}


@router.post("/owners/")
@router.post("/owners")
async def admin_owner_action(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    owner_id = data.get('owner_id')
    action = data.get('action')
    owner = db.query(User).filter(User.id == owner_id, User.role.in_(['OWNER', 'CROSS_OWNER'])).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found.")

    if action == 'approve':
        owner.is_approved_owner = True
    elif action == 'reject':
        owner.is_approved_owner = False
    elif action == 'toggle_active':
        owner.is_active = not owner.is_active

    db.commit()
    return {'success': True, 'message': f'Owner {owner.username} updated.'}


@router.get("/ships/")
@router.get("/ships")
def list_admin_ships(
    q: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    page: int = 1,
    page_size: int = 500,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Cross).order_by(desc(Cross.created_at), desc(Cross.id))

    if q:
        query = query.filter(
            or_(
                Cross.name.ilike(f"%{q}%"),
                Cross.location.ilike(f"%{q}%")
            )
        )
    if category:
        query = query.filter(or_(Cross.category.ilike(category), Cross.vessel_category.ilike(category)))
    if location:
        query = query.filter(Cross.location.ilike(f"%{location}%"))
    if status:
        st_upper = status.upper()
        if st_upper == 'ACTIVE':
            query = query.filter(Cross.is_active == True)
        elif st_upper in ['INACTIVE', 'SUSPENDED']:
            query = query.filter(Cross.is_active == False)
        elif st_upper == 'APPROVED':
            query = query.filter(Cross.is_approved == True)
        elif st_upper == 'PENDING':
            query = query.filter(Cross.is_approved == False)

    total_records = query.count()
    if page_size <= 0:
        ships_page = query.all()
    else:
        offset = (page - 1) * page_size
        ships_page = query.offset(offset).limit(page_size).all()

    page_ship_ids = [s.id for s in ships_page]
    ship_stats = {}
    if page_ship_ids:
        b_records = db.query(Booking).filter(Booking.cross_id.in_(page_ship_ids)).all()
        for b in b_records:
            if b.cross_id not in ship_stats:
                ship_stats[b.cross_id] = {'count': 0, 'revenue': 0.0}
            ship_stats[b.cross_id]['count'] += 1
            if b.status in ['CONFIRMED', 'COMPLETED']:
                ship_stats[b.cross_id]['revenue'] += float(b.total_price or 0)

    ships_list = []
    for s in ships_page:
        owner_name = 'Platform Managed Fleet'
        owner_email = ''
        if s.owner:
            owner_name = s.owner.full_name or s.owner.username
            owner_email = s.owner.email
        elif s.operator:
            owner_name = s.operator.name
            owner_email = s.operator.email

        b_stat = ship_stats.get(s.id, {'count': 0, 'revenue': 0.0})
        ships_list.append({
            'id': s.id,
            'name': s.name,
            'slug': s.slug,
            'owner_name': owner_name,
            'owner_email': owner_email,
            'operator_name': s.operator.name if s.operator else owner_name,
            'category': s.effective_category,
            'vessel_category': s.vessel_category or s.category,
            'location': s.location,
            'address': s.address or '',
            'price': float(s.price),
            'price_unit': s.price_unit,
            'formatted_price_basis': s.formatted_price_basis,
            'is_quote_based': s.is_quote_based,
            'capacity': s.capacity,
            'display_capacity_text': s.display_capacity_text,
            'duration_display': s.duration_display or f"{s.duration_days} Day(s)",
            'is_active': s.is_active,
            'is_approved': s.is_approved,
            'image_url': s.display_image_url,
            'description': s.description or '',
            'total_bookings': b_stat['count'],
            'total_revenue': b_stat['revenue'],
            'destination': s.destination or '',
            'route': s.route or '',
            'departure_port': s.departure_port or ''
        })

    all_ships = db.query(Cross).all()
    total_ships_count = len(all_ships)
    active_ships_count = sum(1 for s in all_ships if s.is_active)
    approved_ships_count = sum(1 for s in all_ships if s.is_approved)
    pending_ships_count = sum(1 for s in all_ships if not s.is_approved)
    total_fleet_capacity = sum((s.capacity or 0) for s in all_ships)

    total_pages = (total_records + page_size - 1) // page_size
    pagination = {
        'page': page,
        'page_size': page_size,
        'total_records': total_records,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }

    return {
        'ships': ships_list,
        'stats': {
            'total_ships': total_ships_count,
            'active_ships': active_ships_count,
            'approved_ships': approved_ships_count,
            'pending_ships': pending_ships_count,
            'total_fleet_capacity': total_fleet_capacity
        },
        'pagination': pagination
    }


@router.post("/ships/")
@router.post("/ships")
async def admin_ship_action(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    action = data.get('action')
    ship_id = data.get('ship_id')

    if action == 'create_ship':
        name = data.get('name', '').strip()
        if not name:
            raise HTTPException(status_code=400, detail="Ship name is required.")

        import uuid
        from backend.app.core.security import slugify
        slug_candidate = slugify(name)
        if db.query(Cross).filter(Cross.slug == slug_candidate).first():
            slug_candidate = f"{slug_candidate}-{uuid.uuid4().hex[:6]}"

        new_ship = Cross(
            name=name,
            slug=slug_candidate,
            category=data.get('category', 'YACHT'),
            vessel_category=data.get('category', 'YACHT'),
            location=data.get('location', 'Goa'),
            address=data.get('address', 'Marine Jetty, Port Terminal'),
            price=Decimal(str(data.get('price', 25000))),
            price_unit=data.get('price_unit', 'PER_HOUR'),
            capacity=int(data.get('capacity', 12)),
            duration_display=data.get('duration_display', '2 Hours Charter'),
            description=data.get('description', 'Luxury marine charter vessel with executive amenities.'),
            image_url=data.get('image_url', ''),
            is_active=bool(data.get('is_active', True)),
            is_approved=True,
            owner_id=current_user.id if current_user.role in ['OWNER', 'CROSS_OWNER'] else None
        )
        db.add(new_ship)
        db.commit()
        db.refresh(new_ship)
        return {
            'success': True,
            'message': f'Ship {new_ship.name} registered into platform fleet.',
            'ship': {
                'id': new_ship.id,
                'name': new_ship.name,
                'slug': new_ship.slug
            }
        }

    ship = db.query(Cross).filter(Cross.id == ship_id).first()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found.")

    if action == 'approve':
        ship.is_approved = True
        ship.is_active = True
        db.commit()
        return {'success': True, 'is_approved': True, 'is_active': True, 'message': f'Ship {ship.name} approved for public booking.'}
    elif action in ['revoke', 'revoke_approval']:
        # Revoke must NOT change is_approved; it should set is_active to False (unactive)
        ship.is_active = False
        db.commit()
        return {'success': True, 'is_approved': ship.is_approved, 'is_active': False, 'message': f'Ship {ship.name} revoked and set to inactive.'}
    elif action == 'toggle_active':
        ship.is_active = not ship.is_active
        db.commit()
        return {'success': True, 'is_active': ship.is_active, 'message': f"Ship {ship.name} is now {'Active' if ship.is_active else 'Deactivated'}."}
    elif action == 'update_ship':
        if 'name' in data and data['name'].strip():
            ship.name = data['name'].strip()
        if 'category' in data:
            ship.category = data['category']
            ship.vessel_category = data['category']
        if 'location' in data and data['location'].strip():
            ship.location = data['location'].strip()
        if 'price' in data:
            ship.price = Decimal(str(data['price']))
        if 'price_unit' in data:
            ship.price_unit = data['price_unit']
        if 'capacity' in data:
            ship.capacity = int(data['capacity'])
        if 'duration_display' in data:
            ship.duration_display = data['duration_display']
        if 'description' in data:
            ship.description = data['description']
        if 'image_url' in data and data['image_url'].strip():
            ship.image_url = data['image_url'].strip()
        if 'is_active' in data:
            ship.is_active = bool(data['is_active'])
        if 'is_approved' in data:
            ship.is_approved = bool(data['is_approved'])
        db.commit()
        return {'success': True, 'message': f'Ship {ship.name} updated successfully.'}
    elif action == 'delete':
        ship_name = ship.name
        db.delete(ship)
        db.commit()
        return {'success': True, 'message': f'Ship {ship_name} deleted from database.'}

    raise HTTPException(status_code=400, detail="Invalid action requested.")


@router.get("/bookings/")
@router.get("/bookings")
def list_admin_bookings(
    type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).order_by(desc(Booking.created_at), desc(Booking.id))
    if type and type.lower() not in ['undefined', 'null', 'all']:
        query = query.filter(Booking.booking_type == type)
    if status and status.lower() not in ['undefined', 'null', 'all']:
        query = query.filter(Booking.status == status)

    bookings = query.limit(100).all()
    return {'bookings': [serialize_booking(b) for b in bookings]}


@router.post("/bookings/")
@router.post("/bookings")
async def update_admin_booking(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    booking_id = data.get('booking_id')
    new_status = data.get('status')
    b = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if new_status in ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING']:
        b.status = new_status
        b.tracking_status = new_status
        db.commit()
        db.refresh(b)
        return {'success': True, 'booking': serialize_booking(b)}

    raise HTTPException(status_code=400, detail="Invalid status.")


@router.get("/tours/")
@router.get("/tours")
def list_admin_tours(
    q: Optional[str] = None,
    destination: Optional[str] = None,
    departure_port: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(PublicTour)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                PublicTour.tour_title.ilike(term),
                PublicTour.destination.ilike(term),
                PublicTour.departure_port.ilike(term),
                PublicTour.itinerary.ilike(term)
            )
        )

    if destination and destination.strip() and destination.lower() not in ("all", ""):
        query = query.filter(PublicTour.destination.ilike(f"%{destination.strip()}%"))

    if departure_port and departure_port.strip() and departure_port.lower() not in ("all", ""):
        query = query.filter(PublicTour.departure_port.ilike(f"%{departure_port.strip()}%"))

    if status and status.strip() and status.lower() not in ("all", ""):
        if status.upper() == 'PUBLISHED':
            query = query.filter(PublicTour.is_published == True)
        elif status.upper() == 'UNPUBLISHED':
            query = query.filter(PublicTour.is_published == False)
        else:
            query = query.filter(PublicTour.status == status.upper())

    tours = query.order_by(desc(PublicTour.created_at), desc(PublicTour.id)).all()
    serialized = [serialize_tour(t) for t in tours]

    all_tours = db.query(PublicTour).all()
    total_capacity = sum((t.total_capacity or 0) for t in all_tours)
    remaining_capacity = sum((t.remaining_capacity or 0) for t in all_tours)
    avg_price = (sum(float(t.adult_price or 0) for t in all_tours) / len(all_tours)) if all_tours else 0

    return {
        'tours': serialized,
        'total': len(serialized),
        'stats': {
            'total_tours': len(all_tours),
            'published_tours': sum(1 for t in all_tours if t.is_published),
            'total_capacity': total_capacity,
            'remaining_capacity': remaining_capacity,
            'avg_ticket_price': round(avg_price, 2)
        }
    }


@router.post("/tours/")
@router.post("/tours")
async def admin_tour_action(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    tour_id = data.get('tour_id')
    action = data.get('action')
    t = db.query(PublicTour).filter(PublicTour.id == tour_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tour not found.")

    if action == 'toggle_publish':
        t.is_published = not t.is_published
    elif action == 'cancel':
        t.status = 'CANCELLED'
        t.is_published = False

    db.commit()
    db.refresh(t)
    return {'success': True, 'tour': serialize_tour(t)}


@router.get("/reviews/")
@router.get("/reviews/")
@router.get("/reviews")
def list_admin_reviews(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    reviews = db.query(CrossReview).order_by(desc(CrossReview.created_at), desc(CrossReview.id)).limit(100).all()
    rev_list = []
    for r in reviews:
        ship = r.cross
        owner = ship.owner if (ship and ship.owner_id) else None
        rev_list.append({
            'id': r.id,
            'ship_id': r.cross_id,
            'ship_name': ship.name if ship else 'Cruiser',
            'ship_image': ship.display_image_url if ship else '',
            'owner_id': ship.owner_id if ship else None,
            'owner_name': (owner.full_name or owner.username) if owner else ('Platform Fleet Admin' if ship else 'N/A'),
            'owner_email': owner.email if owner else '',
            'owner_phone': owner.phone if owner else '',
            'author': (r.user.full_name or r.user.username) if r.user else 'Anonymous',
            'author_email': r.user.email if r.user else '',
            'booking_id': r.booking.booking_id if r.booking else '',
            'rating': r.rating,
            'comment': r.comment,
            'has_complaint': bool(r.has_complaint),
            'complaint_category': r.complaint_category or '',
            'complaint_text': r.complaint_text or '',
            'complaint_status': r.complaint_status or ('PENDING' if r.has_complaint else 'NONE'),
            'warning_message': r.warning_message or '',
            'warning_sent_at': r.warning_sent_at.strftime('%Y-%m-%d %H:%M') if r.warning_sent_at else None,
            'owner_response': r.owner_response or '',
            'owner_response_at': r.owner_response_at.strftime('%Y-%m-%d %H:%M') if r.owner_response_at else None,
            'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else ''
        })
    return {'reviews': rev_list}


@router.post("/reviews/warn-owner/")
@router.post("/reviews/warn-owner")
@router.post("/reviews/send-warning/")
@router.post("/reviews/send-warning")
async def admin_warn_ship_owner(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    review_id = data.get("review_id")
    warning_text = (data.get("warning_message") or "").strip()

    if not review_id:
        raise HTTPException(status_code=400, detail="Review ID is required.")

    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review / Complaint record not found.")

    ship = r.cross
    ship_name = ship.name if ship else "Charter Vessel"
    owner = ship.owner if (ship and ship.owner_id) else None

    if not warning_text:
        warning_text = (
            f"Official Compliance Warning from Platform Moderation regarding passenger complaint on vessel '{ship_name}'. "
            f"Category: {r.complaint_category or 'Passenger Experience'}. "
            f"Details: {r.complaint_text or r.comment}. "
            f"Please take prompt remedial action. Continued passenger grievances may lead to vessel suspension."
        )

    r.complaint_status = "WARNING_SENT"
    r.warning_message = warning_text
    r.warning_sent_at = datetime.utcnow()

    if owner:
        notif = PlatformNotification(
            title=f"Platform Compliance Warning: {ship_name}",
            message=warning_text,
            notification_type="COMPLAINT_WARNING",
            target_audience="OWNERS",
            target_user_id=owner.id,
            action_link="/operator-dashboard?tab=reviews",
            sender_name="Platform Safety & Moderation",
            is_read=False,
        )
        db.add(notif)

    db.commit()

    return {
        "success": True,
        "message": f"Official warning dispatched successfully to the owner of {ship_name}.",
        "owner_name": (owner.full_name or owner.username) if owner else "Platform Admin",
        "warning_sent_at": r.warning_sent_at.strftime("%Y-%m-%d %H:%M")
    }


@router.post("/reviews/{review_id}/resolve/")
@router.post("/reviews/{review_id}/resolve")
def admin_resolve_complaint(
    review_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review or complaint not found.")
    r.complaint_status = "RESOLVED"
    if not r.owner_response:
        r.owner_response = "Resolved and acknowledged by Platform Administration."
        r.owner_response_at = datetime.utcnow()
    db.commit()
    return {"success": True, "message": "Complaint marked as resolved successfully."}


@router.post("/reviews/{review_id}/reopen/")
@router.post("/reviews/{review_id}/reopen")
def admin_reopen_complaint(
    review_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    r = db.query(CrossReview).filter(CrossReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review or complaint not found.")
    r.complaint_status = "PENDING"
    db.commit()
    return {"success": True, "message": "Complaint reopened for moderation review."}


@router.delete("/reviews/")
@router.delete("/reviews")
def delete_admin_review(
    id: int = Query(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    r = db.query(CrossReview).filter(CrossReview.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found.")
    db.delete(r)
    db.commit()
    return {'success': True, 'message': 'Review removed.'}


@router.get("/reports/")
@router.get("/reports")
def get_admin_reports(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    all_crosses = db.query(Cross).all()
    popular_ships = []
    for s in all_crosses:
        b_count = db.query(Booking).filter(Booking.cross_id == s.id).count()
        popular_ships.append({
            'name': s.name,
            'bookings_count': b_count,
            'location': s.location
        })
    popular_ships.sort(key=lambda x: x['bookings_count'], reverse=True)
    popular_ships = popular_ships[:5]

    all_bookings = db.query(Booking).all()
    dest_counts = {}
    for b in all_bookings:
        if b.cross:
            d = b.cross.destination or b.cross.location or 'Arabian Sea'
            dest_counts[d] = dest_counts.get(d, 0) + 1
    popular_destinations = [{'destination': k, 'count': v} for k, v in sorted(dest_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    confirmed_bookings = [b for b in all_bookings if b.status in ['CONFIRMED', 'COMPLETED']]
    total_revenue = float(sum((b.total_price or Decimal('0.00')) for b in confirmed_bookings))
    total_bookings = len(all_bookings)
    cancelled_count = sum(1 for b in all_bookings if b.status == 'CANCELLED')
    cancellation_rate = round((cancelled_count / max(1, total_bookings)) * 100, 1)

    return {
        'popular_ships': popular_ships,
        'popular_destinations': popular_destinations,
        'total_revenue': total_revenue,
        'cancellation_rate': cancellation_rate
    }


@router.get("/reports/generate/")
@router.get("/reports/generate")
def generate_admin_report(
    report_type: str = 'financial_ledger',
    preset: str = 'last_30_days',
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    page_size: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    now = datetime.now()
    today = date.today()

    start_date = today - timedelta(days=30)
    end_date = today
    range_label = 'Last 30 Days'

    if date_from and date_to:
        try:
            start_date = datetime.strptime(date_from.strip(), '%Y-%m-%d').date()
            end_date = datetime.strptime(date_to.strip(), '%Y-%m-%d').date()
            range_label = f"{start_date.strftime('%b %d, %Y')} to {end_date.strftime('%b %d, %Y')}"
        except Exception:
            pass
    elif preset == 'last_7_days':
        start_date = today - timedelta(days=7)
        range_label = 'Last 7 Days'
    elif preset == 'last_30_days':
        start_date = today - timedelta(days=30)
        range_label = 'Last 30 Days'
    elif preset == 'this_month':
        start_date = today.replace(day=1)
        range_label = f"This Month ({today.strftime('%B %Y')})"
    elif preset == 'last_quarter':
        start_date = today - timedelta(days=90)
        range_label = 'Last Quarter (90 Days)'
    elif preset == 'year_to_date':
        start_date = today.replace(month=1, day=1)
        range_label = f"Year to Date ({today.year})"
    elif preset == 'all_time':
        start_date = date(2020, 1, 1)
        range_label = 'All Time'

    bookings_query = db.query(Booking).filter(
        Booking.booking_date >= start_date,
        Booking.booking_date <= end_date
    )
    total_records = bookings_query.count()
    offset = (page - 1) * page_size
    page_bookings = bookings_query.order_by(desc(Booking.booking_date)).offset(offset).limit(page_size).all()
    all_period_bookings = bookings_query.all()

    total_pages = (total_records + page_size - 1) // page_size
    pagination = {
        'page': page,
        'page_size': page_size,
        'total_records': total_records,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }

    if report_type == 'financial_ledger':
        columns = [
            'Invoice #', 'Booking Ref', 'Booking Date', 'Customer Name', 'Vessel / Ship',
            'Gross Paid (₹)', 'Platform Commission (₹)', 'Owner Payout (₹)', 'Discounts (₹)',
            'Refund (₹)', 'Net Profit (₹)', 'Payment Status', 'Payout Status'
        ]
        tot_gross = sum((b.total_price or Decimal('0.00')) for b in all_period_bookings)
        tot_comm = sum((b.platform_commission_amount or Decimal('0.00')) for b in all_period_bookings)
        tot_payout = sum((b.owner_payout_amount or Decimal('0.00')) for b in all_period_bookings)
        tot_disc = sum((b.discount_amount or Decimal('0.00')) for b in all_period_bookings)
        tot_ref = sum((b.refund_amount or Decimal('0.00')) for b in all_period_bookings)
        tot_profit = sum((b.net_platform_profit or Decimal('0.00')) for b in all_period_bookings)

        rows = []
        for b in page_bookings:
            c_name = b.user.full_name or b.user.username if b.user else 'Guest'
            rows.append({
                'invoice_number': b.invoice_number or f"INV-{b.booking_id}",
                'booking_id': b.booking_id,
                'booking_date': b.booking_date.strftime('%Y-%m-%d') if b.booking_date else '',
                'customer_name': c_name,
                'vessel_name': b.cross.name if b.cross else 'N/A',
                'gross_price': float(b.total_price or 0),
                'platform_commission': float(b.platform_commission_amount or 0),
                'owner_payout': float(b.owner_payout_amount or 0),
                'discount_amount': float(b.discount_amount or 0),
                'refund_amount': float(b.refund_amount or 0),
                'net_profit': float(b.net_platform_profit or 0),
                'payment_status': b.payment_status or 'PAID',
                'payout_status': b.payout_status or 'PENDING'
            })

        return {
            'report_type': 'financial_ledger',
            'title': 'Comprehensive Financial Ledger & Tax Audit Report',
            'range_label': range_label,
            'generated_at': now.strftime('%Y-%m-%d %H:%M'),
            'summary': {
                'total_gross': float(tot_gross),
                'total_commission': float(tot_comm),
                'total_payout': float(tot_payout),
                'total_discount': float(tot_disc),
                'total_refund': float(tot_ref),
                'net_profit': float(tot_profit),
                'transactions_count': total_records
            },
            'columns': columns,
            'rows': rows,
            'pagination': pagination
        }

    elif report_type == 'bookings_manifest':
        columns = [
            'Booking ID', 'Trip Date', 'Customer Name', 'Phone', 'Email',
            'Ship Name', 'Booking Type', 'Cabin / Package Type', 'Guests', 'Ticket Code', 'Total (₹)', 'Status'
        ]
        rows = []
        for b in page_bookings:
            c_name = b.user.full_name or b.user.username if b.user else 'Guest'
            rows.append({
                'booking_id': b.booking_id,
                'booking_date': b.booking_date.strftime('%Y-%m-%d') if b.booking_date else '',
                'customer_name': c_name,
                'phone': b.user.phone or '' if b.user else '',
                'email': b.user.email if b.user else '',
                'vessel_name': b.cross.name if b.cross else 'N/A',
                'booking_type': 'Private Charter' if b.booking_type == 'EVENT' else 'Public Tour Ticket',
                'package_or_cabin': b.event_type or b.cabin_type or 'Standard',
                'guests': b.number_of_people,
                'ticket_code': b.ticket_code or f"TK-{b.booking_id.replace('CRS-', '')}",
                'total_price': float(b.total_price or 0),
                'status': b.status
            })

        return {
            'report_type': 'bookings_manifest',
            'title': 'Passenger & Trip Bookings Report',
            'range_label': range_label,
            'generated_at': now.strftime('%Y-%m-%d %H:%M'),
            'summary': {
                'total_bookings': total_records,
                'confirmed_count': sum(1 for b in all_period_bookings if b.status == 'CONFIRMED'),
                'completed_count': sum(1 for b in all_period_bookings if b.status == 'COMPLETED'),
                'cancelled_count': sum(1 for b in all_period_bookings if b.status == 'CANCELLED'),
                'total_passengers': sum((b.number_of_people or 0) for b in all_period_bookings)
            },
            'columns': columns,
            'rows': rows,
            'pagination': pagination
        }

    else:  # fleet_performance
        columns = [
            'Ship Name', 'Category', 'Home Port', 'Capacity', 'Trips / Bookings',
            'Gross Generated (₹)', 'Platform Commission (₹)', 'Host Payout (₹)', 'Status'
        ]
        all_ships = db.query(Cross).all()
        rows = []
        for s in all_ships:
            s_bookings = [b for b in all_period_bookings if b.cross_id == s.id]
            conf_b = [b for b in s_bookings if b.status in ['CONFIRMED', 'COMPLETED']]
            gross_sum = sum((b.total_price or Decimal('0.00')) for b in conf_b)
            comm_sum = sum((b.platform_commission_amount or Decimal('0.00')) for b in conf_b)
            payout_sum = sum((b.owner_payout_amount or Decimal('0.00')) for b in conf_b)
            rows.append({
                'vessel_name': s.name,
                'category': s.effective_category,
                'location': s.location,
                'capacity': s.capacity,
                'voyages_count': len(s_bookings),
                'gross_revenue': float(gross_sum),
                'commission_earned': float(comm_sum),
                'owner_payout': float(payout_sum),
                'status': 'Active' if s.is_active else 'Inactive'
            })

        return {
            'report_type': 'fleet_performance',
            'title': 'Ship & Boat Performance Report',
            'range_label': range_label,
            'generated_at': now.strftime('%Y-%m-%d %H:%M'),
            'summary': {
                'total_ships': len(all_ships),
                'active_ships': sum(1 for s in all_ships if s.is_active),
                'total_trips_in_period': total_records
            },
            'columns': columns,
            'rows': rows,
            'pagination': pagination
        }


@router.get("/transactions/")
@router.get("/transactions")
def list_admin_transactions(
    q: Optional[str] = None,
    status: Optional[str] = None,
    payout_status: Optional[str] = None,
    page: int = 1,
    page_size: int = 500,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).order_by(desc(Booking.created_at), desc(Booking.id))

    if q:
        query = query.filter(
            or_(
                Booking.booking_id.ilike(f"%{q}%"),
                Booking.invoice_number.ilike(f"%{q}%"),
                Booking.payment_gateway_ref.ilike(f"%{q}%")
            )
        )
    if status:
        query = query.filter(Booking.payment_status.ilike(status))
    if payout_status:
        query = query.filter(Booking.payout_status.ilike(payout_status))

    total_records = query.count()
    if page_size <= 0:
        txns_page = query.all()
    else:
        offset = (page - 1) * page_size
        txns_page = query.offset(offset).limit(page_size).all()

    all_b = db.query(Booking).all()
    paid_b = [b for b in all_b if b.payment_status == 'PAID']
    gross_volume = sum((b.total_price or Decimal('0.00')) for b in paid_b)
    total_commission = sum((b.platform_commission_amount or Decimal('0.00')) for b in paid_b)
    total_payouts = sum((b.owner_payout_amount or Decimal('0.00')) for b in paid_b)
    total_refunds = sum((b.refund_amount or Decimal('0.00')) for b in all_b if b.payment_status == 'REFUNDED')
    failed_count = sum(1 for b in all_b if b.payment_status == 'FAILED')
    pending_settlements = sum((b.owner_payout_amount or Decimal('0.00')) for b in paid_b if b.payout_status == 'PENDING')
    settled_payouts = sum((b.owner_payout_amount or Decimal('0.00')) for b in paid_b if b.payout_status == 'SETTLED')

    total_pages = (total_records + page_size - 1) // page_size
    pagination = {
        'page': page,
        'page_size': page_size,
        'total_records': total_records,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }

    return {
        'transactions': [serialize_transaction(b) for b in txns_page],
        'stats': {
            'gross_volume': float(gross_volume),
            'total_commission': float(total_commission),
            'total_payouts': float(total_payouts),
            'total_refunds': float(total_refunds),
            'failed_count': failed_count,
            'pending_settlements': float(pending_settlements),
            'settled_payouts': float(settled_payouts)
        },
        'pagination': pagination
    }


@router.post("/transactions/")
@router.post("/transactions")
async def admin_transaction_action(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    action = data.get('action')
    booking_id = data.get('booking_id')
    b = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Transaction/Booking record not found.")

    if action == 'process_refund':
        ref_amt = Decimal(str(data.get('refund_amount', b.total_price)))
        reason = data.get('refund_reason', 'Refund issued by administrator.')
        b.payment_status = 'REFUNDED'
        b.status = 'CANCELLED'
        b.tracking_status = 'CANCELLED'
        b.ticket_status = 'CANCELLED'
        b.refund_amount = ref_amt
        b.refund_reason = reason
        b.refund_date = datetime.now()
        db.commit()
        return {
            'success': True,
            'message': f"Refund of INR ₹{ref_amt:,.2f} processed for booking #{b.booking_id}.",
            'payment_status': b.payment_status,
            'refund_amount': float(b.refund_amount)
        }
    elif action == 'settle_payout':
        b.payout_status = 'SETTLED'
        db.commit()
        return {'success': True, 'message': f"Operator payout for #{b.booking_id} marked as SETTLED.", 'payout_status': b.payout_status}
    elif action == 'hold_payout':
        b.payout_status = 'ON_HOLD'
        db.commit()
        return {'success': True, 'message': f"Payout for #{b.booking_id} placed ON HOLD for review.", 'payout_status': b.payout_status}
    elif action == 'retry_payment':
        b.payment_status = 'PENDING'
        b.failure_reason = ''
        db.commit()
        return {'success': True, 'message': f"Payment session for #{b.booking_id} reset to PENDING for customer retry.", 'payment_status': b.payment_status}

    raise HTTPException(status_code=400, detail="Invalid transaction action.")


@router.get("/notifications/")
@router.get("/notifications")
def list_admin_notifications(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    notifications = db.query(PlatformNotification).order_by(desc(PlatformNotification.created_at), desc(PlatformNotification.id)).limit(60).all()
    data = []
    for n in notifications:
        u_name = n.target_user.full_name or n.target_user.username if n.target_user else 'All in Audience'
        # Detect promo code if any
        code_match = re.search(r'(?:coupon\s+code|promo\s+code|promo\s+voucher|voucher|coupon|code)\s*[:\-]?\s*([A-Z0-9_-]{4,20})', f"{n.title} {n.message}", re.IGNORECASE)
        p_code = code_match.group(1).upper() if code_match else None
        
        # Check if offer is active in db
        offer_active = False
        if p_code:
            existing = db.query(Offer).filter(Offer.code.ilike(p_code), Offer.is_active == True).first()
            offer_active = bool(existing)

        data.append({
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'notification_type': n.notification_type,
            'target_audience': n.target_audience,
            'target_user_id': n.target_user_id,
            'target_user_name': u_name,
            'action_link': n.action_link or '',
            'sender_name': n.sender_name,
            'is_read': n.is_read,
            'recipients_count': n.recipients_count,
            'promo_code': p_code,
            'offer_active': offer_active,
            'created_at': n.created_at.strftime('%Y-%m-%d %H:%M') if n.created_at else ''
        })

    all_n = db.query(PlatformNotification).all()
    reach = sum((n.recipients_count or 0) for n in all_n)
    return {
        'notifications': data,
        'stats': {
            'total_sent': len(all_n),
            'updates_count': sum(1 for n in all_n if n.notification_type == 'IMPORTANT_UPDATE'),
            'offers_count': sum(1 for n in all_n if n.notification_type == 'OFFER'),
            'announcements_count': sum(1 for n in all_n if n.notification_type == 'ANNOUNCEMENT'),
            'total_reach': reach
        }
    }


@router.post("/notifications/")
@router.post("/notifications")
async def create_admin_notification(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    title = data.get('title', '').strip()
    message = data.get('message', '').strip()
    notif_type = data.get('notification_type', 'ANNOUNCEMENT').strip()
    target_audience = data.get('target_audience', 'ALL_USERS').strip()
    action_link = data.get('action_link', '').strip()
    target_user_id = data.get('target_user_id')
    sender_name = data.get('sender_name', 'Cross Hunt Executive Admin').strip()

    # Coupon & Promo Offer Parameters
    promo_code = data.get('promo_code', '').strip().upper()
    discount_val = data.get('discount_value')
    discount_type = data.get('discount_type', 'PERCENTAGE').strip().upper()
    min_booking_amt = data.get('min_booking_amount', 0)
    valid_days = data.get('valid_days', 60)
    auto_create_offer = data.get('auto_create_offer', True)

    if not title or not message:
        raise HTTPException(status_code=400, detail="Notification title and message content are required.")

    # If promo code not explicitly passed, attempt regex detection from title + message
    if not promo_code:
        code_match = re.search(r'(?:coupon\s+code|promo\s+code|promo\s+voucher|voucher|coupon|code)\s*[:\-]?\s*([A-Z0-9_-]{4,20})', f"{title} {message}", re.IGNORECASE)
        if code_match:
            promo_code = code_match.group(1).upper()

    created_offer = None
    if promo_code and auto_create_offer:
        # Determine discount value if not provided
        if discount_val is None or str(discount_val).strip() == '':
            pct_m = re.search(r'(\d{1,2})%\s*(?:off|discount|instant)?', f"{title} {message}", re.IGNORECASE)
            if pct_m:
                discount_val = float(pct_m.group(1))
                discount_type = 'PERCENTAGE'
            else:
                flat_m = re.search(r'(?:flat\s*|instant\s*)?[₹\s]*([0-9,]+)\s*(?:off|discount)', f"{title} {message}", re.IGNORECASE)
                if flat_m:
                    try:
                        discount_val = float(flat_m.group(1).replace(',', ''))
                        discount_type = 'FLAT'
                    except ValueError:
                        discount_val = 15.0
                else:
                    discount_val = 15.0
        else:
            try:
                discount_val = float(discount_val)
            except (ValueError, TypeError):
                discount_val = 15.0

        try:
            min_amt = Decimal(str(min_booking_amt or 0.0))
        except Exception:
            min_amt = Decimal("0.00")

        today = date.today()
        try:
            d_days = int(valid_days) if valid_days else 60
        except Exception:
            d_days = 60
        expiry_date = today + timedelta(days=max(7, d_days))

        existing_offer = db.query(Offer).filter(Offer.code.ilike(promo_code)).first()
        if existing_offer:
            existing_offer.title = title[:120] if title else existing_offer.title
            existing_offer.description = message or existing_offer.description
            existing_offer.discount_type = discount_type if discount_type in ['PERCENTAGE', 'FLAT'] else 'PERCENTAGE'
            existing_offer.discount_value = Decimal(str(round(discount_val, 2)))
            existing_offer.min_booking_amount = min_amt
            if existing_offer.valid_to < today:
                existing_offer.valid_to = expiry_date
            existing_offer.is_active = True
            created_offer = existing_offer
        else:
            new_offer = Offer(
                code=promo_code,
                title=title[:120] if title else f"{promo_code} Special Offer",
                description=message or f"Promotional offer coupon {promo_code}",
                discount_type=discount_type if discount_type in ['PERCENTAGE', 'FLAT'] else 'PERCENTAGE',
                discount_value=Decimal(str(round(discount_val, 2))),
                min_booking_amount=min_amt,
                valid_from=today,
                valid_to=expiry_date,
                is_active=True
            )
            db.add(new_offer)
            created_offer = new_offer
        db.flush()

    if not action_link and notif_type == 'OFFER':
        action_link = '/tours'

    target_user = None
    recipients_count = 1
    if target_audience == 'SPECIFIC_USER' and target_user_id:
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found.")
        recipients_count = 1
    elif target_audience == 'ALL_OWNERS':
        recipients_count = max(1, db.query(User).filter(User.role.in_(['OWNER', 'CROSS_OWNER'])).count())
    else:
        recipients_count = max(1, db.query(User).filter(User.role == 'USER').count())

    new_notif = PlatformNotification(
        title=title,
        message=message,
        notification_type=notif_type,
        target_audience=target_audience,
        target_user_id=target_user.id if target_user else None,
        action_link=action_link,
        sender_name=sender_name,
        recipients_count=recipients_count
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)

    success_msg = f"Notification '{new_notif.title}' successfully dispatched to {recipients_count} recipient(s)."
    if created_offer:
        discount_label = f"{float(created_offer.discount_value)}%" if created_offer.discount_type == 'PERCENTAGE' else f"₹{float(created_offer.discount_value)}"
        success_msg += f" Promo Code '{created_offer.code}' ({discount_label} OFF) is now LIVE and working for customer checkout!"

    return {
        'success': True,
        'message': success_msg,
        'notification': {
            'id': new_notif.id,
            'title': new_notif.title,
            'notification_type': new_notif.notification_type,
            'target_audience': new_notif.target_audience,
            'recipients_count': new_notif.recipients_count,
            'promo_code': promo_code if promo_code else None,
            'created_at': new_notif.created_at.strftime('%Y-%m-%d %H:%M') if new_notif.created_at else ''
        },
        'offer': created_offer.to_dict() if created_offer else None
    }


@router.get("/operators/")
@router.get("/operators")
def list_admin_operators(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    operators = db.query(Operator).all()
    data = []
    for op in operators:
        vessels = op.vessels
        tours = op.public_tours
        routes = op.routes
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
            'vessels_count': len(vessels),
            'tours_count': len(tours),
            'routes_count': len(routes),
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
    return {
        'total': len(data),
        'operators': data,
        'source_date': '01 Oct 2026',
    }


@router.post("/operators/")
@router.post("/operators")
async def create_admin_operator(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        body = await request.json()
    except Exception:
        body = {}

    name = body.get('name', '').strip()
    location = body.get('location', '').strip()
    if not name or not location:
        raise HTTPException(status_code=400, detail="Operator name and location are required.")

    import uuid
    from backend.app.core.security import slugify
    slug_candidate = slugify(name)
    if db.query(Operator).filter(Operator.slug == slug_candidate).first():
        slug_candidate = f"{slug_candidate}-{uuid.uuid4().hex[:6]}"

    op = db.query(Operator).filter(Operator.name == name).first()
    created = False
    if not op:
        created = True
        op = Operator(name=name, slug=slug_candidate, location=location)
        db.add(op)

    op.description = body.get('description', '').strip()
    op.location = location
    op.phone = body.get('phone', '').strip()
    op.email = body.get('email', '').strip()
    op.website = body.get('website', '').strip()
    op.booking_url = body.get('booking_url', '').strip()
    op.office_address = body.get('office_address', '').strip()
    op.verified = bool(body.get('verified', True))
    op.source_checked = body.get('source_checked', '01 Oct 2026')

    db.commit()
    db.refresh(op)
    return {'success': True, 'created': created, 'operator_id': op.id}


@router.get("/operators/{operator_id}/")
@router.get("/operators/{operator_id}")
def get_admin_operator_detail(
    operator_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found.")
    return {
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
            'vessels': [serialize_cruise(v) for v in op.vessels],
            'tours': [serialize_tour(t) for t in op.public_tours],
        }
    }


@router.put("/operators/{operator_id}/")
@router.put("/operators/{operator_id}")
@router.post("/operators/{operator_id}/")
@router.post("/operators/{operator_id}")
async def update_admin_operator_detail(
    operator_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found.")

    try:
        body = await request.json()
    except Exception:
        body = {}

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

    db.commit()
    return {'success': True, 'message': 'Operator updated successfully.'}


@router.put("/operators/{operator_id}/vessels/{vessel_id}/")
@router.put("/operators/{operator_id}/vessels/{vessel_id}")
@router.post("/operators/{operator_id}/vessels/{vessel_id}/")
@router.post("/operators/{operator_id}/vessels/{vessel_id}")
async def update_admin_operator_vessel(
    operator_id: int,
    vessel_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    v = db.query(Cross).filter(Cross.id == vessel_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vessel not found.")

    try:
        body = await request.json()
    except Exception:
        body = {}

    if 'price' in body:
        v.price = Decimal(str(body['price']))
    if 'price_unit' in body:
        v.price_unit = body['price_unit'].strip()
    if 'is_quote_based' in body:
        v.is_quote_based = bool(body['is_quote_based'])
    if 'duration_display' in body:
        v.duration_display = body['duration_display'].strip()
    if 'capacity' in body:
        v.capacity = int(body['capacity'])
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

    db.commit()
    db.refresh(v)
    return {'success': True, 'vessel': serialize_cruise(v)}


@router.post("/operators/resync-seed/")
@router.post("/operators/resync-seed")
def admin_resync_seed(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_operators = db.query(Operator).count()
    total_vessels = db.query(Cross).count()
    return {
        'success': True,
        'message': 'Research data synchronized successfully.',
        'report': f'Synced {total_operators} operators and {total_vessels} vessels.'
    }


@router.get("/whatsapp/config/")
@router.get("/whatsapp/config")
def get_admin_whatsapp_config(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    configured_hours = get_configured_reminder_hours(db)
    creds = get_whatsapp_credentials(db)
    is_live = creds["is_live"]
    provider = creds["provider"]

    total_scheduled = db.query(Booking).filter(
        Booking.status.in_(['CONFIRMED', 'PENDING']),
        Booking.whatsapp_reminder_sent == False,
        Booking.whatsapp_reminder_opt_in == True
    ).count()
    total_sent = db.query(Booking).filter(Booking.whatsapp_reminder_sent == True).count()
    total_failed = db.query(Booking).filter(Booking.whatsapp_reminder_status == 'FAILED').count()
    total_opted_out = db.query(Booking).filter(Booking.whatsapp_reminder_opt_in == False).count()

    now = datetime.now()
    window_end = now + timedelta(hours=configured_hours)
    upcoming_candidates = db.query(Booking).filter(
        Booking.status.in_(['CONFIRMED', 'PENDING']),
        Booking.booking_date >= now.date()
    ).order_by(Booking.booking_date, Booking.start_time).limit(40).all()

    upcoming_queue = []
    for b in upcoming_candidates:
        dep_time = b.start_time or time(10, 0)
        dep_dt = datetime.combine(b.booking_date, dep_time)
        in_window = (now <= dep_dt <= window_end)
        c_name = b.user.full_name or b.user.username if b.user else 'Guest'

        raw_phone = b.customer_whatsapp or (b.user.whatsapp_number if b.user else None) or (b.user.phone if b.user else None)
        norm_phone = normalize_whatsapp_number(raw_phone)
        wa_link = ""
        msg_preview = ""
        if norm_phone:
            clean_digits = norm_phone.replace("+", "")
            msg_preview = build_tour_reminder_text(b)
            wa_link = f"https://web.whatsapp.com/send?phone={clean_digits}&text={urllib.parse.quote(msg_preview)}"

        upcoming_queue.append({
            'booking_id': b.booking_id,
            'customer_name': c_name,
            'customer_whatsapp': norm_phone or raw_phone or '',
            'customer_whatsapp_masked': mask_whatsapp_number(norm_phone or raw_phone) if (norm_phone or raw_phone) else '',
            'vessel_or_tour': b.public_tour.tour_title if b.public_tour else (b.cross.name if b.cross else 'Cruiser'),
            'departure_date': b.booking_date.strftime('%Y-%m-%d') if b.booking_date else '',
            'departure_time': b.start_time.strftime('%H:%M') if b.start_time else '10:00',
            'opt_in': b.whatsapp_reminder_opt_in,
            'status': b.whatsapp_reminder_status,
            'sent': b.whatsapp_reminder_sent,
            'sent_at': b.whatsapp_reminder_sent_at.isoformat() if b.whatsapp_reminder_sent_at else None,
            'in_window': in_window,
            'wa_link': wa_link,
            'message_preview': msg_preview
        })

    recent_logs = db.query(WhatsAppMessageLog).order_by(desc(WhatsAppMessageLog.created_at)).limit(40).all()
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
        'created_at': l.created_at.strftime('%Y-%m-%d %H:%M:%S') if l.created_at else '',
    } for l in recent_logs]

    token_str = creds["api_token"]
    masked_token = f"{token_str[:6]}••••••••{token_str[-6:]}" if len(token_str) > 12 else ("••••" if token_str else "")

    return {
        'config': {
            'configured_hours': configured_hours,
            'provider': provider,
            'is_live_configured': is_live,
            'has_api_token': bool(creds["api_token"]),
            'masked_token': masked_token,
            'phone_number_id': creds["phone_number_id"],
            'business_account_id': creds["business_account_id"],
            'total_scheduled': total_scheduled,
            'total_sent': total_sent,
            'total_failed': total_failed,
            'total_opted_out': total_opted_out,
        },
        'upcoming_queue': upcoming_queue,
        'recent_logs': logs_data
    }


@router.post("/whatsapp/config/")
@router.post("/whatsapp/config")
async def update_admin_whatsapp_config(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    hours = data.get('hours')
    if hours is None or not str(hours).strip().isdigit():
        raise HTTPException(status_code=400, detail="Please provide a valid integer hours value.")

    saved_hours = set_configured_reminder_hours(int(hours), db)
    return {
        'success': True,
        'message': f"WhatsApp reminder window successfully updated to {saved_hours} hours prior to departure.",
        'configured_hours': saved_hours
    }


@router.post("/whatsapp/dispatch/")
@router.post("/whatsapp/dispatch")
async def admin_whatsapp_dispatch(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    hours = data.get('hours')
    dry_run = bool(data.get('dry_run', False))
    hours_int = int(hours) if (hours and str(hours).isdigit()) else None

    result = dispatch_tour_reminders_batch(db, hours_before=hours_int, dry_run=dry_run)
    return {
        'success': True,
        'summary': result,
        'message': f"Batch processed: {result['sent']} reminders sent, {result['failed']} failed within {result['hours_before']}h window."
    }


@router.get("/whatsapp/logs/")
@router.get("/whatsapp/logs")
def get_admin_whatsapp_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(WhatsAppMessageLog).order_by(desc(WhatsAppMessageLog.created_at)).limit(100).all()
    return {
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
            'created_at': l.created_at.strftime('%Y-%m-%d %H:%M:%S') if l.created_at else '',
        } for l in logs]
    }


@router.get("/whatsapp/credentials/")
@router.get("/whatsapp/credentials")
def get_admin_whatsapp_credentials(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    creds = get_whatsapp_credentials(db)
    token = creds["api_token"]
    masked = f"{token[:6]}••••••••{token[-6:]}" if len(token) > 12 else ("••••" if token else "")
    return {
        "is_live": creds["is_live"],
        "provider": creds["provider"],
        "has_token": bool(token),
        "masked_token": masked,
        "phone_number_id": creds["phone_number_id"],
        "business_account_id": creds["business_account_id"]
    }


@router.post("/whatsapp/credentials/")
@router.post("/whatsapp/credentials")
async def update_admin_whatsapp_credentials(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
    except Exception:
        data = {}

    token = (data.get("api_token") or "").strip()
    phone_id = (data.get("phone_number_id") or "").strip()
    biz_id = (data.get("business_account_id") or "").strip()

    def upsert_setting(k: str, val: str, desc: str):
        s = db.query(SystemSetting).filter_by(key=k).first()
        if not s:
            s = SystemSetting(key=k, value=val, description=desc)
            db.add(s)
        else:
            if val != "[UNCHANGED]":
                s.value = val
        db.commit()

    if token and token != "[UNCHANGED]":
        upsert_setting("whatsapp_api_token", token, "Meta WhatsApp Business Cloud API Access Token")
    elif token == "":
        upsert_setting("whatsapp_api_token", "", "Meta WhatsApp Business Cloud API Access Token")

    if phone_id:
        upsert_setting("whatsapp_phone_number_id", phone_id, "Meta WhatsApp Business Phone Number ID")
    if biz_id:
        upsert_setting("whatsapp_business_account_id", biz_id, "Meta WhatsApp Business Account ID")

    # Sync to root .env file
    env_path = os.path.join(settings.BASE_DIR, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            new_lines = []
            keys_seen = set()
            for line in lines:
                if line.startswith("WHATSAPP_API_TOKEN=") and token != "[UNCHANGED]":
                    new_lines.append(f'WHATSAPP_API_TOKEN="{token}"\n')
                    keys_seen.add("WHATSAPP_API_TOKEN")
                elif line.startswith("WHATSAPP_PHONE_NUMBER_ID=") and phone_id:
                    new_lines.append(f'WHATSAPP_PHONE_NUMBER_ID="{phone_id}"\n')
                    keys_seen.add("WHATSAPP_PHONE_NUMBER_ID")
                elif line.startswith("WHATSAPP_BUSINESS_ACCOUNT_ID=") and biz_id:
                    new_lines.append(f'WHATSAPP_BUSINESS_ACCOUNT_ID="{biz_id}"\n')
                    keys_seen.add("WHATSAPP_BUSINESS_ACCOUNT_ID")
                else:
                    new_lines.append(line)
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
        except Exception:
            pass

    updated_creds = get_whatsapp_credentials(db)
    return {
        "success": True,
        "message": "WhatsApp API credentials updated successfully.",
        "is_live": updated_creds["is_live"],
        "provider": updated_creds["provider"]
    }


@router.post("/whatsapp/test-connection/")
@router.post("/whatsapp/test-connection")
async def test_admin_whatsapp_connection(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    import requests
    creds = get_whatsapp_credentials(db)
    token = creds["api_token"]
    phone_id = creds["phone_number_id"]

    if not token or not phone_id:
        return {
            "success": False,
            "is_live": False,
            "message": "Missing API Token or Phone Number ID. Please configure and save them first.",
            "details": None
        }

    try:
        url = f"https://graph.facebook.com/v20.0/{phone_id}"
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=10)
        res_data = resp.json()
        if resp.status_code == 200:
            return {
                "success": True,
                "is_live": True,
                "message": "Connected successfully to Meta WhatsApp Cloud API!",
                "details": {
                    "phone_number": res_data.get("display_phone_number"),
                    "verified_name": res_data.get("verified_name"),
                    "quality_rating": res_data.get("quality_rating"),
                    "id": res_data.get("id")
                }
            }
        else:
            err_msg = res_data.get("error", {}).get("message", resp.text)
            return {
                "success": False,
                "is_live": False,
                "message": f"Meta API error: {err_msg}",
                "details": res_data
            }
    except Exception as e:
        return {
            "success": False,
            "is_live": False,
            "message": f"Network error connecting to Meta Graph API: {str(e)}"
        }
