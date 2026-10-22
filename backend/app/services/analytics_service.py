from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.models.user import User
from backend.app.models.operator import Operator
from backend.app.models.cross import Cross
from backend.app.models.tour import PublicTour
from backend.app.models.booking import Booking


def get_admin_analytics_data(
    db: Session,
    range_param: str = "30d",
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    granularity: str = "auto"
) -> Dict[str, Any]:
    today = date.today()

    if range_param == "7d":
        start_date = today - timedelta(days=7)
        end_date = today
        granularity = "daily" if granularity == "auto" else granularity
    elif range_param == "30d":
        start_date = today - timedelta(days=30)
        end_date = today
        granularity = "daily" if granularity == "auto" else granularity
    elif range_param == "6m":
        start_date = today - timedelta(days=180)
        end_date = today
        granularity = "monthly" if granularity == "auto" else granularity
    elif range_param == "1y":
        start_date = today - timedelta(days=365)
        end_date = today
        granularity = "monthly" if granularity == "auto" else granularity
    elif range_param == "custom" and custom_start and custom_end:
        start_date = custom_start
        end_date = custom_end
        span_days = max(1, (end_date - start_date).days)
        granularity = "daily" if span_days <= 35 else ("weekly" if span_days <= 120 else "monthly") if granularity == "auto" else granularity
    else:  # 'all'
        min_date_row = db.query(func.min(Booking.booking_date)).scalar()
        start_date = min_date_row or today
        end_date = today + timedelta(days=365)
        granularity = "monthly" if granularity == "auto" else granularity

    all_bookings = db.query(Booking).all()
    all_confirmed = [b for b in all_bookings if b.status in ("CONFIRMED", "COMPLETED")]

    # Global DB stats
    users_count = db.query(User).filter(User.role.in_(["USER", "CUSTOMER"])).count()
    owners_count = db.query(User).filter(User.role.in_(["OWNER", "CROSS_OWNER", "OPERATOR"])).count()
    ships_count = db.query(Cross).count()
    active_ships_count = db.query(Cross).filter(Cross.is_active == True).count()
    external_operators_count = db.query(Operator).count()
    tours_count = db.query(PublicTour).count()

    # Exact Profit Formula: Gross Revenue - Owner Payout - Refund/Discount = Platform Profit
    gross_rev = sum([Decimal(str(b.total_price or 0)) for b in all_confirmed]) if all_confirmed else Decimal("0.00")
    owner_payout = sum([Decimal(str(b.owner_payout_amount or 0)) for b in all_confirmed]) if all_confirmed else Decimal("0.00")
    discount_amount = sum([Decimal(str(b.discount_amount or 0)) for b in all_confirmed]) if all_confirmed else Decimal("0.00")
    platform_profit = gross_rev - owner_payout - discount_amount

    # Period filtered bookings
    period_bookings = [b for b in all_bookings if start_date <= b.booking_date <= end_date]
    period_confirmed = [b for b in period_bookings if b.status in ("CONFIRMED", "COMPLETED")]

    p_gross_rev = sum([Decimal(str(b.total_price or 0)) for b in period_confirmed]) if period_confirmed else Decimal("0.00")
    p_owner_payout = sum([Decimal(str(b.owner_payout_amount or 0)) for b in period_confirmed]) if period_confirmed else Decimal("0.00")
    p_discount = sum([Decimal(str(b.discount_amount or 0)) for b in period_confirmed]) if period_confirmed else Decimal("0.00")
    p_profit = p_gross_rev - p_owner_payout - p_discount

    private_count = sum(1 for b in all_bookings if b.booking_type == "EVENT")
    public_tickets_count = sum([b.number_of_people for b in all_confirmed if b.booking_type == "TOUR"])
    cancellations_count = sum(1 for b in all_bookings if b.status == "CANCELLED")
    cancellation_rate = round((cancellations_count / max(1, len(all_bookings))) * 100, 1)

    kpis = {
        "total_users": users_count,
        "total_owners": owners_count,
        "total_ships": ships_count,
        "active_ships": active_ships_count,
        "external_operators": external_operators_count,
        "private_bookings": private_count,
        "public_tours": tours_count,
        "public_tickets": public_tickets_count,
        "gross_revenue": float(gross_rev),
        "owner_payout": float(owner_payout),
        "discount_amount": float(discount_amount),
        "refunds_discounts": float(discount_amount),
        "platform_profit": float(platform_profit),
        "cancellations": cancellations_count,
        "cancellation_rate": cancellation_rate,
        # Period specific
        "period_gross_revenue": float(p_gross_rev),
        "period_owner_payout": float(p_owner_payout),
        "period_discount": float(p_discount),
        "period_platform_profit": float(p_profit),
        "period_bookings_count": len(period_bookings),
        "period_private_count": sum(1 for b in period_bookings if b.booking_type == "EVENT"),
        "period_tour_count": sum(1 for b in period_bookings if b.booking_type == "TOUR"),
        "period_tickets": sum([b.number_of_people for b in period_confirmed if b.booking_type == "TOUR"]),
        "period_cancellations": sum(1 for b in period_bookings if b.status == "CANCELLED"),
    }

    # 1. Revenue Trend
    revenue_trend = []
    if granularity == "daily":
        days_count = max(1, (end_date - start_date).days + 1)
        for i in range(days_count):
            day = start_date + timedelta(days=i)
            day_bookings = [b for b in period_confirmed if b.booking_date == day]
            day_rev = sum([Decimal(str(b.total_price or 0)) for b in day_bookings])
            day_payout = sum([Decimal(str(b.owner_payout_amount or 0)) for b in day_bookings])
            day_disc = sum([Decimal(str(b.discount_amount or 0)) for b in day_bookings])
            day_profit = day_rev - day_payout - day_disc
            revenue_trend.append({
                "date": day.strftime("%Y-%m-%d"),
                "label": day.strftime("%d %b"),
                "gross_revenue": float(day_rev),
                "owner_payout": float(day_payout),
                "discount_amount": float(day_disc),
                "platform_profit": float(day_profit),
                "bookings_count": len(day_bookings),
            })
    elif granularity == "weekly":
        curr = start_date
        while curr <= end_date:
            w_end = min(end_date, curr + timedelta(days=6))
            w_bookings = [b for b in period_confirmed if curr <= b.booking_date <= w_end]
            w_rev = sum([Decimal(str(b.total_price or 0)) for b in w_bookings])
            w_payout = sum([Decimal(str(b.owner_payout_amount or 0)) for b in w_bookings])
            w_disc = sum([Decimal(str(b.discount_amount or 0)) for b in w_bookings])
            w_profit = w_rev - w_payout - w_disc
            revenue_trend.append({
                "date": curr.strftime("%Y-%m-%d"),
                "label": f"{curr.strftime('%d %b')} - {w_end.strftime('%d %b')}",
                "gross_revenue": float(w_rev),
                "owner_payout": float(w_payout),
                "discount_amount": float(w_disc),
                "platform_profit": float(w_profit),
                "bookings_count": len(w_bookings),
            })
            curr = w_end + timedelta(days=1)
    else:  # monthly
        for m in range(1, 13):
            m_bookings = [b for b in all_confirmed if b.booking_date.year == today.year and b.booking_date.month == m]
            m_rev = sum([Decimal(str(b.total_price or 0)) for b in m_bookings])
            m_payout = sum([Decimal(str(b.owner_payout_amount or 0)) for b in m_bookings])
            m_disc = sum([Decimal(str(b.discount_amount or 0)) for b in m_bookings])
            m_profit = m_rev - m_payout - m_disc
            revenue_trend.append({
                "date": f"{today.year}-{m:02d}-01",
                "label": date(today.year, m, 1).strftime("%b %Y"),
                "gross_revenue": float(m_rev),
                "owner_payout": float(m_payout),
                "discount_amount": float(m_disc),
                "platform_profit": float(m_profit),
                "bookings_count": len(m_bookings),
            })

    # 2. Platform Profit Trend
    platform_profit_trend = []
    for m in range(1, 13):
        m_bookings = [b for b in all_confirmed if b.booking_date.year == today.year and b.booking_date.month == m]
        m_rev = sum([Decimal(str(b.total_price or 0)) for b in m_bookings])
        m_payout = sum([Decimal(str(b.owner_payout_amount or 0)) for b in m_bookings])
        m_disc = sum([Decimal(str(b.discount_amount or 0)) for b in m_bookings])
        m_profit = m_rev - m_payout - m_disc
        margin_pct = round((float(m_profit) / float(m_rev) * 100), 1) if m_rev > Decimal("0.00") else 0.0
        platform_profit_trend.append({
            "month": date(today.year, m, 1).strftime("%b"),
            "month_label": date(today.year, m, 1).strftime("%b %Y"),
            "gross_revenue": float(m_rev),
            "owner_payout": float(m_payout),
            "discount_amount": float(m_disc),
            "platform_profit": float(m_profit),
            "margin_percentage": margin_pct,
            "bookings_count": len(m_bookings)
        })

    # 3. Bookings (Private vs Public)
    priv_period = [b for b in period_confirmed if b.booking_type == "EVENT"]
    tour_period = [b for b in period_confirmed if b.booking_type == "TOUR"]
    priv_rev = sum([Decimal(str(b.total_price or 0)) for b in priv_period])
    tour_rev = sum([Decimal(str(b.total_price or 0)) for b in tour_period])
    priv_tickets = sum([b.number_of_people for b in priv_period])
    tour_tickets = sum([b.number_of_people for b in tour_period])
    total_period_count = max(1, len(priv_period) + len(tour_period))

    bookings_private_vs_public = {
        "private": {
            "count": len(priv_period),
            "revenue": float(priv_rev),
            "tickets": priv_tickets,
            "percentage": round((len(priv_period) / total_period_count) * 100, 1),
            "revenue_percentage": round((float(priv_rev) / max(1.0, float(priv_rev + tour_rev))) * 100, 1)
        },
        "public": {
            "count": len(tour_period),
            "revenue": float(tour_rev),
            "tickets": tour_tickets,
            "percentage": round((len(tour_period) / total_period_count) * 100, 1),
            "revenue_percentage": round((float(tour_rev) / max(1.0, float(priv_rev + tour_rev))) * 100, 1)
        }
    }

    # 4. Ship Performance
    ship_dict: Dict[int, Dict[str, Any]] = {}
    for b in period_confirmed:
        if not b.cross:
            continue
        sid = b.cross_id
        if sid not in ship_dict:
            ship_dict[sid] = {
                "ship_id": sid,
                "ship_name": b.cross.name,
                "location": b.cross.location,
                "category": b.cross.effective_category,
                "bookings_count": 0,
                "revenue": Decimal("0.00"),
                "payout": Decimal("0.00"),
                "discount": Decimal("0.00"),
                "image_url": b.cross.display_image_url
            }
        ship_dict[sid]["bookings_count"] += 1
        ship_dict[sid]["revenue"] += Decimal(str(b.total_price or 0))
        ship_dict[sid]["payout"] += Decimal(str(b.owner_payout_amount or 0))
        ship_dict[sid]["discount"] += Decimal(str(b.discount_amount or 0))

    sorted_ships = sorted(ship_dict.values(), key=lambda s: (s["revenue"], s["bookings_count"]), reverse=True)[:10]
    ship_performance = []
    for s in sorted_ships:
        prof = s["revenue"] - s["payout"] - s["discount"]
        ship_performance.append({
            "ship_id": s["ship_id"],
            "ship_name": s["ship_name"],
            "location": s["location"],
            "category": s["category"],
            "bookings_count": s["bookings_count"],
            "revenue": float(s["revenue"]),
            "owner_payout": float(s["payout"]),
            "platform_profit": float(prof),
            "image_url": s["image_url"]
        })

    # 5. Destination Analysis
    dest_dict: Dict[str, Dict[str, Any]] = {}
    for b in period_confirmed:
        dest_name = (b.cross.destination if b.cross else "") or "Arabian Sea"
        if dest_name not in dest_dict:
            dest_dict[dest_name] = {"destination": dest_name, "bookings_count": 0, "revenue": Decimal("0.00")}
        dest_dict[dest_name]["bookings_count"] += 1
        dest_dict[dest_name]["revenue"] += Decimal(str(b.total_price or 0))

    sorted_dests = sorted(dest_dict.values(), key=lambda d: (d["bookings_count"], d["revenue"]), reverse=True)[:10]
    tot_dest_rev = sum([d["revenue"] for d in sorted_dests]) or Decimal("1.00")
    destination_analysis = []
    for d in sorted_dests:
        destination_analysis.append({
            "destination": d["destination"],
            "bookings_count": d["bookings_count"],
            "revenue": float(d["revenue"]),
            "share_percentage": round((float(d["revenue"]) / float(tot_dest_rev)) * 100, 1)
        })

    # 6. Public Tour Occupancy
    tours_all = db.query(PublicTour).all()
    total_tour_cap = sum([t.total_capacity for t in tours_all]) or 0
    booked_tour_cap = sum([t.booked_capacity for t in tours_all]) or 0
    avg_occupancy = round((booked_tour_cap / max(1, total_tour_cap)) * 100, 1)

    tours_occupancy_list = []
    for t in tours_all[:12]:
        t_bookings = [b for b in all_confirmed if b.public_tour_id == t.id]
        t_rev = sum([Decimal(str(b.total_price or 0)) for b in t_bookings])
        occ_pct = round((t.booked_capacity / max(1, t.total_capacity)) * 100, 1)
        tours_occupancy_list.append({
            "tour_id": t.id,
            "tour_title": t.tour_title,
            "ship_name": t.ship.name if t.ship else "Tour Vessel",
            "departure_date": t.departure_date.strftime("%Y-%m-%d"),
            "total_capacity": t.total_capacity,
            "booked_capacity": t.booked_capacity,
            "remaining_capacity": t.remaining_capacity,
            "occupancy_percentage": occ_pct,
            "revenue": float(t_rev),
            "status": t.status
        })

    public_tour_occupancy = {
        "total_capacity": total_tour_cap,
        "booked_capacity": booked_tour_cap,
        "remaining_capacity": max(0, total_tour_cap - booked_tour_cap),
        "average_occupancy_rate": avg_occupancy,
        "tours": tours_occupancy_list
    }

    # 7. Booking Status Breakdown
    status_order = ["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"]
    status_labels = {
        "CONFIRMED": "Confirmed",
        "PENDING": "Pending Confirmation",
        "COMPLETED": "Voyage Completed",
        "CANCELLED": "Cancelled",
    }
    status_colors = {
        "CONFIRMED": "#10B981",
        "PENDING": "#F59E0B",
        "COMPLETED": "#3B82F6",
        "CANCELLED": "#EF4444",
    }
    status_breakdown = []
    tot_status_bookings = max(1, len(period_bookings))
    for st in status_order:
        st_bookings = [b for b in period_bookings if b.status == st]
        st_count = len(st_bookings)
        st_rev = sum([Decimal(str(b.total_price or 0)) for b in st_bookings])
        status_breakdown.append({
            "status": st,
            "label": status_labels.get(st, st),
            "count": st_count,
            "revenue": float(st_rev),
            "share_percentage": round((st_count / tot_status_bookings) * 100, 1),
            "color": status_colors.get(st, "#6B7280")
        })

    # 8. Revenue by Ship
    rev_by_ship = []
    tot_ship_rev = max(Decimal("1.00"), sum([Decimal(str(item["revenue"])) for item in ship_performance]))
    for item in ship_performance:
        rev_by_ship.append({
            "ship_id": item["ship_id"],
            "ship_name": item["ship_name"],
            "category": item["category"],
            "revenue": item["revenue"],
            "bookings_count": item["bookings_count"],
            "share_percentage": round((Decimal(str(item["revenue"])) / tot_ship_rev) * Decimal("100.0"), 1)
        })

    # 9. Revenue by Destination
    rev_by_destination = []
    for item in destination_analysis:
        rev_by_destination.append({
            "destination": item["destination"],
            "revenue": item["revenue"],
            "bookings_count": item["bookings_count"],
            "share_percentage": item["share_percentage"]
        })

    # 10. Monthly Growth
    monthly_growth = []
    prev_rev = None
    prev_cnt = None
    for item in platform_profit_trend:
        cur_rev = item["gross_revenue"]
        cur_cnt = item["bookings_count"]
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
            "month": item["month"],
            "month_label": item["month_label"],
            "revenue": cur_rev,
            "revenue_growth_percentage": rev_growth,
            "bookings_count": cur_cnt,
            "bookings_growth_percentage": cnt_growth,
            "profit": item["platform_profit"],
        })
        prev_rev = cur_rev
        prev_cnt = cur_cnt

    return {
        "success": True,
        "kpis": kpis,
        "date_range": {
            "selected_range": range_param,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "granularity": granularity
        },
        "charts": {
            "revenue_trend": revenue_trend,
            "platform_profit_trend": platform_profit_trend,
            "bookings_private_vs_public": bookings_private_vs_public,
            "ship_performance": ship_performance,
            "destination_analysis": destination_analysis,
            "public_tour_occupancy": public_tour_occupancy,
            "booking_status_breakdown": status_breakdown,
            "revenue_by_ship": rev_by_ship,
            "revenue_by_destination": rev_by_destination,
            "monthly_growth": monthly_growth,
        }
    }
