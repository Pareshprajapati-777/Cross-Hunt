from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.db.models import Avg


class Cross(models.Model):
    CATEGORY_CHOICES = (
        ('Luxury Ocean Cruise', 'Luxury Ocean Cruise'),
        ('Mega Cruise Liner', 'Mega Cruise Liner'),
        ('Expedition Cruise', 'Expedition Cruise'),
        ('Island Hopper Cruise', 'Island Hopper Cruise'),
        ('Scenic Coastal Cruise', 'Scenic Coastal Cruise'),
        ('Private Charter Yacht', 'Private Charter Yacht'),
        ('Community Hall', 'Community Hall'),
        ('Sports Cross Arena', 'Sports Cross Arena'),
        ('Event & Celebration', 'Event & Celebration'),
        ('Conference & Workshop', 'Conference & Workshop'),
        ('Fitness / Crossfit Space', 'Fitness / Crossfit Space'),
        ('Creative Studio Cross', 'Creative Studio Cross'),
    )

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='crosses')
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Luxury Ocean Cruise')
    description = models.TextField(help_text="Detailed overview of the cross property or cruise vessel")
    location = models.CharField(max_length=100, help_text="Home Port / Region (e.g. Port of Miami, Barcelona, Nassau)")
    address = models.TextField(help_text="Full physical terminal / dock street address")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Starting ticket fare / hourly private charter rate")
    capacity = models.PositiveIntegerField(help_text="Maximum passenger capacity")
    
    # Cruise voyage enhancements
    destination = models.CharField(max_length=150, default='Caribbean Seas', help_text="Primary voyage destination")
    route = models.CharField(max_length=250, default='Miami - Bahamas - Cozumel - Miami', help_text="Cruise route / ports sequence")
    departure_port = models.CharField(max_length=120, default='Port of Miami, Florida', help_text="Embarkation terminal")
    duration_days = models.PositiveIntegerField(default=5, help_text="Standard cruise duration in days")
    ship_length_meters = models.PositiveIntegerField(default=330, help_text="Vessel length in meters")
    decks_count = models.PositiveIntegerField(default=16, help_text="Total passenger decks")
    itinerary_highlights = models.TextField(blank=True, default="Day 1: Embarkation & Captain's Welcome Dinner\nDay 2: Ocean Navigation & Sun Deck Gala\nDay 3: Tropical Island Snorkeling Excursion\nDay 4: Starlight Pool Party & Broadway Theatre\nDay 5: Return to Home Port & Disembarkation")
    dining_venues = models.TextField(blank=True, default="The Captain's Table, Oceanview Lido Buffet, Starlight Lounge, Sunset Seafood Grill")
    entertainment = models.TextField(blank=True, default="Grand Theatre Broadway Show, Casino Royale, Infinity Sunset Pool, Jazz Club, Spa Wellness")

    # Image support: uploaded file OR remote URL
    image = models.ImageField(upload_to='crosses/', blank=True, null=True, help_text="Upload local photo")
    image_url = models.URLField(max_length=600, blank=True, null=True, help_text="Or provide direct web image URL")
    
    facilities = models.TextField(help_text="Comma-separated amenities (e.g. Wi-Fi, Air Conditioning, Swimming Pool, Heliport, Fitness Center, Dining)")
    rules = models.TextField(default="Valid passport required. Safety lifeboat drill mandatory on embarkation. Quiet hours after 11 PM.", help_text="Voyage rules and policies")
    cancellation_policy = models.TextField(default="Full refund up to 48 hours prior to scheduled departure. Flexible date rescheduling available.", help_text="Terms for booking cancellation")
    
    is_active = models.BooleanField(default=True, help_text="Property active status for bookings")
    is_approved = models.BooleanField(default=True, help_text="Admin approval status")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cross Property"
        verbose_name_plural = "Cross Properties"
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
        return f"{self.name} - {self.location} (${self.price}/hr)"

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
        # split by comma or newline
        lines = [item.strip() for item in self.facilities.replace('\n', ',').split(',') if item.strip()]
        return lines

    @property
    def average_rating(self):
        avg = self.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0.0

    @property
    def review_count(self):
        return self.reviews.count()


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
