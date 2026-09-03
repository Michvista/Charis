"""Ingest ``backend/knowledge/*.md`` into the StyleKnowledgeChunk knowledge base.

Idempotent: files are identified by ``source_file`` + a SHA-256 ``content_hash``.
Running ingestion twice never duplicates records; editing a file re-ingests only
that file; ``--force`` re-uploads everything.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from django.conf import settings

from .models import StyleKnowledgeChunk
from .retriever import update_knowledge_chunk, upload_knowledge_chunk

KNOWLEDGE_DIR = Path(settings.BASE_DIR) / "knowledge"

# Base tags per knowledge file — used to seed metadata so retrieval never has to
# rely on Gemini to guess what a document is about.
BASE_TAGS = {
    "dress_codes.md": [
        "dress_code",
        "formal",
        "semi_formal",
        "smart_casual",
        "casual",
        "wedding",
        "black_tie",
        "business",
    ],
    "fabrics.md": [
        "fabrics",
        "linen",
        "cotton",
        "wool",
        "silk",
        "denim",
        "breathability",
        "texture",
        "seasons",
    ],
    "color_theory.md": [
        "color",
        "color_theory",
        "neutrals",
        "patterns",
        "complementary",
        "coordination",
    ],
    "seasonal_dressing.md": [
        "seasons",
        "summer",
        "winter",
        "spring",
        "fall",
        "layering",
        "weather",
    ],
    "occasion_styling.md": [
        "occasion",
        "event",
        "formal",
        "casual",
        "beach",
        "wedding",
        "business",
        "travel",
    ],
    "outfit_coordination.md": [
        "coordination",
        "proportions",
        "layering",
        "silhouette",
        "balance",
        "outfit",
    ],
    "footwear.md": [
        "footwear",
        "shoes",
        "formal",
        "casual",
        "sneakers",
        "boots",
        "loafers",
    ],
    "accessories.md": [
        "accessories",
        "belt",
        "watch",
        "bag",
        "scarf",
        "jewelry",
    ],
    "body_and_fit.md": [
        "fit",
        "silhouette",
        "tailoring",
        "proportions",
        "body",
    ],
}

# Keyword -> tag mapping used to enrich metadata from the file contents.
KEYWORD_TAGS = {
    "linen": "linen",
    "cotton": "cotton",
    "wool": "wool",
    "silk": "silk",
    "denim": "denim",
    "breathab": "breathability",
    "formal": "formal",
    "black tie": "black_tie",
    "semi-formal": "semi_formal",
    "smart casual": "smart_casual",
    "casual": "casual",
    "wedding": "wedding",
    "beach": "beach",
    "business": "business",
    "travel": "travel",
    "layering": "layering",
    "fit": "fit",
    "silhouette": "silhouette",
    "tailoring": "tailoring",
    "footwear": "footwear",
    "shoe": "footwear",
    "accessor": "accessories",
    "color": "color_theory",
    "pattern": "patterns",
    "proportion": "proportions",
    "season": "seasons",
    "summer": "summer",
    "winter": "winter",
    "spring": "spring",
    "fall": "fall",
}


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _title_from_filename(filename: str) -> str:
    return filename.replace(".md", "").replace("_", " ").title()


def derive_tags(filename: str, content: str) -> list[str]:
    tags = list(BASE_TAGS.get(filename, []))
    lowered = content.lower()
    for keyword, tag in KEYWORD_TAGS.items():
        if keyword in lowered and tag not in tags:
            tags.append(tag)
    return tags


def ingest_knowledge_file(path: Path, force: bool = False) -> tuple[str, str]:
    """Ingest a single markdown file. Returns ``(status, filename)``.

    status is one of: created | updated | skipped | failed
    """
    filename = path.name
    content = path.read_text(encoding="utf-8")
    digest = content_hash(content)
    tags = derive_tags(filename, content)
    title = _title_from_filename(filename)

    existing = StyleKnowledgeChunk.objects.filter(source_file=filename).first()

    if existing is None:
        upload_knowledge_chunk(
            content=content,
            tags=tags,
            title=title,
            source_file=filename,
            content_hash=digest,
        )
        return ("created", filename)

    if existing.content_hash == digest and not force:
        return ("skipped", filename)

    update_knowledge_chunk(
        existing,
        content=content,
        tags=tags,
        title=title,
        source_file=filename,
        content_hash=digest,
    )
    return ("updated", filename)


def ingest_knowledge_folder(force: bool = False) -> dict[str, int]:
    """Ingest every ``*.md`` file in the knowledge directory.

    Returns a summary dict like {"created": 9, "updated": 0, "skipped": 0, "failed": 0}.
    """
    if not KNOWLEDGE_DIR.exists():
        print(f"Knowledge directory not found: {KNOWLEDGE_DIR}")
        return {"created": 0, "updated": 0, "skipped": 0, "failed": 0}

    files = sorted(KNOWLEDGE_DIR.glob("*.md"))
    print(f"Found {len(files)} knowledge files.")
    print()

    summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}

    for path in files:
        try:
            status, filename = ingest_knowledge_file(path, force=force)
            summary[status] += 1
            symbol = {"created": "+", "updated": "~", "skipped": "-"}.get(status, "!")
            detail = {"created": "created", "updated": "updated", "skipped": "unchanged"}.get(status, "failed")
            print(f"{symbol} {filename} ({detail})")
        except Exception as exc:  # pragma: no cover - unexpected file/IO errors
            summary["failed"] += 1
            print(f"! {path.name} (failed: {exc})")

    print()
    print(f"{len(files)} files processed.")
    print(f"{summary['failed']} failed.")
    return summary