from __future__ import annotations

import logging
import re
import tempfile
import uuid
from pathlib import Path

from .embeddings import cosine_similarity, generate_embedding
from .gemini_client import query_rag_corpus, sync_corpus_document
from .models import StyleKnowledgeChunk

logger = logging.getLogger("styleadvisor")


def _document_metadata(source_file: str, title: str, content_hash: str, tags: list) -> dict:
    return {
        "source_file": source_file,
        "title": title,
        "content_hash": content_hash,
        "tags": ",".join(tags or []),
    }


def _upload_content_to_gemini(content: str, previous_ref: str = "") -> str:
    """Upload ``content`` to Gemini file storage and return the reference.

    Retained for backward compatibility; new code uses ``sync_corpus_document``.
    """
    from .gemini_client import upload_gemini_file

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


def _sync_corpus(content: str, source_file: str, title: str, content_hash: str, tags: list) -> str:
    """Ensure the knowledge is indexed in the persistent File Search corpus."""
    document_id = source_file or title or f"chunk-{uuid.uuid4()}"
    return sync_corpus_document(
        content=content,
        document_id=document_id,
        metadata=_document_metadata(source_file, title, content_hash, tags),
    )


def upload_knowledge_chunk(
    content: str,
    tags: list,
    title: str = "",
    source_file: str = "",
    content_hash: str = "",
):
    """Persist a knowledge chunk: File Search corpus + local DB record + embedding.

    ``content_hash`` enables idempotent ingestion: callers compare hashes to
    skip or update existing records instead of creating duplicates.
    """
    corpus_ref = _sync_corpus(content, source_file, title, content_hash, tags)
    embedding = generate_embedding(content) or []

    return StyleKnowledgeChunk.objects.create(
        title=title,
        content=content,
        tags=tags,
        embedding_ref=corpus_ref,
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
    """Refresh an existing knowledge chunk (corpus doc, content, tags, hash, embedding)."""
    corpus_ref = _sync_corpus(content, source_file, title, content_hash, tags) or chunk.embedding_ref
    embedding = generate_embedding(content) or []

    chunk.title = title
    chunk.content = content
    chunk.tags = tags
    chunk.embedding_ref = corpus_ref
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


def _map_file_search_results(results: list[dict], top_k: int) -> list[StyleKnowledgeChunk]:
    """Map File Search results back to local knowledge records by source_file."""
    by_source: dict[str, StyleKnowledgeChunk] = {}
    for chunk in StyleKnowledgeChunk.objects.all():
        by_source[chunk.source_file] = chunk

    selected: list[StyleKnowledgeChunk] = []
    seen: set = set()
    for result in results:
        source = (result.get("metadata") or {}).get("source_file") or ""
        chunk = by_source.get(source)
        if chunk is None or chunk.id in seen:
            continue
        seen.add(chunk.id)
        selected.append(chunk)
        if len(selected) >= top_k:
            break
    return selected


def _local_retrieval(query: str, top_k: int) -> list[StyleKnowledgeChunk]:
    """Fallback retrieval using local embeddings + lexical scoring."""
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
        scored.append((semantic + (lexical * 0.2), chunk))

    scored.sort(key=lambda item: item[0], reverse=True)

    selected = [chunk for score, chunk in scored[:top_k] if score > 0]
    return selected or chunks[:top_k]


def retrieve_relevant_chunks(query: str, top_k: int = 5, model_name: str | None = None):
    """Retrieve the most relevant knowledge chunks for ``query``.

    Primary mechanism is Gemini File Search (semantic retrieval against the
    persistent corpus). If File Search is unavailable or returns nothing, we fall
    back to local embedding cosine similarity + lexical scoring so retrieval
    always works (and stays unit-testable offline).
    """
    file_search_results = query_rag_corpus(query, top_k=top_k)
    selected = _map_file_search_results(file_search_results, top_k)
    source = "file-search"

    if not selected:
        selected = _local_retrieval(query, top_k)
        source = "local"

    logger.info("Query: %s (retrieval: %s)", query, source)
    logger.info(
        "Retrieved: %s",
        ", ".join(chunk.source_file or chunk.title or chunk.content[:40] for chunk in selected),
    )
    return selected