from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass


@dataclass
class GeminiTextResult:
    text: str


def _get_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return api_key


def get_genai_client():
    """Return a google.genai Client when the SDK is installed, else None."""
    try:
        from google import genai  # type: ignore

        return genai.Client(api_key=_get_api_key())
    except Exception:
        return None


def _extract_candidate_text(response: object) -> str:
    if hasattr(response, "text"):
        text = getattr(response, "text", "") or ""
        if text:
            return text
    if isinstance(response, dict):
        candidates = response.get("candidates") or []
        if candidates:
            content = candidates[0].get("content") or {}
            parts = content.get("parts") or []
            if parts:
                text = parts[0].get("text") or ""
                if text:
                    return text
    return ""


def generate_gemini_text(model_name: str, prompt: str) -> str:
    client = get_genai_client()
    if client is not None:
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
            text = _extract_candidate_text(response)
            if text:
                return text
        except Exception:
            pass  # fall back to the REST call below

    api_key = _get_api_key()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model_name, safe='')}:generateContent?key={urllib.parse.quote(api_key, safe='')}"
    payload = json.dumps(
        {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ]
                }
            ]
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:  # pragma: no cover - network/runtime dependent
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini request failed with HTTP {exc.code}: {detail}") from exc

    text = _extract_candidate_text(response_payload)
    if not text:
        raise RuntimeError("Gemini returned an empty response.")
    return text


def upload_gemini_file(file_path: str) -> str:
    """Upload a file to Gemini file storage. Retained for backward compatibility."""
    client = get_genai_client()
    if client is None:
        return ""

    try:
        uploaded = client.files.upload(file=file_path)
        return getattr(uploaded, "uri", "") or getattr(uploaded, "name", "") or ""
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Gemini File Search (Retriever) — the actual RAG store + retrieval mechanism.
# ---------------------------------------------------------------------------

_RAG_CORPUS_CACHE: dict[str, object] = {}


def get_rag_corpus(client=None):
    """Return the persistent File Search corpus (get or create, never per-request create).

    Configure the server-side corpus resource name with the ``GEMINI_RAG_CORPUS``
    environment variable (e.g. ``corpora/charis-style-knowledge``). When unset,
    the corpus is created once with a stable display name and then re-found by
    name on subsequent calls (cached in-process).
    """
    if client is None:
        client = get_genai_client()
    if client is None:
        return None

    display_name = os.getenv("GEMINI_RAG_CORPUS", "charis-style-knowledge")

    if display_name in _RAG_CORPUS_CACHE:
        return _RAG_CORPUS_CACHE[display_name]

    # Fast path: env holds a server-side resource name.
    if "/" in display_name:
        try:
            corpus = client.retrievers.get_corpus(name=display_name)
            _RAG_CORPUS_CACHE[display_name] = corpus
            return corpus
        except Exception:
            pass

    # Find an existing corpus by display name before creating a new one.
    try:
        page = client.retrievers.list_corpora()
        for corpus in getattr(page, "corpora", None) or []:
            if getattr(corpus, "display_name", "") == display_name:
                _RAG_CORPUS_CACHE[display_name] = corpus
                return corpus
    except Exception:
        pass

    try:
        corpus = client.retrievers.create_corpus(display_name=display_name)
        _RAG_CORPUS_CACHE[display_name] = corpus
        return corpus
    except Exception:
        return None


def sync_corpus_document(content: str, document_id: str, metadata: dict | None = None, client=None) -> str:
    """Create (or recreate) a document in the File Search corpus. Returns its name."""
    if client is None:
        client = get_genai_client()
    corpus = get_rag_corpus(client)
    if client is None or corpus is None:
        return ""

    corpus_name = getattr(corpus, "name", None) or corpus
    document_name = f"{corpus_name}/documents/{document_id}"

    try:
        from google.genai import types  # type: ignore

        # Remove any existing document so re-ingesting a changed file is idempotent.
        try:
            client.retrievers.delete_document(name=document_name)
        except Exception:
            pass

        contents = [types.Content(role="user", parts=[types.Part(text=content)])]
        document = client.retrievers.create_document(
            corpus=corpus_name,
            document_id=document_id,
            metadata=metadata or {},
            contents=contents,
        )
        return getattr(document, "name", "") or document_name
    except Exception:
        return ""


def query_rag_corpus(query: str, top_k: int = 5, client=None) -> list[dict]:
    """Run semantic File Search retrieval against the corpus. Returns chunk dicts."""
    if client is None:
        client = get_genai_client()
    corpus = get_rag_corpus(client)
    if client is None or corpus is None:
        return []

    corpus_name = getattr(corpus, "name", None) or corpus
    try:
        response = client.retrievers.query(corpus=corpus_name, query=query, top_k=top_k)
    except Exception:
        return []

    results: list[dict] = []
    for chunk in getattr(response, "relevant_chunks", None) or []:
        results.append(
            {
                "text": getattr(chunk, "text", "") or "",
                "metadata": getattr(chunk, "metadata", None) or {},
                "score": getattr(chunk, "relevance_score", None),
            }
        )
    return results