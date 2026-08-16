from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FriendshipViewSet, OutfitShareFeedView, OutfitShareViewSet

router = DefaultRouter()
router.register(r"shares", OutfitShareViewSet, basename="outfit-share")
router.register(r"friendships", FriendshipViewSet, basename="friendship")

urlpatterns = [
    path("feed/", OutfitShareFeedView.as_view(), name="social-feed"),
    path("", include(router.urls)),
]
