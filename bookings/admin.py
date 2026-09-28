from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_id', 'cross', 'user', 'booking_date', 'start_time', 'end_time', 'duration_hours', 'total_price', 'status', 'created_at')
    list_filter = ('status', 'booking_date', 'created_at')
    search_fields = ('booking_id', 'cross__name', 'user__username', 'user__email')
    ordering = ('-created_at',)
    readonly_fields = ('booking_id', 'created_at', 'updated_at')
    list_editable = ('status',)
