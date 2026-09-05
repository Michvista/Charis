from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StyleCompleteView, StyleKnowledgeUploadView
from .views_wishlist import WishlistViewSet

router = DefaultRouter()
router.register(r"wishlist", WishlistViewSet, basename="wishlist")

urlpatterns = [
    path("knowledge/", StyleKnowledgeUploadView.as_view(), name="styleadvisor-knowledge"),
    path("complete/", StyleCompleteView.as_view(), name="styleadvisor-complete"),
    path("", include(router.urls)),
]
