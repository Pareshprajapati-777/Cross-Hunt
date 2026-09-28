import uuid
from datetime import datetime, date, time
from django.db import models
from django.conf import settings
from django.utils import timezone


class Booking(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Confirmation'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    )

    booking_id = models.CharField(max_length=32, unique=True, editable=False, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    cross = models.ForeignKey('crosses.Cross', on_delete=models.CASCADE, related_name='bookings')
    
    booking_date = models.DateField(help_text="Target date of booking")
    start_time = models.TimeField(help_text="Start time of slot")
    end_time = models.TimeField(help_text="End time of slot")
    
    # Cruise Tour & Event Enhancements
    booking_type = models.CharField(
        max_length=20,
        choices=[('TOUR', 'Cruise Tour & Travel Ticket'), ('EVENT', 'Private Maritime Event')],
        default='TOUR'
    )
    cabin_type = models.CharField(max_length=80, blank=True, default='Royal Balcony Stateroom')
    event_type = models.CharField(max_length=80, blank=True, null=True, help_text="Wedding, Birthday, Corporate, Gala Dinner, Conference")
    event_package = models.CharField(max_length=80, blank=True, null=True, help_text="Sapphire Anchor, Emerald Wave, Diamond Horizon")
    qr_code_hash = models.CharField(max_length=64, blank=True, null=True, editable=False)

    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Hourly base price at booking time")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Calculated total price on server")
    
    number_of_people = models.PositiveIntegerField(default=1)
    special_request = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cross', 'booking_date', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.booking_id:
            # Generate a realistic unique reference, e.g. CRS-2026-XXXXXX
            year = timezone.now().year if timezone.is_aware(timezone.now()) else date.today().year
            unique_hex = uuid.uuid4().hex[:6].upper()
            self.booking_id = f"CRS-{year}-{unique_hex}"
            while Booking.objects.filter(booking_id=self.booking_id).exists():
                unique_hex = uuid.uuid4().hex[:6].upper()
                self.booking_id = f"CRS-{year}-{unique_hex}"
        if not self.qr_code_hash:
            import hashlib
            self.qr_code_hash = hashlib.sha256(f"{self.booking_id}:{self.booking_date}:{uuid.uuid4().hex}".encode()).hexdigest()[:16].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_id} - {self.cross.name} ({self.status})"

    @property
    def is_upcoming(self):
        """Checks if booking slot is today or future."""
        today = date.today()
        if self.booking_date > today:
            return True
        elif self.booking_date == today:
            return self.start_time > datetime.now().time()
        return False

    @property
    def is_cancellable(self):
        """Booking can be cancelled by user if status is PENDING or CONFIRMED and slot is not in the past."""
        if self.status in ['PENDING', 'CONFIRMED'] and self.is_upcoming:
            return True
        return False

    @property
    def can_be_reviewed(self):
        """Only completed bookings without an existing review can be reviewed."""
        if self.status == 'COMPLETED':
            return not hasattr(self, 'review')
        return False
