import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Outfit",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outfit_id", models.UUIDField(unique=True)),
                ("name", models.CharField(blank=True, default="Saved Outfit", max_length=255)),
                ("score", models.PositiveSmallIntegerField(default=0)),
                (
                    "verdict",
                    models.CharField(
                        choices=[
                            ("works", "Works"),
                            ("partially_works", "Partially works"),
                            ("doesnt_work", "Doesn't work"),
                        ],
                        default="works",
                        max_length=20,
                    ),
                ),
                ("visual_notes", models.TextField(blank=True, default="")),
                ("items", models.JSONField(blank=True, default=list)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="outfits",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]