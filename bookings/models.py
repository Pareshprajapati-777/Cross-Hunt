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

    # Prompt Requirement #10: Clear Profit & Payout Tracking
    # Customer Paid - Owner Payout - Refund/Discount = Platform Profit
    owner_payout_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, help_text="Payout to owner (INR)")
    platform_commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, help_text="Platform commission (INR)")
    net_platform_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, help_text="Platform net profit (INR)")

    # Prompt Requirement #12 & #13: QR Verification Token & Ticket Lifecycle
    ticket_code = models.CharField(max_length=64, blank=True, default='', db_index=True, help_text="Public ticket / boarding pass code")
    ticket_status = models.CharField(
        max_length=20,
        choices=[
            ('VALID', 'Valid Boarding Pass'),
            ('USED', 'Used / Boarded'),
            ('CANCELLED', 'Cancelled'),
            ('EXPIRED', 'Expired')
        ],
        default='VALID',
        db_index=True
    )

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
    # WhatsApp Tour Reminders (Prompt Requirement)
    customer_whatsapp = models.CharField(
        max_length=30,
        blank=True,
        default='',
        help_text="Customer WhatsApp mobile for voyage updates and 24h reminders"
    )
    whatsapp_reminder_opt_in = models.BooleanField(
        default=True,
        help_text="Customer consent for automated WhatsApp tour reminders"
    )
    whatsapp_reminder_sent = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether the departure reminder has been dispatched via WhatsApp API"
    )
    whatsapp_reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when WhatsApp reminder was sent"
    )
    whatsapp_reminder_status = models.CharField(
        max_length=20,
        choices=[
            ('SCHEDULED', 'Scheduled (Awaiting departure window)'),
            ('SENT', 'Dispatched Successfully'),
            ('FAILED', 'Failed to Send'),
            ('OPTED_OUT', 'Customer Opted Out'),
        ],
        default='SCHEDULED',
        db_index=True
    )
    whatsapp_reminder_message_id = models.CharField(
        max_length=120,
        blank=True,
        default='',
        help_text="Provider message tracking ID"
    )
    whatsapp_reminder_error = models.TextField(blank=True, default='')
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
        if not self.ticket_code:
            clean_token = (self.booking_id or uuid.uuid4().hex).replace('CRS-', '').replace('-', '')[:8].upper()
            self.ticket_code = f"TK-{clean_token}"
        if not self.subtotal:
            self.subtotal = self.total_price
        # Auto-calculate profit breakdown if unset
        if not self.owner_payout_amount or self.owner_payout_amount == 0:
            from decimal import Decimal
            sub_dec = Decimal(str(self.subtotal or self.total_price or 0))
            self.owner_payout_amount = Decimal(str(round(float(sub_dec) * 0.85, 2)))
            self.platform_commission_amount = Decimal(str(round(float(sub_dec) * 0.15, 2)))
            tot_dec = Decimal(str(self.total_price or 0))
            disc_dec = Decimal(str(self.discount_amount or 0))
            self.net_platform_profit = max(Decimal('0.00'), tot_dec - self.owner_payout_amount - disc_dec)
        if self.status == 'CANCELLED':
            self.ticket_status = 'CANCELLED'
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


class SystemSetting(models.Model):
    key = models.CharField(max_length=60, unique=True, db_index=True)
    value = models.TextField(default='')
    description = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return f"{self.key}: {self.value}"

    @classmethod
    def get_setting(cls, key, default=''):
        obj = cls.objects.filter(key=key).first()
        return obj.value if obj else default

    @classmethod
    def set_setting(cls, key, value, description=''):
        obj, _ = cls.objects.update_or_create(
            key=key,
            defaults={'value': str(value), 'description': description}
        )
        return obj


class WhatsAppMessageLog(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='whatsapp_logs', null=True, blank=True)
    recipient = models.CharField(max_length=30, help_text="Recipient WhatsApp number E.164")
    customer_name = models.CharField(max_length=120, default='', blank=True)
    message_type = models.CharField(max_length=30, default='TOUR_REMINDER')
    message_body = models.TextField()
    provider = models.CharField(max_length=30, default='META_CLOUD')
    provider_message_id = models.CharField(max_length=120, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=[
            ('SENT', 'Sent'),
            ('DELIVERED', 'Delivered'),
            ('FAILED', 'Failed'),
        ],
        default='SENT'
    )
    error_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "WhatsApp Message Log"
        verbose_name_plural = "WhatsApp Message Logs"

    def __str__(self):
        return f"WA to {self.recipient} ({self.message_type}) - {self.status}"

