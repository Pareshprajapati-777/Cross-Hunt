from django.contrib import admin
from .models import (
    Operator, Cross, CrossReview, ShipExtra, PublicTour, Offer,
    ShipImage, ShipMaintenance, TourCabin, Route, PrivateCharterRate, TourFare
)


class ShipImageInline(admin.TabularInline):
    model = ShipImage
    extra = 1


class ShipMaintenanceInline(admin.TabularInline):
    model = ShipMaintenance
    extra = 0


class ShipExtraInline(admin.TabularInline):
    model = ShipExtra
    extra = 1


class PrivateCharterRateInline(admin.TabularInline):
    model = PrivateCharterRate
    extra = 1


class TourFareInline(admin.TabularInline):
    model = TourFare
    extra = 1


class TourCabinInline(admin.TabularInline):
    model = TourCabin
    extra = 1


@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'phone', 'email', 'website', 'verified', 'source_checked', 'created_at')
    list_filter = ('verified', 'location')
    search_fields = ('name', 'location', 'phone', 'email', 'website')
    actions = ['mark_verified', 'mark_unverified']

    @admin.action(description="Mark selected operators as verified")
    def mark_verified(self, request, queryset):
        queryset.update(verified=True)

    @admin.action(description="Mark selected operators as unverified")
    def mark_unverified(self, request, queryset):
        queryset.update(verified=False)


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('departure', 'destination', 'operator', 'duration')
    list_filter = ('departure', 'destination', 'operator')
    search_fields = ('departure', 'destination', 'description')


@admin.register(Cross)
class CrossAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'operator', 'listing_type', 'vessel_category', 'location',
        'price', 'price_unit', 'is_quote_based', 'capacity', 'is_active', 'is_approved', 'last_verified_at'
    )
    list_filter = ('listing_type', 'vessel_category', 'price_unit', 'is_quote_based', 'is_active', 'is_approved', 'location', 'operator')
    search_fields = ('name', 'location', 'description', 'operator__name', 'owner__username')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('-created_at',)
    list_editable = ('is_active', 'is_approved')
    inlines = [PrivateCharterRateInline, ShipImageInline, ShipMaintenanceInline, ShipExtraInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'operator', 'owner', 'listing_type', 'vessel_category', 'category', 'description')
        }),
        ('Location & Ports', {
            'fields': ('location', 'address', 'departure_port', 'destination', 'route')
        }),
        ('Pricing & Capacity', {
            'fields': ('price', 'price_unit', 'is_quote_based', 'duration_display', 'capacity', 'capacity_note', 'has_unknown_capacity')
        }),
        ('Taxes & Charges', {
            'fields': ('tax_note', 'permit_note', 'fuel_surcharge_note', 'included', 'extra_charges')
        }),
        ('Capabilities & Features', {
            'fields': (
                'supports_private_charter', 'supports_public_tours', 'supports_weddings',
                'supports_birthdays', 'supports_corporate', 'supports_conferences',
                'supports_parties', 'supports_dinners', 'facilities', 'rules', 'cancellation_policy'
            )
        }),
        ('Specifications & Media', {
            'fields': ('ship_length_meters', 'beam_meters', 'decks_count', 'cabin_count', 'image', 'image_url', 'itinerary_highlights', 'dining_venues', 'entertainment')
        }),
        ('Verification & Status', {
            'fields': ('source_url', 'source_checked', 'last_verified_at', 'availability_status', 'is_active', 'is_approved')
        }),
    )


@admin.register(PrivateCharterRate)
class PrivateCharterRateAdmin(admin.ModelAdmin):
    list_display = ('vessel', 'duration', 'price', 'currency', 'price_unit', 'is_quote_based', 'minimum_guests', 'maximum_guests', 'last_verified_at')
    list_filter = ('price_unit', 'is_quote_based', 'vessel')
    search_fields = ('vessel__name', 'duration', 'included', 'extra_charges')


@admin.register(PublicTour)
class PublicTourAdmin(admin.ModelAdmin):
    list_display = (
        'tour_title', 'ship', 'operator', 'departure_port', 'destination',
        'departure_date', 'adult_price', 'price_unit', 'is_live_pricing', 'total_capacity', 'booked_capacity', 'status', 'is_published'
    )
    list_filter = ('status', 'price_unit', 'is_live_pricing', 'is_published', 'departure_date', 'departure_port', 'operator')
    search_fields = ('tour_title', 'ship__name', 'operator__name', 'destination', 'departure_port')
    prepopulated_fields = {'slug': ('tour_title',)}
    ordering = ('departure_date',)
    inlines = [TourFareInline, TourCabinInline]


@admin.register(TourFare)
class TourFareAdmin(admin.ModelAdmin):
    list_display = ('public_tour', 'cabin_type', 'price', 'currency', 'price_unit', 'validity', 'last_verified_at')
    list_filter = ('price_unit', 'public_tour__operator')
    search_fields = ('cabin_type', 'public_tour__tour_title')


@admin.register(TourCabin)
class TourCabinAdmin(admin.ModelAdmin):
    list_display = ('name', 'tour', 'price_per_person', 'total_capacity', 'booked_capacity')
    search_fields = ('name', 'tour__tour_title')


@admin.register(ShipImage)
class ShipImageAdmin(admin.ModelAdmin):
    list_display = ('ship', 'caption', 'is_cover', 'order', 'created_at')
    list_filter = ('is_cover', 'ship')


@admin.register(ShipMaintenance)
class ShipMaintenanceAdmin(admin.ModelAdmin):
    list_display = ('ship', 'start_date', 'end_date', 'reason', 'is_active')
    list_filter = ('is_active', 'ship')


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
