from __future__ import annotations

import json
import os
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


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


# ---------------------------------------------------------------------------
# Gemini File Search Store — the current, documented File Search API.
#   - persistent store: get/create once, reused (never per-request create)
#   - ingestion uploads files into the store (auto chunked/embedded/indexed)
#   - Style Advisor supplies the store as a `file_search` tool to Gemini
# ---------------------------------------------------------------------------

_FILE_SEARCH_CACHE: dict[str, object] = {}


def get_file_search_store(client=None):
    """Return the persistent File Search Store (get or create, cached).

    Configure the resource name with the ``GEMINI_RAG_STORE`` env var (e.g.
    ``fileSearchStores/xxx``). When unset, a store with the stable display name
    ``charis-style-knowledge`` is created once and then found by name.
    """
    if client is None:
        client = get_genai_client()
    if client is None:
        return None

    display_name = os.getenv("GEMINI_RAG_STORE", "charis-style-knowledge")

    if display_name in _FILE_SEARCH_CACHE:
        return _FILE_SEARCH_CACHE[display_name]

    # Fast path: env holds a server-side resource name.
    if "/" in display_name:
        try:
            store = client.file_search_stores.get(name=display_name)
            _FILE_SEARCH_CACHE[display_name] = store
            return store
        except Exception:
            pass

    # Find an existing store by display name before creating a new one.
    try:
        page = client.file_search_stores.list()
        try:
            stores = list(page)
        except TypeError:
            stores = getattr(page, "file_search_stores", None) or []
        for store in stores:
            if getattr(store, "display_name", "") == display_name:
                _FILE_SEARCH_CACHE[display_name] = store
                return store
    except Exception:
        pass

    try:
        from google.genai import types  # type: ignore

        store = client.file_search_stores.create(
            config=types.CreateFileSearchStoreConfig(display_name=display_name)
        )
        _FILE_SEARCH_CACHE[display_name] = store
        return store
    except Exception:
        return None


def wait_for_operation(client, operation, timeout_seconds: int = 180):
    """Poll a File Search upload/import operation until done (best effort)."""
    try:
        op = operation
        name = getattr(op, "name", None) or getattr(getattr(op, "operation", None), "name", None)
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            if getattr(op, "done", False):
                return op
            if name:
                op = client.operations.get(name=name)
            if getattr(op, "done", False):
                return op
            time.sleep(3)
    except Exception:
        pass
    return operation


def upload_content_to_store(client, store_name: str, content: str, filename: str, metadata: dict | None = None) -> str:
    """Upload ``content`` into the File Search Store and wait for completion.

    Returns a reference (operation/document name) on success, or "" on failure.
    """
    temp_path: str | None = None
    try:
        from google.genai import types  # type: ignore

        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as handle:
            handle.write(content)
            temp_path = handle.name

        custom_metadata = []
        for key, value in (metadata or {}).items():
            if isinstance(value, str) and value:
                custom_metadata.append(types.CustomMetadata(key=key, string_value=value))

        operation = client.file_search_stores.upload_to_file_search_store(
            file_search_store_name=store_name,
            file=temp_path,
            config=types.UploadToFileSearchStoreConfig(
                mime_type="text/markdown",
                display_name=filename,
                custom_metadata=custom_metadata or None,
            ),
        )

        wait_for_operation(client, operation)
        return (
            getattr(operation, "name", "")
            or getattr(getattr(operation, "operation", None), "name", "")
            or store_name
        )
    except Exception:
        return ""
    finally:
        if temp_path:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except OSError:
                pass


def generate_gemini_text_with_file_search(
    model_name: str,
    prompt: str,
    store_name: str,
) -> tuple[str, list[dict]]:
    """Call Gemini with the File Search Store attached as a ``file_search`` tool.

    Returns ``(text, citations)`` where citations is a list of
    ``{"uri": ..., "title": ...}`` entries for the knowledge files used.
    """
    client = get_genai_client()
    if client is None:
        return ("", [])

    from google.genai import types  # type: ignore

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[
                types.Tool(
                    file_search=types.FileSearch(
                        file_search_store_names=[store_name],
                        top_k=5,
                    )
                )
            ],
        ),
    )
    text = _extract_candidate_text(response)
    return (text, _extract_citations(response))


def _extract_citations(response) -> list[dict]:
    """Pull source info from Gemini's citation annotations, if present."""
    citations: list[dict] = []
    for citation in getattr(response, "citations", None) or []:
        source = getattr(citation, "source", None)
        uri = getattr(source, "uri", "") or ""
        title = getattr(source, "title", "") or uri
        file_search = getattr(source, "file_search_source", None)
        if file_search and not title:
            title = getattr(file_search, "display_name", "") or getattr(file_search, "document", "") or ""
        if uri or title:
            citations.append({"uri": uri, "title": title})
    return citations