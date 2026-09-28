from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Avg, Count
from django.core.paginator import Paginator
from accounts.decorators import owner_required
from .models import Cross, CrossReview
from .forms import CrossForm, CrossReviewForm
from bookings.models import Booking


def home_view(request):
    featured_crosses = Cross.objects.filter(is_active=True, is_approved=True)[:6]
    
    # Real database statistics
    total_crosses_count = Cross.objects.filter(is_active=True).count()
    total_bookings_count = Booking.objects.count()
    locations_count = Cross.objects.filter(is_active=True).values('location').distinct().count()
    happy_users_count = Booking.objects.filter(status='COMPLETED').values('user').distinct().count()
    
    # Recent top reviews
    recent_reviews = CrossReview.objects.select_related('user', 'cross').order_by('-created_at')[:4]

    context = {
        'featured_crosses': featured_crosses,
        'total_crosses_count': total_crosses_count,
        'total_bookings_count': total_bookings_count,
        'locations_count': locations_count or 1,
        'happy_users_count': happy_users_count,
        'recent_reviews': recent_reviews,
    }
    return render(request, 'home.html', context)


def cross_list_view(request):
    queryset = Cross.objects.filter(is_active=True, is_approved=True)

    # Search query
    q = request.GET.get('q', '').strip()
    if q:
        queryset = queryset.filter(
            Q(name__icontains=q) |
            Q(description__icontains=q) |
            Q(location__icontains=q) |
            Q(facilities__icontains=q)
        )

    # Location filter
    location = request.GET.get('location', '').strip()
    if location:
        queryset = queryset.filter(location__icontains=location)

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

    # Capacity
    capacity = request.GET.get('capacity', '').strip()
    if capacity:
        try:
            queryset = queryset.filter(capacity__gte=int(capacity))
        except ValueError:
            pass

    # Sorting
    sort_by = request.GET.get('sort_by', 'newest')
    if sort_by == 'price_low':
        queryset = queryset.order_by('price')
    elif sort_by == 'price_high':
        queryset = queryset.order_by('-price')
    elif sort_by == 'rating':
        queryset = queryset.annotate(avg_rating=Avg('reviews__rating')).order_by('-avg_rating')
    else:
        queryset = queryset.order_by('-created_at')

    # Distinct locations for the dropdown
    available_locations = Cross.objects.filter(is_active=True).values_list('location', flat=True).distinct()

    # Pagination: 9 crosses per page
    paginator = Paginator(queryset, 9)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'crosses': page_obj.object_list,
        'total_results': queryset.count(),
        'available_locations': available_locations,
        'categories': Cross.CATEGORY_CHOICES,
        'q': q,
        'location': location,
        'category': category,
        'min_price': min_price,
        'max_price': max_price,
        'capacity': capacity,
        'sort_by': sort_by,
    }
    return render(request, 'crosses/list.html', context)


def cross_detail_view(request, slug):
    cross = get_object_or_404(Cross, slug=slug)
    reviews = cross.reviews.select_related('user', 'booking').order_by('-created_at')
    
    # Upcoming bookings count for this cross
    active_bookings_count = cross.bookings.filter(status__in=['PENDING', 'CONFIRMED']).count()
    
    context = {
        'cross': cross,
        'reviews': reviews,
        'facilities_list': cross.get_facilities_list(),
        'active_bookings_count': active_bookings_count,
    }
    return render(request, 'crosses/detail.html', context)


@login_required
@owner_required
def my_crosses_view(request):
    user_crosses = Cross.objects.filter(owner=request.user).order_by('-created_at')
    return render(request, 'crosses/my_crosses.html', {'crosses': user_crosses})


@login_required
@owner_required
def cross_create_view(request):
    if request.method == 'POST':
        form = CrossForm(request.POST, request.FILES)
        if form.is_valid():
            cross = form.save(commit=False)
            cross.owner = request.user
            cross.save()
            messages.success(request, f"Cross property '{cross.name}' was listed successfully!")
            return redirect('my_crosses')
        else:
            messages.error(request, "Failed to create cross. Please check form validation.")
    else:
        form = CrossForm()

    return render(request, 'crosses/form.html', {'form': form, 'title': 'Add New Cross Property'})


@login_required
@owner_required
def cross_update_view(request, pk):
    cross = get_object_or_404(Cross, pk=pk)

    # Permission check: only owner or superuser can edit
    if cross.owner != request.user and not request.user.is_superuser:
        messages.error(request, "Permission denied: You can only edit your own Cross listings.")
        return redirect('my_crosses')

    if request.method == 'POST':
        form = CrossForm(request.POST, request.FILES, instance=cross)
        if form.is_valid():
            form.save()
            messages.success(request, f"Cross property '{cross.name}' updated successfully.")
            return redirect('my_crosses')
        else:
            messages.error(request, "Failed to update listing. Please correct errors.")
    else:
        form = CrossForm(instance=cross)

    return render(request, 'crosses/form.html', {'form': form, 'cross': cross, 'title': f'Edit {cross.name}'})


@login_required
@owner_required
def cross_delete_view(request, pk):
    cross = get_object_or_404(Cross, pk=pk)

    if cross.owner != request.user and not request.user.is_superuser:
        messages.error(request, "Permission denied: You can only delete your own Cross properties.")
        return redirect('my_crosses')

    if request.method == 'POST':
        cross_name = cross.name
        cross.delete()
        messages.success(request, f"Cross '{cross_name}' was successfully deleted.")
        return redirect('my_crosses')

    return render(request, 'crosses/confirm_delete.html', {'cross': cross})


@login_required
@owner_required
def cross_toggle_status_view(request, pk):
    cross = get_object_or_404(Cross, pk=pk)
    if cross.owner != request.user and not request.user.is_superuser:
        messages.error(request, "Permission denied.")
        return redirect('my_crosses')

    if request.method == 'POST':
        cross.is_active = not cross.is_active
        cross.save()
        status_text = "activated" if cross.is_active else "deactivated"
        messages.info(request, f"Cross '{cross.name}' has been {status_text}.")

    return redirect('my_crosses')
