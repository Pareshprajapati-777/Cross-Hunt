from datetime import datetime, date, time
from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Booking
from crosses.models import Cross


class BookingForm(forms.ModelForm):
    booking_date = forms.DateField(
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        help_text="Select a date (today or future)"
    )
    start_time = forms.TimeField(
        widget=forms.TimeInput(attrs={'class': 'form-control', 'type': 'time'}),
        help_text="Start time (e.g. 10:00 AM)"
    )
    end_time = forms.TimeField(
        widget=forms.TimeInput(attrs={'class': 'form-control', 'type': 'time'}),
        help_text="End time (e.g. 02:00 PM)"
    )
    number_of_people = forms.IntegerField(
        min_value=1,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Expected guests / attendees'})
    )
    special_request = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Any specific seating, audio/visual, or entry requests (optional)...'})
    )

    class Meta:
        model = Booking
        fields = ['booking_date', 'start_time', 'end_time', 'number_of_people', 'special_request']

    def __init__(self, *args, **kwargs):
        self.cross = kwargs.pop('cross', None)
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def clean_booking_date(self):
        booking_date = self.cleaned_data.get('booking_date')
        today = date.today()
        if booking_date and booking_date < today:
            raise ValidationError("You cannot book a date in the past.")
        return booking_date

    def clean_number_of_people(self):
        number_of_people = self.cleaned_data.get('number_of_people')
        if self.cross and number_of_people:
            if number_of_people > self.cross.capacity:
                raise ValidationError(f"Number of attendees ({number_of_people}) exceeds maximum capacity of {self.cross.capacity} people.")
        return number_of_people

    def clean(self):
        cleaned_data = super().clean()
        booking_date = cleaned_data.get('booking_date')
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')

        if not (booking_date and start_time and end_time):
            return cleaned_data

        # Check past time if booking date is today
        now = datetime.now()
        today = date.today()
        if booking_date == today and start_time <= now.time():
            self.add_error('start_time', "Booking start time must be in the future.")

        # Check start before end
        if start_time >= end_time:
            self.add_error('end_time', "End time must be strictly after start time.")
            return cleaned_data

        # Duration validation (minimum 30 minutes)
        start_dt = datetime.combine(booking_date, start_time)
        end_dt = datetime.combine(booking_date, end_time)
        duration_minutes = (end_dt - start_dt).total_seconds() / 60.0
        if duration_minutes < 30:
            self.add_error('end_time', "Booking duration must be at least 30 minutes.")

        # Owner cannot book their own cross
        if self.cross and self.user and self.cross.owner == self.user:
            raise ValidationError("Cross owners cannot book their own Cross properties.")

        # Cross active status check
        if self.cross and (not self.cross.is_active or not self.cross.is_approved):
            raise ValidationError("This Cross property is currently not accepting new bookings.")

        # DOUBLE BOOKING CHECK
        # Conflict exists if an existing booking (PENDING or CONFIRMED) overlaps:
        # existing.start_time < new_end_time and existing.end_time > new_start_time
        if self.cross:
            conflicting_bookings = Booking.objects.filter(
                cross=self.cross,
                booking_date=booking_date,
                status__in=['PENDING', 'CONFIRMED']
            ).filter(
                start_time__lt=end_time,
                end_time__gt=start_time
            )

            # If editing existing booking, exclude self
            if self.instance and self.instance.pk:
                conflicting_bookings = conflicting_bookings.exclude(pk=self.instance.pk)

            if conflicting_bookings.exists():
                raise ValidationError("This Cross is already booked for the selected time. Please select another slot or date.")

        return cleaned_data


class CancelBookingForm(forms.Form):
    reason = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Optional reason for cancellation...'})
    )
