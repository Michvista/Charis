
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from common.permissions import IsOwner
from common.pagination import StandardResultsSetPagination

from .models import WardrobeItem, WearLog
from .serializers import WardrobeItemSerializer
from .services import upload_image_to_cloudinary, enqueue_tagging_job


class WardrobeItemViewSet(viewsets.ModelViewSet):
    serializer_class = WardrobeItemSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    pagination_class = StandardResultsSetPagination
    
    # Enable file upload parsing alongside standard JSON
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return WardrobeItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Check if an image file was uploaded
        image_file = self.request.FILES.get('image')
        image_url = ""
        
        if image_file:
            image_url = upload_image_to_cloudinary(image_file)

        #Save the item with the user and Cloudinary image URL
        item = serializer.save(user=self.request.user, image_url=image_url)

        # Call service layer stub to enqueue auto-tagging
        enqueue_tagging_job(item.id)

    @action(detail=True, methods=['post'], url_path='wear')
    def log_wear(self, request, pk=None):
    
       # Logs a wear entry for today for this specific item.
    
        item = self.get_object()  # Enforces user ownership via get_queryset & IsOwner
        
        wear_log = WearLog.objects.create(
            wardrobe_item=item,
            worn_date=timezone.now().date()
        )

        return Response(
            {
                "message": f"Logged wear for '{item.name}'",
                "wear_log_id": str(wear_log.id),
                "worn_date": str(wear_log.worn_date)
            },
            status=status.HTTP_201_CREATED
        )