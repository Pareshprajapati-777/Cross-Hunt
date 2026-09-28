from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/me/', views.api_me, name='api_me'),
    path('auth/login/', views.api_login, name='api_login'),
    path('auth/register/', views.api_register, name='api_register'),
    path('auth/logout/', views.api_logout, name='api_logout'),
    path('auth/profile/', views.api_profile, name='api_profile'),

    # Cruise Ships & Matching Engine
    path('cruises/', views.api_cruise_list, name='api_cruise_list'),
    path('cruises/match/', views.api_ship_match, name='api_ship_match'),
    path('cruises/<slug:slug>/', views.api_cruise_detail, name='api_cruise_detail'),

    # Public Scheduled Cruise Tours (Product B)
    path('tours/', views.api_tour_list, name='api_tour_list'),
    path('tours/<slug:slug>/', views.api_tour_detail, name='api_tour_detail'),

    # Offers & Coupons
    path('offers/', views.api_offers_list, name='api_offers_list'),
    path('offers/validate/', views.api_validate_coupon, name='api_validate_coupon'),

    # Private Events
    path('events/packages/', views.api_event_packages, name='api_event_packages'),

    # Bookings & Reservations
    path('bookings/create/', views.api_create_booking, name='api_create_booking'),
    path('bookings/my-bookings/', views.api_my_bookings, name='api_my_bookings'),
    path('bookings/<str:booking_id>/', views.api_booking_detail, name='api_booking_detail'),
    path('bookings/<str:booking_id>/invoice/', views.api_booking_invoice, name='api_booking_invoice'),
    path('bookings/<str:booking_id>/cancel/', views.api_cancel_booking, name='api_cancel_booking'),
    path('bookings/<str:booking_id>/review/', views.api_review_booking, name='api_review_booking'),

    # Operator Fleet & Tour Management
    path('operator/dashboard/', views.api_operator_dashboard, name='api_operator_dashboard'),
    path('operator/ships/', views.api_operator_ships, name='api_operator_ships'),
    path('operator/ships/<int:ship_id>/', views.api_operator_ship_detail, name='api_operator_ship_detail'),
    path('operator/ships/<int:ship_id>/availability/', views.api_operator_availability, name='api_operator_availability'),
    path('operator/extras/', views.api_operator_extras, name='api_operator_extras'),
    path('operator/tours/', views.api_operator_tours, name='api_operator_tours'),
    path('operator/tours/<int:tour_id>/passengers/', views.api_operator_tour_passengers, name='api_operator_tour_passengers'),
    path('operator/revenue/', views.api_operator_revenue, name='api_operator_revenue'),
    path('operator/bookings/<str:booking_id>/<str:action>/', views.api_operator_action, name='api_operator_action'),

    # Admin Management
    path('admin/dashboard/', views.api_admin_dashboard, name='api_admin_dashboard'),
    path('admin/offers/', views.api_admin_offers, name='api_admin_offers'),
    path('admin/users/', views.api_admin_users, name='api_admin_users'),
    path('admin/owners/', views.api_admin_owners, name='api_admin_owners'),
    path('admin/ships/', views.api_admin_ships, name='api_admin_ships'),
    path('admin/bookings/', views.api_admin_bookings, name='api_admin_bookings'),
    path('admin/tours/', views.api_admin_tours, name='api_admin_tours'),
    path('admin/reviews/', views.api_admin_reviews, name='api_admin_reviews'),
    path('admin/reports/', views.api_admin_reports, name='api_admin_reports'),
]
