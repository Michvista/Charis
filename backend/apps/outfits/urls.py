from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OutfitViewSet

router = DefaultRouter()
router.register(r"outfits", OutfitViewSet, basename="outfit")

urlpatterns = [
    path("", include(router.urls)),
]