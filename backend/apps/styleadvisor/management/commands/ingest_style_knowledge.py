from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.styleadvisor.ingestion import ingest_knowledge_folder


class Command(BaseCommand):
    help = (
        "Ingest backend/knowledge/*.md into the style knowledge base. "
        "Idempotent: unchanged files are skipped, changed files are updated, "
        "and --force re-uploads everything."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-ingest every knowledge file even if unchanged.",
        )

    def handle(self, *args, **options):
        force = bool(options["force"])
        summary = ingest_knowledge_folder(force=force)
        self.stdout.write(
            self.style.SUCCESS(
                f"Ingestion complete — created: {summary['created']}, "
                f"updated: {summary['updated']}, skipped: {summary['skipped']}, "
                f"failed: {summary['failed']}"
            )
        )