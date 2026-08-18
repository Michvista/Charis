from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.wardrobe.models import WardrobeItem
from apps.wardrobe.services import (
    enqueue_tagging_job,
    is_cloudinary_url,
    normalize_image_source_to_cloudinary,
)


class Command(BaseCommand):
    help = (
        "Re-host existing wardrobe images on Cloudinary when possible and "
        "re-enqueue wardrobe tagging jobs for a one-time backfill."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Optional maximum number of wardrobe items to process.",
        )
        parser.add_argument(
            "--skip-rehost",
            action="store_true",
            help="Only requeue tagging; do not attempt Cloudinary re-hosting.",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        skip_rehost = bool(options["skip_rehost"])

        queryset = WardrobeItem.objects.all().order_by("created_at")
        if limit is not None:
            queryset = queryset[:limit]

        processed = 0
        rehosted = 0
        requeued = 0

        for item in queryset:
            processed += 1
            original_image_url = item.image_url or ""
            image_url = original_image_url
            primary_color = None

            if not skip_rehost and image_url.startswith(("http://", "https://")) and not is_cloudinary_url(image_url):
                try:
                    cloudinary_result = normalize_image_source_to_cloudinary(image_url)
                    image_url = cloudinary_result.get("secure_url", image_url)
                    primary_color = cloudinary_result.get("primary_color")
                except Exception as exc:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Item {item.id}: Cloudinary rehost skipped ({exc})"
                        )
                    )

            changed = False
            if image_url and image_url != item.image_url:
                item.image_url = image_url
                changed = True

            if primary_color and primary_color != item.primary_color:
                item.primary_color = primary_color
                changed = True

            if item.tagging_status != "pending":
                item.tagging_status = "pending"
                changed = True

            if changed:
                item.save(update_fields=["image_url", "primary_color", "tagging_status", "updated_at"])

            enqueue_tagging_job(str(item.id), image_url=item.image_url or "")
            requeued += 1

            if image_url != original_image_url:
                rehosted += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Backfill complete. Processed={processed}, rehosted={rehosted}, requeued={requeued}"
            )
        )
