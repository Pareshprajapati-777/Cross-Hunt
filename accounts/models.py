from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'Guest / Customer'),
        ('OWNER', 'Ship Operator / Owner'),
        ('CROSS_OWNER', 'Ship Operator / Owner (Legacy)'),
        ('ADMIN', 'Platform Administrator'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='USER')
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_approved_owner = models.BooleanField(default=True, help_text="Designates whether this owner account is approved by admin.")

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_owner(self):
        return self.role in ['OWNER', 'CROSS_OWNER'] or self.is_superuser

    @property
    def is_cross_owner(self):
        return self.is_owner

    @property
    def is_regular_user(self):
        return self.role == 'USER'

    @property
    def is_admin_user(self):
        return self.role == 'ADMIN' or self.is_superuser or self.is_staff

