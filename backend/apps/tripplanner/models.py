from django.conf import settings
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

from common.models import TimeStampedModel
from apps.wardrobe.models import WardrobeItem


class Trip(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trips",
    )
    name = models.CharField(max_length=255)
    destination = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} to {self.destination}"


class TripEvent(TimeStampedModel):
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="trip_events",
    )
    name = models.CharField(max_length=255)
    date = models.DateField()
    formality_required = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    location = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["date", "created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.date})"


class PackingList(TimeStampedModel):
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="packing_lists",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Packing list for {self.trip.name}"


class PackingListItem(TimeStampedModel):
    packing_list = models.ForeignKey(
        PackingList,
        on_delete=models.CASCADE,
        related_name="items",
    )
    wardrobe_item = models.ForeignKey(
        WardrobeItem,
        on_delete=models.CASCADE,
        related_name="packing_list_items",
    )
    covers_event_ids = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.wardrobe_item.name} for {self.packing_list.trip.name}"
