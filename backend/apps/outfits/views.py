from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Outfit
from .serializers import OutfitSerializer


class OutfitViewSet(viewsets.ModelViewSet):
    """CRUD for saved outfit snapshots. Scoped to the authenticated user."""

    serializer_class = OutfitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Outfit.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)