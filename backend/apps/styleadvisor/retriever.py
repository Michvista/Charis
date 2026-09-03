from __future__ import annotations

import logging
import re
import tempfile
from pathlib import Path

from .embeddings import cosine_similarity, generate_embedding
from .gemini_client import upload_gemini_file
from .models import StyleKnowledgeChunk

logger = logging.getLogger("styleadvisor")


def _upload_content_to_gemini(content: str, previous_ref: str = "") -> str:
    """Upload ``content`` to Gemini file storage and return the reference."""
    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
            handle.write(content)
            temp_path = handle.name
        return upload_gemini_file(temp_path) or previous_ref
    except Exception:
        return previous_ref
    finally:
        if temp_path:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except OSError:
                pass


def upload_knowledge_chunk(
    content: str,
    tags: list,
    title: str = "",
    source_file: str = "",
    content_hash: str = "",
):
    """Persist a knowledge chunk locally and to Gemini file storage.

    ``content_hash`` enables idempotent ingestion: callers compare hashes to
    skip or update existing records instead of creating duplicates.
    """
    embedding_ref = _upload_content_to_gemini(content)
    embedding = generate_embedding(content) or []

    return StyleKnowledgeChunk.objects.create(
        title=title,
        content=content,
        tags=tags,
        embedding_ref=embedding_ref,
        source_file=source_file,
        content_hash=content_hash,
        embedding=embedding,
    )


def update_knowledge_chunk(
    chunk: StyleKnowledgeChunk,
    content: str,
    tags: list,
    title: str = "",
    source_file: str = "",
    content_hash: str = "",
):
    """Refresh an existing knowledge chunk (content, tags, hash, embedding)."""
    embedding_ref = _upload_content_to_gemini(content, previous_ref=chunk.embedding_ref)
    embedding = generate_embedding(content) or []

    chunk.title = title
    chunk.content = content
    chunk.tags = tags
    chunk.embedding_ref = embedding_ref
    chunk.source_file = source_file
    chunk.content_hash = content_hash
    chunk.embedding = embedding
    chunk.save()
    return chunk


def _keyword_score(query: str, chunk: StyleKnowledgeChunk) -> float:
    """Simple lexical relevance: how many query terms appear in tags/content."""
    tokens = {
        token
        for token in re.findall(r"[a-z0-9]+", query.lower())
        if len(token) > 2
    }
    if not tokens:
        return 0.0

    tag_text = " ".join(chunk.tags or []).lower()
    content_text = (chunk.title or "") + " " + chunk.content
    content_text = content_text.lower()

    hits = sum(1 for token in tokens if token in tag_text)
    hits += sum(1 for token in tokens if token in content_text)
    return float(hits)


def retrieve_relevant_chunks(query: str, top_k: int = 5, model_name: str | None = None):
    """Semantic retrieval of the most relevant knowledge chunks for ``query``.

    Rank chunks by Gemini embedding cosine similarity, boosted by lexical
    tag/content overlap. Falls back to pure lexical scoring when embeddings are
    unavailable so retrieval always works (and is unit-testable offline).
    """
    chunks = list(StyleKnowledgeChunk.objects.order_by("created_at"))
    if not chunks:
        return []

    query_embedding = generate_embedding(query)

    scored: list[tuple[float, StyleKnowledgeChunk]] = []
    for chunk in chunks:
        semantic = (
            cosine_similarity(query_embedding, chunk.embedding)
            if query_embedding and chunk.embedding
            else 0.0
        )
        lexical = _keyword_score(query, chunk)
        score = semantic + (lexical * 0.2)
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)

    selected = [chunk for score, chunk in scored[:top_k] if score > 0]
    if not selected:
        selected = chunks[:top_k]

    logger.info("Query: %s", query)
    logger.info("Retrieved: %s", ", ".join(chunk.source_file or chunk.title or chunk.content[:40] for chunk in selected))
    return selected