import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MaxValueValidator, MinValueValidator

class Season(models.Model):
    SEASON_CHOICES = [
        ("spring", "Spring"),
        ("summer", "Summer"),
        ("fall", "Fall"),
        ("winter", "Winter"),
    ]
    name = models.CharField(max_length=10, choices=SEASON_CHOICES, unique=True)

    def __str__(self):
        return self.name


class WardrobeItem(models.Model):
    CATEGORY_CHOICES = [
        ("top", "Top"),
        ("bottom", "Bottom"),
        ("outerwear", "Outerwear"),
        ("shoes", "Shoes"),
        ("accessory", "Accessory"),
        ("dress", "Dress"),
        ("bag", "Bag"),
    ]

    TAGGING_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wardrobe_items"
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    primary_color = models.CharField(max_length=50)
    secondary_color = models.CharField(max_length=50, blank=True, null=True)
    fabric = models.CharField(max_length=100, blank=True, null=True)
    # 1 = very casual, 5 = black tie
    formality_level = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    # M2M chosen over JSONField — allows clean queries like
    # "all items that work for fall" without array matching
    seasons = models.ManyToManyField(Season, blank=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField()
    tagging_status = models.CharField(
        max_length=10,
        choices=TAGGING_STATUS_CHOICES,
        default="pending"
    )
    # Denormalized counter — derived from WearLog
    # Updated by the job-worker after each wear log, not manually
    times_worn = models.IntegerField(default=0)
    purchase_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    purchase_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.category}) — {self.user.email}"

    class Meta:
        ordering = ["-created_at"]


class WearLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wardrobe_item = models.ForeignKey(
        WardrobeItem,
        on_delete=models.CASCADE,
        related_name="wear_logs"
    )
    # nullable — not every wear is part of a saved outfit
    # outfit_id here is the UUID from the DolphJS styling-service
    # stored as a plain UUID string — no FK across services
    outfit_id = models.UUIDField(blank=True, null=True)
    worn_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.wardrobe_item.name} worn on {self.worn_date}"

    class Meta:
        ordering = ["-worn_date"]