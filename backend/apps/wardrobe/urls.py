from rest_framework.routers import DefaultRouter
from .views import WardrobeItemViewSet

router = DefaultRouter()
router.register(r'items', WardrobeItemViewSet, basename='wardrobe-item')

urlpatterns = router.urls