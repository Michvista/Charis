from django.conf import settings
from django.db.models import Q
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


class Friendship(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendship_requests_sent",
    )
    addressee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendship_requests_received",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    accepted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=~Q(requester=models.F("addressee")),
                name="social_friendship_not_self_referential",
            ),
            models.UniqueConstraint(
                fields=["requester", "addressee"],
                name="social_friendship_unique_pair",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.requester} -> {self.addressee} ({self.status})"

    @classmethod
    def are_friends(cls, user_a, user_b) -> bool:
        if not user_a or not user_b or user_a == user_b:
            return False

        return cls.objects.filter(
            (
                Q(requester=user_a, addressee=user_b)
                | Q(requester=user_b, addressee=user_a)
            ),
            status=cls.Status.ACCEPTED,
        ).exists()


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
