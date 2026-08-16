from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from django.conf import settings

from .models import StyleKnowledgeChunk


def _get_genai():
    try:
        import google.generativeai as genai
    except ImportError as exc:  # pragma: no cover - dependency gate
        raise RuntimeError(
            "google-generativeai is not installed. Add it to requirements.txt and install dependencies."
        ) from exc

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    genai.configure(api_key=api_key)
    return genai


def _extract_json_array(raw_text: str) -> list[int]:
    trimmed = raw_text.strip()
    start = trimmed.find("[")
    end = trimmed.rfind("]")
    candidate = trimmed[start : end + 1] if start != -1 and end >= start else trimmed
    parsed = json.loads(candidate)
    if not isinstance(parsed, list):
        raise ValueError("Gemini did not return a JSON array.")
    return [int(value) for value in parsed]


def upload_knowledge_chunk(content: str, tags: list):
    genai = _get_genai()

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
        handle.write(content)
        temp_path = handle.name

    try:
        uploaded = genai.upload_file(path=temp_path)
        chunk = StyleKnowledgeChunk.objects.create(
            content=content,
            tags=tags,
            embedding_ref=getattr(uploaded, "uri", None) or getattr(uploaded, "name", "") or "",
        )
        return chunk
    finally:
        try:
            Path(temp_path).unlink(missing_ok=True)
        except OSError:
            pass


def retrieve_relevant_chunks(query: str, top_k: int = 5):
    genai = _get_genai()
    chunks = list(StyleKnowledgeChunk.objects.order_by("created_at"))

    if not chunks:
        return []

    prompt_lines = [
        f"Given this styling query: {query}",
        f"Which of these style rules are most relevant?",
        f"Return ONLY the indices of the top {top_k} most relevant rules as a JSON array e.g. [0,2,4]",
        "",
    ]

    for index, chunk in enumerate(chunks):
        prompt_lines.append(f"[{index}] tags={chunk.tags} content={chunk.content}")

    model_name = os.getenv("STYLEADVISOR_RETRIEVER_MODEL", os.getenv("STYLEADVISOR_MODEL", "gemini-2.5-flash"))
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("\n".join(prompt_lines))
    raw_text = getattr(response, "text", "") or ""

    try:
        indices = _extract_json_array(raw_text)
    except Exception:
        indices = list(range(min(top_k, len(chunks))))

    selected: list[StyleKnowledgeChunk] = []
    for index in indices:
        if 0 <= index < len(chunks) and chunks[index] not in selected:
            selected.append(chunks[index])
        if len(selected) >= top_k:
            break

    if not selected:
        selected = chunks[:top_k]

    return selected
