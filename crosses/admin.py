from django.contrib import admin
from .models import Cross, CrossReview, ShipExtra, PublicTour, Offer


class ShipExtraInline(admin.TabularInline):
    model = ShipExtra
    extra = 1


@admin.register(Cross)
class CrossAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'owner', 'location', 'price', 'capacity', 'is_active', 'is_approved', 'created_at')
    list_filter = ('category', 'is_active', 'is_approved', 'location')
    search_fields = ('name', 'location', 'description', 'owner__username', 'owner__email')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('-created_at',)
    list_editable = ('is_active', 'is_approved')
    inlines = [ShipExtraInline]


@admin.register(PublicTour)
class PublicTourAdmin(admin.ModelAdmin):
    list_display = ('tour_title', 'ship', 'departure_port', 'destination', 'departure_date', 'adult_price', 'total_capacity', 'booked_capacity', 'status', 'is_published')
    list_filter = ('status', 'is_published', 'departure_date', 'departure_port')
    search_fields = ('tour_title', 'ship__name', 'destination', 'departure_port')
    prepopulated_fields = {'slug': ('tour_title',)}
    ordering = ('departure_date',)


@admin.register(ShipExtra)
class ShipExtraAdmin(admin.ModelAdmin):
    list_display = ('name', 'ship', 'price', 'pricing_mode', 'is_available')
    list_filter = ('pricing_mode', 'is_available', 'ship')
    search_fields = ('name', 'ship__name')


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'discount_type', 'discount_value', 'min_booking_amount', 'valid_from', 'valid_to', 'is_active')
    list_filter = ('discount_type', 'is_active')
    search_fields = ('code', 'title', 'description')


@admin.register(CrossReview)
class CrossReviewAdmin(admin.ModelAdmin):
    list_display = ('cross', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('cross__name', 'user__username', 'comment')
    ordering = ('-created_at',)

