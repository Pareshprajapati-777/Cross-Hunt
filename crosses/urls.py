from django.urls import path
from . import views

urlpatterns = [
    path('explore/', views.cross_list_view, name='cross_list'),
    path('my-crosses/', views.my_crosses_view, name='my_crosses'),
    path('cross/add/', views.cross_create_view, name='cross_create'),
    path('cross/<slug:slug>/', views.cross_detail_view, name='cross_detail'),
    path('cross/<int:pk>/edit/', views.cross_update_view, name='cross_update'),
    path('cross/<int:pk>/delete/', views.cross_delete_view, name='cross_delete'),
    path('cross/<int:pk>/toggle-status/', views.cross_toggle_status_view, name='cross_toggle_status'),
]
