from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class StyleKnowledgeChunk(TimeStampedModel):
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    embedding_ref = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.content[:50]


class ShoppingSuggestion(TimeStampedModel):
    class Priority(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shopping_suggestions",
    )
    occasion_id = models.UUIDField(blank=True, null=True)
    occasion_description = models.TextField(blank=True, default="")
    item_description = models.TextField()
    reason = models.TextField()
    priority = models.CharField(max_length=10, choices=Priority.choices)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.priority}: {self.item_description}"
