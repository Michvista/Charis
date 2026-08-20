from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.wardrobe.models import WardrobeItem

from .algorithms import greedy_packing_list
from .models import PackingList, PackingListItem, Trip, TripEvent
from .serializers import (
    PackingListSerializer,
    TripEventSerializer,
    TripSerializer,
)


class TripViewSet(viewsets.ModelViewSet):
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user).prefetch_related("trip_events", "packing_lists__items__wardrobe_item")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="generate-packing-list")
    def generate_packing_list(self, request, pk=None):
        trip = self.get_object()
        trip_events = list(trip.trip_events.all())
        wardrobe_items = list(
            WardrobeItem.objects.filter(user=request.user).prefetch_related("seasons")
        )

        selections = greedy_packing_list(wardrobe_items, trip_events, trip=trip)

        with transaction.atomic():
            packing_list = PackingList.objects.create(trip=trip)
            for selection in selections:
                PackingListItem.objects.create(
                    packing_list=packing_list,
                    wardrobe_item=selection["wardrobe_item"],
                    covers_event_ids=selection["covers_event_ids"],
                )

        serializer = PackingListSerializer(packing_list, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TripEventViewSet(viewsets.ModelViewSet):
    serializer_class = TripEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = TripEvent.objects.filter(trip__user=self.request.user).select_related("trip")
        trip_id = self.kwargs.get("trip_id")
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        return queryset

    def create(self, request, *args, **kwargs):
        trip_id = kwargs.get("trip_id") or request.data.get("trip")
        if not trip_id:
            return Response(
                {"detail": "trip is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            trip = Trip.objects.get(id=trip_id, user=request.user)
        except Trip.DoesNotExist:
            return Response(
                {"detail": "Trip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(trip=trip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
