from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import F
from django.db import transaction
import uuid

from common.permissions import IsOwner
from common.pagination import StandardResultsSetPagination

from .models import WardrobeItem, WearLog
from .serializers import WardrobeItemSerializer, WearLogSerializer
from .services import (
    upload_image_to_cloudinary,
    enqueue_tagging_job,
    StylingServiceClient,
    StylingServiceUnavailable,
)


class WardrobeItemViewSet(viewsets.ModelViewSet):
    serializer_class = WardrobeItemSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    pagination_class = StandardResultsSetPagination
    
    # Enable file upload parsing alongside standard JSON
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return WardrobeItem.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        image_file = self.request.FILES.get('image')
        image_url = payload.get("image_url", "")
        extracted_primary_color = None

        if image_file:
            try:
                upload_result = upload_image_to_cloudinary(image_file)
                image_url = upload_result.get("secure_url", image_url)
                extracted_primary_color = upload_result.get("primary_color")
            except Exception as e:
                print(f"[IMAGE UPLOAD] Cloudinary upload fallback: {e}", flush=True)
                if not image_url:
                    image_url = "https://images.unsplash.com/photo-1544441893-675973e31985?w=600&q=80"

        if not image_url:
            image_url = "https://images.unsplash.com/photo-1544441893-675973e31985?w=600&q=80"

        if not payload.get("primary_color") and extracted_primary_color:
            payload["primary_color"] = extracted_primary_color

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        item = serializer.save(
            user=self.request.user,
            image_url=image_url,
        )

        enqueue_tagging_job(item.id)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='wear')
    def log_wear(self, request, pk=None):
        """
        POST /api/wardrobe/items/<id>/wear/
        Logs a wear entry for today. Optionally accepts {"outfit_id": "uuid"} in request body.
        """
        item = self.get_object()  # Enforces user ownership via get_queryset & IsOwner
        outfit_id = request.data.get("outfit_id")

        if outfit_id:
            try:
                uuid.UUID(str(outfit_id))
            except ValueError:
                return Response(
                    {"detail": "Invalid outfit_id format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            with transaction.atomic():
                if outfit_id:
                    outfit = StylingServiceClient.get_outfit_by_id(str(outfit_id))
                    if not outfit:
                        return Response(
                            {"detail": "Outfit not found in styling service."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    outfit_user_id = outfit.get("userId")
                    if outfit_user_id != str(request.user.id):
                        return Response(
                            {"detail": "You do not own this outfit."},
                            status=status.HTTP_403_FORBIDDEN,
                        )

                wear_log = WearLog.objects.create(
                    wardrobe_item=item,
                    outfit_id=outfit_id,
                    worn_date=timezone.now().date()
                )

                item.times_worn = F("times_worn") + 1
                item.save(update_fields=["times_worn"])
        except StylingServiceUnavailable as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message": f"Logged wear for '{item.name}'",
                "wear_log_id": str(wear_log.id),
                "outfit_id": str(wear_log.outfit_id) if wear_log.outfit_id else None,
                "worn_date": str(wear_log.worn_date)
            },
            status=status.HTTP_201_CREATED
        )


class WearLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/wardrobe/wear-logs/
    GET /api/wardrobe/wear-logs/<id>/
    Fetches wear logs and enriches single detail queries with DolphJS outfit analytics.
    """
    serializer_class = WearLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return WearLog.objects.filter(wardrobe_item__user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Cross-service query to DolphJS styling-service
        if instance.outfit_id:
            try:
                data["outfit_analytics"] = StylingServiceClient.get_outfit_by_id(str(instance.outfit_id))
            except StylingServiceUnavailable as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        else:
            data["outfit_analytics"] = None

        return Response(data)
