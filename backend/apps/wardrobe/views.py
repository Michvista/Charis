from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsOwner
from common.pagination import StandardResultsSetPagination

from .models import WardrobeItem
from .serializers import WardrobeItemSerializer


class WardrobeItemViewSet(viewsets.ModelViewSet):
    serializer_class = WardrobeItemSerializer

    permission_classes = [IsAuthenticated, IsOwner]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Return only the wardrobe items that belong to the authenticated user
        return WardrobeItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Set the user to the authenticated user when creating a new wardrobe item
        serializer.save(user=self.request.user)