from django.contrib import admin
from .models import Cross, CrossReview


@admin.register(Cross)
class CrossAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'owner', 'location', 'price', 'capacity', 'is_active', 'is_approved', 'created_at')
    list_filter = ('category', 'is_active', 'is_approved', 'location')
    search_fields = ('name', 'location', 'description', 'owner__username', 'owner__email')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('-created_at',)
    list_editable = ('is_active', 'is_approved')


@admin.register(CrossReview)
class CrossReviewAdmin(admin.ModelAdmin):
    list_display = ('cross', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('cross__name', 'user__username', 'comment')
    ordering = ('-created_at',)
