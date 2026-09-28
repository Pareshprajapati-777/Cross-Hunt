from django.urls import path
from . import views

urlpatterns = [
    path('book/<slug:slug>/', views.booking_create_view, name='booking_create'),
    path('confirmation/<str:booking_id>/', views.booking_confirmation_view, name='booking_confirmation'),
    path('detail/<str:booking_id>/', views.booking_detail_view, name='booking_detail'),
    path('cancel/<str:booking_id>/', views.booking_cancel_view, name='booking_cancel'),
    path('my-bookings/', views.my_bookings_view, name='my_bookings'),
    path('owner/bookings/', views.owner_bookings_view, name='owner_bookings'),
    path('owner/bookings/<str:booking_id>/<str:action>/', views.owner_booking_action_view, name='owner_booking_action'),
    path('print/<str:booking_id>/', views.booking_printable_view, name='booking_printable'),
    path('review/<str:booking_id>/', views.add_review_view, name='add_review'),
]
