from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/wardrobe/', include('apps.wardrobe.urls')),
    path('api/tripplanner/', include('apps.tripplanner.urls')),
    path('api/social/', include('apps.social.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/styleadvisor/', include('apps.styleadvisor.urls')),
]
