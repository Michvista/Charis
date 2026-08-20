import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Outfit(TimeStampedModel):
    """A saved outfit snapshot persisted server-side.

    ``outfit_id`` is the UUID produced by the DolphJS styling-service.
    It is unique so social posts can look up the full outfit snapshot by
    the id they attach to a share.
    """

    VERDICT_CHOICES = [
        ("works", "Works"),
        ("partially_works", "Partially works"),
        ("doesnt_work", "Doesn't work"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outfits",
    )
    outfit_id = models.UUIDField(unique=True)
    name = models.CharField(max_length=255, blank=True, default="Saved Outfit")
    score = models.PositiveSmallIntegerField(default=0)
    verdict = models.CharField(
        max_length=20,
        choices=VERDICT_CHOICES,
        default="works",
    )
    visual_notes = models.TextField(blank=True, default="")
    # Items are stored as a JSON snapshot so the card renders for any viewer
    # without cross-service FK lookups: [{name, image_url, category, color_hex, formality_level}]
    items = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.outfit_id})"

    @property
    def item_count(self) -> int:
        return len(self.items or [])