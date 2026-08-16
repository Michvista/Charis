from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class OutfitShare(TimeStampedModel):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        FRIENDS = "friends", "Friends"
        LINK_ONLY = "link_only", "Link only"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outfit_shares",
    )
    outfit_id = models.UUIDField(unique=True)
    caption = models.TextField(blank=True, default="")
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-shared_at"]

    def __str__(self) -> str:
        return f"{self.user} shared {self.outfit_id}"


class Comment(TimeStampedModel):
    share = models.ForeignKey(
        OutfitShare,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outfit_comments",
    )
    text = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Comment by {self.user}"


class Vote(TimeStampedModel):
    class Value(models.IntegerChoices):
        UP = 1, "Up"
        DOWN = -1, "Down"

    share = models.ForeignKey(
        OutfitShare,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outfit_votes",
    )
    value = models.SmallIntegerField(choices=Value.choices)

    class Meta:
        unique_together = ("share", "user")

    def __str__(self) -> str:
        return f"Vote {self.value} by {self.user}"
