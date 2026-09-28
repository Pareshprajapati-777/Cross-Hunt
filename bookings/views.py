from datetime import datetime, date
from decimal import Decimal
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction
from django.core.exceptions import PermissionDenied
from accounts.decorators import owner_required, role_required
from crosses.models import Cross, CrossReview
from crosses.forms import CrossReviewForm
from .models import Booking
from .forms import BookingForm, CancelBookingForm


@login_required
def booking_create_view(request, slug):
    cross = get_object_or_404(Cross, slug=slug)

    # Disallow booking inactive crosses
    if not cross.is_active or not cross.is_approved:
        messages.error(request, "This Cross is currently not open for bookings.")
        return redirect('cross_detail', slug=cross.slug)

    # Disallow owner booking own cross
    if cross.owner == request.user and not request.user.is_superuser:
        messages.error(request, "As the owner of this Cross, you cannot book it yourself.")
        return redirect('cross_detail', slug=cross.slug)

    if request.method == 'POST':
        form = BookingForm(request.POST, cross=cross, user=request.user)
        if form.is_valid():
            booking_date = form.cleaned_data['booking_date']
            start_time = form.cleaned_data['start_time']
            end_time = form.cleaned_data['end_time']
            number_of_people = form.cleaned_data['number_of_people']
            special_request = form.cleaned_data['special_request']

            # Server-side duration calculation
            start_dt = datetime.combine(booking_date, start_time)
            end_dt = datetime.combine(booking_date, end_time)
            duration_seconds = (end_dt - start_dt).total_seconds()
            duration_hours = Decimal(str(round(duration_seconds / 3600.0, 2)))
            
            # Server-side total price calculation (never trusting frontend)
            base_price = cross.price
            total_price = Decimal(str(round(float(base_price) * float(duration_hours), 2)))

            # Atomic transaction and lock to prevent race condition double bookings
            with transaction.atomic():
                has_conflict = Booking.objects.select_for_update().filter(
                    cross=cross,
                    booking_date=booking_date,
                    status__in=['PENDING', 'CONFIRMED'],
                    start_time__lt=end_time,
                    end_time__gt=start_time
                ).exists()

                if has_conflict:
                    messages.error(request, "This Cross is already booked for the selected time slot. Please choose another time.")
                    return render(request, 'bookings/create.html', {'cross': cross, 'form': form})

                booking = Booking.objects.create(
                    user=request.user,
                    cross=cross,
                    booking_date=booking_date,
                    start_time=start_time,
                    end_time=end_time,
                    duration_hours=duration_hours,
                    base_price=base_price,
                    total_price=total_price,
                    number_of_people=number_of_people,
                    special_request=special_request,
                    status='PENDING'
                )

            messages.success(request, f"Booking request submitted successfully! Reference: {booking.booking_id}")
            return redirect('booking_confirmation', booking_id=booking.booking_id)
        else:
            messages.error(request, "Please resolve the errors highlighted below.")
    else:
        # Prepopulate with query params if passed from detail page
        initial_data = {}
        if request.GET.get('date'):
            initial_data['booking_date'] = request.GET.get('date')
        form = BookingForm(initial=initial_data, cross=cross, user=request.user)

    # Fetch existing active bookings on current day/upcoming to show taken slots
    today = date.today()
    booked_slots = Booking.objects.filter(
        cross=cross,
        booking_date__gte=today,
        status__in=['PENDING', 'CONFIRMED']
    ).order_by('booking_date', 'start_time')[:10]

    context = {
        'cross': cross,
        'form': form,
        'booked_slots': booked_slots,
    }
    return render(request, 'bookings/create.html', context)


@login_required
def booking_confirmation_view(request, booking_id):
    booking = get_object_or_404(Booking, booking_id=booking_id)
    # Ensure only the customer, cross owner, or admin can see
    if booking.user != request.user and booking.cross.owner != request.user and not request.user.is_superuser:
        raise PermissionDenied

    return render(request, 'bookings/confirmation.html', {'booking': booking})


@login_required
def booking_detail_view(request, booking_id):
    booking = get_object_or_404(Booking, booking_id=booking_id)
    if booking.user != request.user and booking.cross.owner != request.user and not request.user.is_superuser:
        raise PermissionDenied

    cancel_form = CancelBookingForm()
    return render(request, 'bookings/detail.html', {
        'booking': booking,
        'cancel_form': cancel_form,
    })


@login_required
def booking_cancel_view(request, booking_id):
    booking = get_object_or_404(Booking, booking_id=booking_id)

    # Permission: booking creator or admin
    if booking.user != request.user and not request.user.is_superuser:
        messages.error(request, "You are not authorized to cancel this booking.")
        return redirect('dashboard_redirect')

    if not booking.is_cancellable:
        messages.error(request, "This booking cannot be cancelled because it is in the past or already finalized.")
        return redirect('booking_detail', booking_id=booking.booking_id)

    if request.method == 'POST':
        form = CancelBookingForm(request.POST)
        if form.is_valid():
            booking.status = 'CANCELLED'
            booking.cancellation_reason = form.cleaned_data.get('reason')
            booking.save()
            messages.success(request, f"Booking {booking.booking_id} has been cancelled successfully.")
            return redirect('my_bookings')

    return redirect('booking_detail', booking_id=booking.booking_id)


@login_required
def my_bookings_view(request):
    status_filter = request.GET.get('status', 'all')
    bookings = Booking.objects.filter(user=request.user).select_related('cross')

    if status_filter != 'all':
        bookings = bookings.filter(status=status_filter.upper())

    bookings = bookings.order_by('-booking_date', '-start_time')

    context = {
        'bookings': bookings,
        'status_filter': status_filter,
    }
    return render(request, 'bookings/my_bookings.html', context)


@login_required
@owner_required
def owner_bookings_view(request):
    status_filter = request.GET.get('status', 'all')
    bookings = Booking.objects.filter(cross__owner=request.user).select_related('cross', 'user')

    if status_filter != 'all':
        bookings = bookings.filter(status=status_filter.upper())

    bookings = bookings.order_by('-booking_date', '-start_time')

    context = {
        'bookings': bookings,
        'status_filter': status_filter,
    }
    return render(request, 'bookings/owner_bookings.html', context)


@login_required
@owner_required
def owner_booking_action_view(request, booking_id, action):
    booking = get_object_or_404(Booking, booking_id=booking_id)

    # Ensure ownership
    if booking.cross.owner != request.user and not request.user.is_superuser:
        messages.error(request, "You can only manage bookings for your own Cross properties.")
        return redirect('owner_bookings')

    if request.method == 'POST':
        if action == 'confirm':
            if booking.status in ['PENDING', 'REJECTED']:
                # Re-check potential conflicts before confirming
                conflict = Booking.objects.filter(
                    cross=booking.cross,
                    booking_date=booking.booking_date,
                    status='CONFIRMED',
                    start_time__lt=booking.end_time,
                    end_time__gt=booking.start_time
                ).exclude(pk=booking.pk).exists()

                if conflict:
                    messages.error(request, "Cannot confirm: a conflicting confirmed booking already exists for this slot.")
                else:
                    booking.status = 'CONFIRMED'
                    booking.save()
                    messages.success(request, f"Booking {booking.booking_id} has been confirmed!")
        elif action == 'reject':
            booking.status = 'REJECTED'
            booking.save()
            messages.warning(request, f"Booking {booking.booking_id} has been rejected.")
        elif action == 'complete':
            booking.status = 'COMPLETED'
            booking.save()
            messages.success(request, f"Booking {booking.booking_id} marked as completed.")
        else:
            messages.error(request, "Invalid action requested.")

    return redirect('booking_detail', booking_id=booking.booking_id)


@login_required
def booking_printable_view(request, booking_id):
    booking = get_object_or_404(Booking, booking_id=booking_id)
    if booking.user != request.user and booking.cross.owner != request.user and not request.user.is_superuser:
        raise PermissionDenied

    return render(request, 'bookings/printable_ticket.html', {'booking': booking})


@login_required
def add_review_view(request, booking_id):
    booking = get_object_or_404(Booking, booking_id=booking_id)

    if booking.user != request.user:
        messages.error(request, "You can only review your own bookings.")
        return redirect('my_bookings')

    if booking.status != 'COMPLETED':
        messages.error(request, "Only completed bookings can be reviewed.")
        return redirect('booking_detail', booking_id=booking.booking_id)

    if hasattr(booking, 'review'):
        messages.info(request, "You have already submitted a review for this booking.")
        return redirect('cross_detail', slug=booking.cross.slug)

    if request.method == 'POST':
        form = CrossReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.booking = booking
            review.cross = booking.cross
            review.user = request.user
            review.save()
            messages.success(request, "Thank you for your rating and review!")
            return redirect('cross_detail', slug=booking.cross.slug)
    else:
        form = CrossReviewForm()

    return render(request, 'bookings/add_review.html', {
        'form': form,
        'booking': booking,
    })
