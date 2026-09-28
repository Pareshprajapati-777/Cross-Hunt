from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import render
from crosses.views import home_view


def about_view(request):
    return render(request, 'about.html')


def contact_view(request):
    return render(request, 'contact.html')


def custom_404_view(request, exception=None):
    return render(request, '404.html', status=404)


def custom_403_view(request, exception=None):
    return render(request, '403.html', status=403)


def custom_500_view(request):
    return render(request, '500.html', status=500)


handler404 = custom_404_view
handler403 = custom_403_view
handler500 = custom_500_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_view, name='home'),
    path('about/', about_view, name='about'),
    path('contact/', contact_view, name='contact'),
    
    # App routers
    path('api/', include('api.urls')),
    path('accounts/', include('accounts.urls')),
    path('crosses/', include('crosses.urls')),
    path('bookings/', include('bookings.urls')),
    path('dashboard/', include('dashboard.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
