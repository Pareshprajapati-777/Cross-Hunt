from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/me/', views.api_me, name='api_me'),
    path('auth/login/', views.api_login, name='api_login'),
    path('auth/register/', views.api_register, name='api_register'),
    path('auth/logout/', views.api_logout, name='api_logout'),

    # Cruises & Tours
    path('cruises/', views.api_cruise_list, name='api_cruise_list'),
    path('cruises/<slug:slug>/', views.api_cruise_detail, name='api_cruise_detail'),

    # Private Events
    path('events/packages/', views.api_event_packages, name='api_event_packages'),

    # Bookings & Reservations
    path('bookings/create/', views.api_create_booking, name='api_create_booking'),
    path('bookings/my-bookings/', views.api_my_bookings, name='api_my_bookings'),
    path('bookings/<str:booking_id>/', views.api_booking_detail, name='api_booking_detail'),
    path('bookings/<str:booking_id>/cancel/', views.api_cancel_booking, name='api_cancel_booking'),
    path('bookings/<str:booking_id>/review/', views.api_review_booking, name='api_review_booking'),

    # Operator
    path('operator/dashboard/', views.api_operator_dashboard, name='api_operator_dashboard'),
    path('operator/bookings/<str:booking_id>/<str:action>/', views.api_operator_action, name='api_operator_action'),

    # Admin
    path('admin/dashboard/', views.api_admin_dashboard, name='api_admin_dashboard'),
]
