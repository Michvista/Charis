from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OutfitShareFeedView, OutfitShareViewSet

router = DefaultRouter()
router.register(r"shares", OutfitShareViewSet, basename="outfit-share")

urlpatterns = [
    path("feed/", OutfitShareFeedView.as_view(), name="social-feed"),
    path("", include(router.urls)),
]
