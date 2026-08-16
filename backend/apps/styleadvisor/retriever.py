from __future__ import annotations

import os
import tempfile
from pathlib import Path

from .gemini_client import generate_gemini_text, upload_gemini_file
from .json_utils import extract_json_array
from .models import StyleKnowledgeChunk


def upload_knowledge_chunk(content: str, tags: list):
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
        handle.write(content)
        temp_path = handle.name

    try:
        embedding_ref = upload_gemini_file(temp_path)
        chunk = StyleKnowledgeChunk.objects.create(
            content=content,
            tags=tags,
            embedding_ref=embedding_ref,
        )
        return chunk
    finally:
        try:
            Path(temp_path).unlink(missing_ok=True)
        except OSError:
            pass


def retrieve_relevant_chunks(query: str, top_k: int = 5, model_name: str | None = None):
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

    selected_model = model_name or os.getenv(
        "STYLEADVISOR_RETRIEVER_MODEL",
        os.getenv("STYLEADVISOR_MODEL", "gemini-2.5-flash"),
    )
    raw_text = generate_gemini_text(selected_model, "\n".join(prompt_lines))

    try:
        indices = [int(value) for value in extract_json_array(raw_text)]
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
