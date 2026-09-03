from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class StyleKnowledgeChunk(TimeStampedModel):
    title = models.CharField(max_length=255, blank=True, default="")
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    embedding_ref = models.TextField(blank=True, default="")
    source_file = models.CharField(max_length=255, blank=True, default="")
    content_hash = models.CharField(max_length=64, blank=True, default="")
    embedding = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["source_file", "created_at"]

    def __str__(self) -> str:
        return self.title or self.content[:50]


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
