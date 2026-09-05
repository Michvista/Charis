from __future__ import annotations

import logging
import re

from .gemini_client import get_file_search_store, get_genai_client, upload_content_to_store
from .models import StyleKnowledgeChunk

logger = logging.getLogger("styleadvisor")


def _sync_to_store(content: str, source_file: str, title: str, content_hash: str, tags: list) -> str:
    """Upload knowledge content into the persistent File Search Store.

    Gemini File Search handles chunking, embedding and indexing internally, so
    we only sync the raw file. Returns a store reference for audit/metadata or
    "" when File Search is unavailable (local fallback handles retrieval).
    """
    client = get_genai_client()
    store = get_file_search_store(client) 
    if client is None or store is None:
        logger.warning(
            "[styleadvisor] File Search Store unavailable — knowledge saved to DB only "
            "(retrieval will fall back to local scoring)"
        )
        return ""

    store_name = getattr(store, "name", None) or store
    document_id = source_file or title or "knowledge"
    return upload_content_to_store(
        client,
        store_name,
        content,
        document_id,
        metadata={
            "source_file": source_file,
            "title": title,
            "content_hash": content_hash,
            "tags": ",".join(tags or []),
        },
    )


def upload_knowledge_chunk(
    content: str,
    tags: list,
    title: str = "",
    source_file: str = "",
    content_hash: str = "",
):
    """Persist a knowledge chunk: File Search Store + local DB record.

    ``content_hash`` enables idempotent ingestion: callers compare hashes to
    skip or update existing records instead of creating duplicates.
    """
    store_ref = _sync_to_store(content, source_file, title, content_hash, tags)
    return StyleKnowledgeChunk.objects.create(
        title=title,
        content=content,
        tags=tags,
        embedding_ref=store_ref,
        source_file=source_file,
        content_hash=content_hash,
        embedding=[],
    )


def update_knowledge_chunk(
    chunk: StyleKnowledgeChunk,
    content: str,
    tags: list,
    title: str = "",
    source_file: str = "",
    content_hash: str = "",
):
    """Refresh an existing knowledge chunk (store sync + DB record)."""
    store_ref = _sync_to_store(content, source_file, title, content_hash, tags) or chunk.embedding_ref

    chunk.title = title
    chunk.content = content
    chunk.tags = tags
    chunk.embedding_ref = store_ref
    chunk.source_file = source_file
    chunk.content_hash = content_hash
    chunk.embedding = []
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
    content_text = ((chunk.title or "") + " " + chunk.content).lower()

    hits = sum(1 for token in tokens if token in tag_text)
    hits += sum(1 for token in tokens if token in content_text)
    return float(hits)


def retrieve_relevant_chunks(query: str, top_k: int = 5, model_name: str | None = None):
    """LOCAL FALLBACK retrieval (keyword/tag scoring).

    This is NOT the primary path — the Style Advisor uses Gemini File Search as
    its primary knowledge source and only calls this when File Search is
    unavailable or fails. The log line below makes the fallback explicit.
    """
    chunks = list(StyleKnowledgeChunk.objects.order_by("created_at"))
    if not chunks:
        return []

    scored = [(_keyword_score(query, chunk), chunk) for chunk in chunks]
    scored.sort(key=lambda item: item[0], reverse=True)

    selected = [chunk for score, chunk in scored[:top_k] if score > 0]
    if not selected:
        selected = chunks[:top_k]

    logger.info(
        "[styleadvisor] FALLBACK local retrieval for '%s' -> %s",
        query,
        ", ".join(chunk.source_file or chunk.title or chunk.content[:40] for chunk in selected),
    )
    return selected