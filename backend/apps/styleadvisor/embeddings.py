"""Semantic embeddings for style knowledge retrieval.

Uses the Gemini embedding model (google.genai SDK) when a GEMINI_API_KEY is
present. If the embedding call fails (no key, network, SDK shape changes) it
returns None and retrieval falls back to keyword/tag scoring, so the feature
never hard-fails.
"""

from __future__ import annotations

import math
import os


def generate_embedding(text: str) -> list[float] | None:
    """Return a dense embedding vector for ``text``, or None when unavailable."""
    if not text or not text.strip():
        return None

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model_name = os.getenv("STYLEADVISOR_EMBEDDING_MODEL", "text-embedding-004")

    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=api_key)
        response = client.models.embed_content(model=model_name, contents=[text])
        embedding = _extract_embedding(response)
        return [float(value) for value in embedding] if embedding else None
    except Exception:
        return None


def _extract_embedding(result) -> list[float] | None:
    """Best-effort extraction of the embedding vector from SDK response shapes."""
    if result is None:
        return None

    # google.genai embed_content -> result.embeddings[0].values
    if hasattr(result, "embeddings") and result.embeddings:
        first = result.embeddings[0]
        if hasattr(first, "values"):
            return list(first.values)
        if hasattr(first, "embedding"):
            return _extract_embedding(first)

    # Older response shapes
    if hasattr(result, "embedding"):
        embedding = result.embedding
        if hasattr(embedding, "values"):
            return list(embedding.values)
        if isinstance(embedding, (list, tuple)):
            return list(embedding)

    if isinstance(result, dict):
        embedding = result.get("embedding") or result.get("values")
        if isinstance(embedding, (list, tuple)):
            return list(embedding)
        if isinstance(result.get("embeddings"), list) and result["embeddings"]:
            return _extract_embedding(result["embeddings"][0])

    if isinstance(result, (list, tuple)) and result and all(isinstance(v, (int, float)) for v in result):
        return list(result)

    return None


def cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    """Cosine similarity between two vectors; 0.0 when either is empty."""
    if not vector_a or not vector_b:
        return 0.0

    length = min(len(vector_a), len(vector_b))
    if length == 0:
        return 0.0

    dot = sum(vector_a[i] * vector_b[i] for i in range(length))
    norm_a = math.sqrt(sum(value * value for value in vector_a))
    norm_b = math.sqrt(sum(value * value for value in vector_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)