from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from accounts.decorators import role_required, owner_required, admin_required
from crosses.models import Cross
from bookings.models import Booking

User = get_user_model()


@login_required
def user_dashboard_view(request):
    if request.user.role == 'CROSS_OWNER':
        return redirect('owner_dashboard')
    elif request.user.role == 'ADMIN' or request.user.is_superuser:
        return redirect('admin_dashboard')

    user = request.user
    bookings = Booking.objects.filter(user=user).select_related('cross')

    total_bookings = bookings.count()
    upcoming_bookings = [b for b in bookings if b.is_upcoming and b.status in ['PENDING', 'CONFIRMED']]
    completed_bookings = bookings.filter(status='COMPLETED')
    cancelled_bookings = bookings.filter(status='CANCELLED')

    recent_bookings = bookings.order_by('-created_at')[:6]

    context = {
        'total_bookings': total_bookings,
        'upcoming_count': len(upcoming_bookings),
        'completed_count': completed_bookings.count(),
        'cancelled_count': cancelled_bookings.count(),
        'recent_bookings': recent_bookings,
        'upcoming_bookings': upcoming_bookings[:3],
    }
    return render(request, 'dashboard/user_dashboard.html', context)


@login_required
@owner_required
def owner_dashboard_view(request):
    user = request.user
    crosses = Cross.objects.filter(owner=user)
    bookings = Booking.objects.filter(cross__owner=user).select_related('cross', 'user')

    total_crosses = crosses.count()
    active_crosses = crosses.filter(is_active=True).count()
    total_bookings = bookings.count()
    pending_bookings = bookings.filter(status='PENDING').count()
    confirmed_bookings = bookings.filter(status='CONFIRMED').count()

    # Revenue sum from confirmed or completed bookings
    earnings = bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or 0

    recent_crosses = crosses.order_by('-created_at')[:5]
    recent_bookings = bookings.order_by('-created_at')[:6]

    context = {
        'total_crosses': total_crosses,
        'active_crosses': active_crosses,
        'total_bookings': total_bookings,
        'pending_bookings': pending_bookings,
        'confirmed_bookings': confirmed_bookings,
        'earnings': earnings,
        'recent_crosses': recent_crosses,
        'recent_bookings': recent_bookings,
    }
    return render(request, 'dashboard/owner_dashboard.html', context)


@login_required
@admin_required
def admin_dashboard_view(request):
    total_users = User.objects.filter(role='USER').count()
    total_owners = User.objects.filter(role='CROSS_OWNER').count()
    total_crosses = Cross.objects.count()
    active_crosses = Cross.objects.filter(is_active=True).count()
    
    all_bookings = Booking.objects.all()
    total_bookings = all_bookings.count()
    pending_bookings = all_bookings.filter(status='PENDING').count()
    confirmed_bookings = all_bookings.filter(status='CONFIRMED').count()
    cancelled_bookings = all_bookings.filter(status='CANCELLED').count()

    total_revenue = all_bookings.filter(status__in=['CONFIRMED', 'COMPLETED']).aggregate(Sum('total_price'))['total_price__sum'] or 0

    recent_bookings = all_bookings.select_related('user', 'cross').order_by('-created_at')[:7]
    recent_users = User.objects.order_by('-date_joined')[:5]

    context = {
        'total_users': total_users,
        'total_owners': total_owners,
        'total_crosses': total_crosses,
        'active_crosses': active_crosses,
        'total_bookings': total_bookings,
        'pending_bookings': pending_bookings,
        'confirmed_bookings': confirmed_bookings,
        'cancelled_bookings': cancelled_bookings,
        'total_revenue': total_revenue,
        'recent_bookings': recent_bookings,
        'recent_users': recent_users,
    }
    return render(request, 'dashboard/admin_dashboard.html', context)


@login_required
@admin_required
def admin_users_view(request):
    q = request.GET.get('q', '').strip()
    users = User.objects.filter(role='USER').order_by('-date_joined')
    if q:
        users = users.filter(
            Q(username__icontains=q) |
            Q(email__icontains=q) |
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q)
        )
    return render(request, 'dashboard/admin_users.html', {'users': users, 'q': q})


@login_required
@admin_required
def admin_user_toggle_view(request, user_id):
    user_obj = get_object_or_404(User, id=user_id)
    if user_obj.is_superuser:
        messages.error(request, "Superusers cannot be deactivated.")
    else:
        user_obj.is_active = not user_obj.is_active
        user_obj.save()
        status_str = "activated" if user_obj.is_active else "deactivated"
        messages.success(request, f"User {user_obj.username} has been {status_str}.")
    return redirect('admin_users')


@login_required
@admin_required
def admin_owners_view(request):
    q = request.GET.get('q', '').strip()
    owners = User.objects.filter(role='CROSS_OWNER').annotate(cross_count=Count('crosses')).order_by('-date_joined')
    if q:
        owners = owners.filter(
            Q(username__icontains=q) |
            Q(email__icontains=q) |
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q)
        )
    return render(request, 'dashboard/admin_owners.html', {'owners': owners, 'q': q})


@login_required
@admin_required
def admin_owner_toggle_approval_view(request, owner_id):
    owner = get_object_or_404(User, id=owner_id, role='CROSS_OWNER')
    owner.is_approved_owner = not owner.is_approved_owner
    owner.save()
    status_str = "approved" if owner.is_approved_owner else "unapproved"
    messages.success(request, f"Owner {owner.username} status set to {status_str}.")
    return redirect('admin_owners')


@login_required
@admin_required
def admin_crosses_view(request):
    q = request.GET.get('q', '').strip()
    crosses = Cross.objects.select_related('owner').order_by('-created_at')
    if q:
        crosses = crosses.filter(
            Q(name__icontains=q) |
            Q(location__icontains=q) |
            Q(owner__username__icontains=q)
        )
    return render(request, 'dashboard/admin_crosses.html', {'crosses': crosses, 'q': q})


@login_required
@admin_required
def admin_cross_toggle_view(request, cross_id):
    cross = get_object_or_404(Cross, id=cross_id)
    cross.is_active = not cross.is_active
    cross.save()
    status_str = "activated" if cross.is_active else "deactivated"
    messages.success(request, f"Cross '{cross.name}' has been {status_str}.")
    return redirect('admin_crosses')


@login_required
@admin_required
def admin_cross_delete_view(request, cross_id):
    cross = get_object_or_404(Cross, id=cross_id)
    if request.method == 'POST':
        name = cross.name
        cross.delete()
        messages.success(request, f"Cross '{name}' was deleted by admin.")
    return redirect('admin_crosses')


@login_required
@admin_required
def admin_bookings_view(request):
    status_filter = request.GET.get('status', 'all')
    date_filter = request.GET.get('date', '').strip()
    bookings = Booking.objects.select_related('user', 'cross').order_by('-created_at')

    if status_filter != 'all':
        bookings = bookings.filter(status=status_filter.upper())

    if date_filter:
        bookings = bookings.filter(booking_date=date_filter)

    return render(request, 'dashboard/admin_bookings.html', {
        'bookings': bookings,
        'status_filter': status_filter,
        'date_filter': date_filter
    })


@login_required
@admin_required
def admin_booking_cancel_view(request, booking_id):
    booking = get_object_or_404(Booking, booking_id=booking_id)
    if request.method == 'POST':
        booking.status = 'CANCELLED'
        booking.cancellation_reason = "Cancelled by System Administrator"
        booking.save()
        messages.success(request, f"Booking {booking.booking_id} was cancelled by admin.")
    return redirect('admin_bookings')
