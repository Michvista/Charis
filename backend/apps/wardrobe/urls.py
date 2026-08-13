from rest_framework.routers import DefaultRouter
from .views import WardrobeItemViewSet, WearLogViewSet

router = DefaultRouter()
router.register(r'items', WardrobeItemViewSet, basename='wardrobe-item')
router.register(r'wear-logs', WearLogViewSet, basename='wear-log')

urlpatterns = router.urls