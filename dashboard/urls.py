from django.urls import path
from . import views

urlpatterns = [
    path('user/', views.user_dashboard_view, name='user_dashboard'),
    path('owner/', views.owner_dashboard_view, name='owner_dashboard'),
    path('admin-panel/', views.admin_dashboard_view, name='admin_dashboard'),
    path('admin-panel/users/', views.admin_users_view, name='admin_users'),
    path('admin-panel/users/<int:user_id>/toggle/', views.admin_user_toggle_view, name='admin_user_toggle'),
    path('admin-panel/owners/', views.admin_owners_view, name='admin_owners'),
    path('admin-panel/owners/<int:owner_id>/toggle-approval/', views.admin_owner_toggle_approval_view, name='admin_owner_toggle_approval'),
    path('admin-panel/crosses/', views.admin_crosses_view, name='admin_crosses'),
    path('admin-panel/crosses/<int:cross_id>/toggle/', views.admin_cross_toggle_view, name='admin_cross_toggle'),
    path('admin-panel/crosses/<int:cross_id>/delete/', views.admin_cross_delete_view, name='admin_cross_delete'),
    path('admin-panel/bookings/', views.admin_bookings_view, name='admin_bookings'),
    path('admin-panel/bookings/<str:booking_id>/cancel/', views.admin_booking_cancel_view, name='admin_booking_cancel'),
]
