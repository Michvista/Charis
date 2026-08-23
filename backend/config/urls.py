from django.contrib import admin
from django.urls import path, include

from common.views import ImageProxyView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/wardrobe/', include('apps.wardrobe.urls')),
    path('api/tripplanner/', include('apps.tripplanner.urls')),
    path('api/social/', include('apps.social.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/styleadvisor/', include('apps.styleadvisor.urls')),
    path('api/', include('apps.outfits.urls')),
    path('api/internal/image-proxy/', ImageProxyView.as_view(), name='internal-image-proxy'),
]
