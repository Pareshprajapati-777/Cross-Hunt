from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.db.models import Avg


class Cross(models.Model):
    CATEGORY_CHOICES = (
        ('Luxury Ocean Cruise', 'Luxury Ocean Cruise'),
        ('Mega Cruise Liner', 'Mega Cruise Liner'),
        ('Expedition Cruise Vessel', 'Expedition Cruise Vessel'),
        ('Island Hopper Cruise', 'Island Hopper Cruise'),
        ('Scenic Coastal Cruise', 'Scenic Coastal Cruise'),
        ('Private Charter Yacht', 'Private Charter Yacht'),
        ('Luxury Catamaran Cruiser', 'Luxury Catamaran Cruiser'),
    )

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='crosses')
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Luxury Ocean Cruise')
    description = models.TextField(help_text="Detailed overview of the cruise ship or luxury vessel")
    location = models.CharField(max_length=100, help_text="Home Port / Base Location (e.g. Mumbai, Goa, Kochi, Chennai, Port Blair)")
    address = models.TextField(help_text="Full passenger embarkation terminal address")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Starting base rate in INR (₹)")
    capacity = models.PositiveIntegerField(help_text="Maximum passenger / guest capacity")

    # Capability Flags
    supports_private_charter = models.BooleanField(default=True, help_text="Available for full private hire/charter")
    supports_public_tours = models.BooleanField(default=True, help_text="Offers ticketed public cruise departures")
    supports_weddings = models.BooleanField(default=True, help_text="Supports ocean wedding ceremonies and receptions")
    supports_birthdays = models.BooleanField(default=True, help_text="Supports birthday parties and milestones")
    supports_corporate = models.BooleanField(default=True, help_text="Supports corporate retreats and conferences")
    supports_conferences = models.BooleanField(default=True, help_text="Equipped with conference AV and theatre halls")
    supports_parties = models.BooleanField(default=True, help_text="Supports DJ decks, cocktail soirees and dance floors")
    supports_dinners = models.BooleanField(default=True, help_text="Supports private chef gala dining")

    # Cruise voyage specifications
    destination = models.CharField(max_length=150, default='Goa & Arabian Sea', help_text="Primary voyage destination")
    route = models.CharField(max_length=250, default='Mumbai - Goa - Lakshadweep - Mumbai', help_text="Cruise route / ports sequence")
    departure_port = models.CharField(max_length=120, default='Mumbai International Cruise Terminal', help_text="Embarkation terminal")
    duration_days = models.PositiveIntegerField(default=4, help_text="Standard voyage duration in days")
    ship_length_meters = models.PositiveIntegerField(default=280, help_text="Vessel length in meters")
    beam_meters = models.PositiveIntegerField(default=34, help_text="Vessel beam width in meters")
    decks_count = models.PositiveIntegerField(default=12, help_text="Total passenger decks")
    cabin_count = models.PositiveIntegerField(default=180, help_text="Total staterooms and suites")

    itinerary_highlights = models.TextField(
        blank=True,
        default="Day 1: Embarkation & Welcome Gala Dinner\nDay 2: Coastal Navigation & Sun Deck Cabana Soiree\nDay 3: Scenic Island Anchorage & Water Sports\nDay 4: Starlight Farewell Party & Return to Port"
    )
    dining_venues = models.TextField(
        blank=True,
        default="The Captain's Table, Oceanview Lido Buffet, Starlight Lounge, Coastal Seafood Grill, Spice Panorama"
    )
    entertainment = models.TextField(
        blank=True,
        default="Grand Oceanfront Broadway Show, Casino Royale, Infinity Sunset Pool, Starlight Jazz Club, Ayurvedic Spa"
    )

    # Image support: uploaded file OR remote URL
    image = models.ImageField(upload_to='crosses/', blank=True, null=True, help_text="Upload local photo")
    image_url = models.URLField(max_length=600, blank=True, null=True, help_text="Or direct web image URL")

    facilities = models.TextField(help_text="Comma-separated amenities (e.g. Wi-Fi, Swimming Pool, Heliport, Fine Dining, DJ Audio Rigs, Theatre, Spa)")
    rules = models.TextField(default="Valid government photo ID required. Mandatory safety lifeboat briefing prior to departure. Quiet hours observed after midnight.", help_text="Voyage rules and policies")
    cancellation_policy = models.TextField(default="Full refund up to 72 hours prior to scheduled departure. Flexible date rescheduling available.", help_text="Terms for booking cancellation")

    is_active = models.BooleanField(default=True, help_text="Ship active status for bookings")
    is_approved = models.BooleanField(default=True, help_text="Admin approval status")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cruise Ship"
        verbose_name_plural = "Cruise Ships"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Cross.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.location} (₹{self.price})"

    @property
    def display_image_url(self):
        """Returns the uploaded image if present, else image_url, else fallback image path."""
        if self.image:
            try:
                return self.image.url
            except Exception:
                pass
        if self.image_url:
            return self.image_url.strip()
        return '/static/images/placeholder.png'

    def get_facilities_list(self):
        """Returns facilities as a clean list of strings."""
        if not self.facilities:
            return []
        lines = [item.strip() for item in self.facilities.replace('\n', ',').split(',') if item.strip()]
        return lines

    @property
    def average_rating(self):
        avg = self.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 4.9

    @property
    def review_count(self):
        return self.reviews.count()

    def supports_purpose(self, purpose_key):
        """Checks if the ship supports the requested private event purpose."""
        purpose_key = (purpose_key or '').lower().strip()
        if 'wedding' in purpose_key:
            return self.supports_weddings
        elif 'birthday' in purpose_key:
            return self.supports_birthdays
        elif 'corporate' in purpose_key or 'business' in purpose_key:
            return self.supports_corporate
        elif 'conference' in purpose_key or 'seminar' in purpose_key:
            return self.supports_conferences
        elif 'party' in purpose_key or 'celebration' in purpose_key:
            return self.supports_parties
        elif 'dinner' in purpose_key or 'gala' in purpose_key:
            return self.supports_dinners
        return self.supports_private_charter


# Convenient Alias
Ship = Cross


class ShipExtra(models.Model):
    PRICING_MODE_CHOICES = (
        ('FIXED', 'Fixed Flat Fee'),
        ('PER_GUEST', 'Per Guest Fee'),
    )

    ship = models.ForeignKey(Cross, on_delete=models.CASCADE, related_name='extras')
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price in INR (₹)")
    pricing_mode = models.CharField(max_length=20, choices=PRICING_MODE_CHOICES, default='FIXED')
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['price']

    def __str__(self):
        mode_str = "flat" if self.pricing_mode == 'FIXED' else "/ guest"
        return f"{self.name} - ₹{self.price} {mode_str} ({self.ship.name})"


class PublicTour(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('BOARDING', 'Boarding Now'),
        ('DEPARTED', 'Departed / In Transit'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    ship = models.ForeignKey(Cross, on_delete=models.CASCADE, related_name='public_tours')
    tour_title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    departure_port = models.CharField(max_length=150)
    destination = models.CharField(max_length=150)
    departure_date = models.DateField()
    departure_time = models.TimeField()
    return_date = models.DateField()
    return_time = models.TimeField()
    duration_days = models.PositiveIntegerField(default=3)
    total_capacity = models.PositiveIntegerField(help_text="Total ticket capacity for this voyage")
    booked_capacity = models.PositiveIntegerField(default=0)
    adult_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Fare per adult in INR (₹)")
    child_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Fare per child in INR (₹)")
    itinerary = models.TextField(blank=True, default="")
    ports_of_call = models.CharField(max_length=255, blank=True, default="")
    meals_included = models.CharField(max_length=200, default="All Gourmet Meals & High Tea Included")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['departure_date', 'departure_time']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(f"{self.tour_title}-{self.departure_date}")
            slug = base_slug
            counter = 1
            while PublicTour.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tour_title} - {self.ship.name} ({self.departure_date})"

    @property
    def remaining_capacity(self):
        return max(0, self.total_capacity - self.booked_capacity)

    @property
    def is_bookable(self):
        return self.is_published and self.status == 'SCHEDULED' and self.remaining_capacity > 0


class Offer(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ('PERCENTAGE', 'Percentage Discount (%)'),
        ('FIXED', 'Fixed Amount (₹)'),
    )

    code = models.CharField(max_length=30, unique=True)
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='PERCENTAGE')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_booking_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valid_from = models.DateField()
    valid_to = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.title}"

    def calculate_discount(self, amount):
        from decimal import Decimal
        from datetime import date
        amount = Decimal(str(amount))
        today = date.today()
        if not self.is_active or self.valid_from > today or self.valid_to < today:
            return Decimal('0.00')
        if amount < self.min_booking_amount:
            return Decimal('0.00')

        if self.discount_type == 'PERCENTAGE':
            disc = (amount * self.discount_value) / Decimal('100.00')
            if self.max_discount_amount and disc > self.max_discount_amount:
                disc = self.max_discount_amount
            return Decimal(str(round(float(disc), 2)))
        else:
            disc = min(amount, self.discount_value)
            return Decimal(str(round(float(disc), 2)))


class CrossReview(models.Model):
    RATING_CHOICES = (
        (5, '5 - Exceptional'),
        (4, '4 - Very Good'),
        (3, '3 - Average'),
        (2, '2 - Poor'),
        (1, '1 - Terrible'),
    )

    cross = models.ForeignKey(Cross, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cross_reviews')
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='review')
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=5)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.user.username} for {self.cross.name} ({self.rating}★)"

