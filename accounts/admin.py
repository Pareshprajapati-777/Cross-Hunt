from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'phone', 'is_approved_owner', 'is_active', 'date_joined')
    list_filter = ('role', 'is_approved_owner', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Cross Management Role & Profile', {
            'fields': ('role', 'phone', 'address', 'profile_picture', 'is_approved_owner')
        }),
    )
