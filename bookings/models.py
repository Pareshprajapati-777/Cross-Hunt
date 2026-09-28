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
    invoice_number = models.CharField(max_length=32, unique=True, null=True, blank=True, editable=False, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    cross = models.ForeignKey('crosses.Cross', on_delete=models.CASCADE, related_name='bookings')
    public_tour = models.ForeignKey('crosses.PublicTour', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')

    booking_date = models.DateField(help_text="Target date of booking or tour embarkation")
    start_time = models.TimeField(help_text="Start time of slot or embarkation time")
    end_time = models.TimeField(help_text="End time of slot or disembarkation time")

    # Cruise Tour & Event Enhancements
    booking_type = models.CharField(
        max_length=20,
        choices=[
            ('TOUR', 'Public Cruise Tour Ticket'),
            ('EVENT', 'Private Ship Charter / Event')
        ],
        default='TOUR'
    )
    cabin_type = models.CharField(max_length=80, blank=True, default='Royal Balcony Stateroom')
    event_type = models.CharField(max_length=80, blank=True, null=True, help_text="Wedding, Birthday, Corporate, Gala Dinner, Conference")
    event_package = models.CharField(max_length=80, blank=True, null=True, help_text="Sapphire Anchor, Emerald Wave, Diamond Horizon")
    qr_code_hash = models.CharField(max_length=64, blank=True, null=True, editable=False)

    # Detailed Passenger Party
    number_of_people = models.PositiveIntegerField(default=1, help_text="Total passenger headcount")
    adults_count = models.PositiveIntegerField(default=1)
    children_count = models.PositiveIntegerField(default=0)

    # Selected Extras (stored snapshot for historical accuracy)
    selected_extras = models.JSONField(default=list, blank=True)

    # Financial breakdown in INR (₹)
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base rate at booking time")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    extras_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Final server-calculated amount in INR (₹)")
    promo_code = models.CharField(max_length=30, blank=True, null=True)

    special_request = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    tracking_status = models.CharField(
        max_length=30,
        choices=[
            ('BOOKED', 'Reservation Placed'),
            ('CONFIRMED', 'Booking Confirmed'),
            ('BOARDING', 'Boarding Now'),
            ('DEPARTED', 'Departed / In Transit'),
            ('ARRIVED', 'Arrived at Destination'),
            ('COMPLETED', 'Voyage Completed'),
            ('CANCELLED', 'Reservation Cancelled'),
        ],
        default='BOOKED'
    )
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cross', 'booking_date', 'status']),
            models.Index(fields=['public_tour', 'status']),
        ]

    def save(self, *args, **kwargs):
        year = timezone.now().year if timezone.is_aware(timezone.now()) else date.today().year
        if not self.booking_id:
            unique_hex = uuid.uuid4().hex[:6].upper()
            self.booking_id = f"CRS-{year}-{unique_hex}"
            while Booking.objects.filter(booking_id=self.booking_id).exists():
                unique_hex = uuid.uuid4().hex[:6].upper()
                self.booking_id = f"CRS-{year}-{unique_hex}"
        if not self.invoice_number:
            inv_hex = uuid.uuid4().hex[:6].upper()
            self.invoice_number = f"INV-{year}-{inv_hex}"
            while Booking.objects.filter(invoice_number=self.invoice_number).exists():
                inv_hex = uuid.uuid4().hex[:6].upper()
                self.invoice_number = f"INV-{year}-{inv_hex}"
        if not self.qr_code_hash:
            import hashlib
            self.qr_code_hash = hashlib.sha256(f"{self.booking_id}:{self.booking_date}:{uuid.uuid4().hex}".encode()).hexdigest()[:16].upper()
        if not self.subtotal:
            self.subtotal = self.total_price
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
