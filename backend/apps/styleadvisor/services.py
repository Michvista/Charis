from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field

from django.db import transaction

from .gemini_client import generate_gemini_text, generate_gemini_text_with_file_search, get_file_search_store
from .json_utils import extract_json_object
from .models import ShoppingSuggestion
from .retriever import retrieve_relevant_chunks

logger = logging.getLogger("styleadvisor")


@dataclass(frozen=True)
class StyleAdvisorInput:
    occasion_description: str
    occasion_formality: int
    current_item_descriptions: list[str]
    occasion_id: str | None = None


@dataclass(frozen=True)
class StyleAdvisorResult:
    suggestions: list[ShoppingSuggestion]
    summary: str
    source_files: list[str] = field(default_factory=list)
    retrieval: str = "file-search"  # "file-search" | "local"


class StyleAdvisorService:
    def __init__(
        self,
        model_name: str | None = None,
        retriever_model_name: str | None = None,
    ) -> None:
        self.model_name = model_name or os.getenv("STYLEADVISOR_MODEL", "gemini-3.6-flash")
        self.retriever_model_name = retriever_model_name or os.getenv(
            "STYLEADVISOR_RETRIEVER_MODEL",
            self.model_name,
        )

    # ------------------------------------------------------------------
    # Primary prompt (Gemini + File Search tool). No manual knowledge
    # injection — the File Search tool supplies the retrieved knowledge.
    # ------------------------------------------------------------------
    def _build_prompt_without_knowledge(
        self,
        occasion_description: str,
        occasion_formality: int,
        current_item_descriptions: list[str],
    ) -> str:
        owned = ", ".join(current_item_descriptions) if current_item_descriptions else "(none provided)"

        return (
            "You are a fashion stylist. Help the user complete a look for their occasion.\n\n"
            "## User request / occasion\n"
            f"{occasion_description} (formality {occasion_formality}/5)\n\n"
            "## User's current wardrobe items\n"
            f"{owned}\n\n"
            "## Instructions\n"
            "- Use the File Search tool to retrieve the relevant fashion knowledge "
            "(dress codes, fabrics, color, seasons, footwear, accessories, fit) and ground your "
            "answer in it. Do not dump the retrieved material verbatim.\n"
            "- Do not invent facts when the retrieved knowledge provides the answer.\n"
            "- Consider the user's actual wardrobe items and the occasion's formality.\n"
            "- Clearly distinguish what the user already owns, what is missing, and what you recommend.\n"
            "- Do not recommend an item the user already owns unless there is a specific reason to.\n"
            "- Prioritize missing pieces that complete the look for this specific occasion.\n\n"
            "## Response depth\n"
            "- Write a rich, helpful response — this is a personal styling consultation, not a bullet list.\n"
            "- `summary`: 3-5 sentences that assess the occasion and formality, summarize what the user "
            "already owns and whether it fits, and describe the overall gap the suggestions will fill.\n"
            "- For every suggestion, write a `reason` of 2-4 sentences: name which owned items fall short "
            "and why (formality, fabric, color, or season), tie the recommendation to the relevant fashion "
            "knowledge, and explain how the piece completes the look.\n"
            "- Provide 3-6 suggestions ranked by priority.\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            "  \"summary\": \"str\",\n"
            "  \"suggestions\": [\n"
            "    {\n"
            "      \"item_description\": \"str\",\n"
            "      \"reason\": \"str\",\n"
            "      \"priority\": \"high|medium|low\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )

    # ------------------------------------------------------------------
    # Fallback prompt (local retrieval): knowledge is injected manually
    # because the File Search tool is unavailable.
    # ------------------------------------------------------------------
    def _build_prompt_with_knowledge(
        self,
        occasion_description: str,
        occasion_formality: int,
        current_item_descriptions: list[str],
        chunks,
    ) -> str:
        knowledge_blocks = []
        for chunk in chunks:
            title = chunk.title or chunk.source_file or "Style knowledge"
            tags = ", ".join(chunk.tags or [])
            header = f"### {title}" + (f" [tags: {tags}]" if tags else "")
            knowledge_blocks.append(f"{header}\n{chunk.content}")
        knowledge_text = "\n\n".join(knowledge_blocks) if knowledge_blocks else "(no knowledge retrieved)"

        base = self._build_prompt_without_knowledge(occasion_description, occasion_formality, current_item_descriptions)
        # Replace the tool instruction with explicitly provided knowledge.
        base = base.replace(
            "- Use the File Search tool to retrieve the relevant fashion knowledge "
            "(dress codes, fabrics, color, seasons, footwear, accessories, fit) and ground your "
            "answer in it. Do not dump the retrieved material verbatim.\n",
            "",
        )
        return base.replace(
            "## User's current wardrobe items\n",
            "## Relevant fashion knowledge (use this as grounding)\n"
            f"{knowledge_text}\n\n"
            "## User's current wardrobe items\n",
        )

    def _try_file_search(self, input_data: StyleAdvisorInput):
        """Primary path: Gemini + File Search tool. Returns (payload, source_files) or None."""
        store = get_file_search_store()
        if store is None:
            logger.warning("[styleadvisor] File Search Store unavailable — falling back to local retrieval")
            return None

        store_name = getattr(store, "name", None) or store
        prompt = self._build_prompt_without_knowledge(
            input_data.occasion_description,
            input_data.occasion_formality,
            input_data.current_item_descriptions,
        )

        try:
            raw_text, citations = generate_gemini_text_with_file_search(self.model_name, prompt, store_name)
        except Exception as exc:
            logger.warning("[styleadvisor] File Search generation failed (%s) — falling back to local retrieval", exc)
            return None

        if not raw_text:
            logger.warning("[styleadvisor] File Search returned an empty response — falling back to local retrieval")
            return None

        payload = extract_json_object(raw_text)
        source_files = list(
            dict.fromkeys((c.get("title") or c.get("uri") or "").strip() for c in citations if c.get("title") or c.get("uri"))
        )
        return (payload, source_files)

    def generate_shopping_suggestions(
        self,
        user,
        input_data: StyleAdvisorInput,
    ) -> StyleAdvisorResult:
        primary = self._try_file_search(input_data)
        if primary is not None:
            payload, source_files = primary
            result = self._save_result(user, input_data, payload, source_files=source_files, retrieval="file-search")
            logger.info("[styleadvisor] retrieval: file-search (sources: %s)", ", ".join(source_files) or "n/a")
            return result

        # Explicit fallback: local retrieval, clearly logged.
        chunks = retrieve_relevant_chunks(
            input_data.occasion_description,
            top_k=5,
            model_name=self.retriever_model_name,
        )
        prompt = self._build_prompt_with_knowledge(
            input_data.occasion_description,
            input_data.occasion_formality,
            input_data.current_item_descriptions,
            chunks,
        )
        raw_text = generate_gemini_text(self.model_name, prompt)
        payload = extract_json_object(raw_text)
        logger.info("[styleadvisor] retrieval: local (fallback)")
        return self._save_result(user, input_data, payload, source_files=[], retrieval="local")

    def _save_result(
        self,
        user,
        input_data: StyleAdvisorInput,
        payload: dict,
        source_files: list[str],
        retrieval: str,
    ) -> StyleAdvisorResult:
        suggestions = payload.get("suggestions", [])
        if not isinstance(suggestions, list):
            raise ValueError("Gemini response missing suggestions list.")

        saved_suggestions: list[ShoppingSuggestion] = []
        with transaction.atomic():
            for suggestion in suggestions:
                if not isinstance(suggestion, dict):
                    continue

                priority = str(suggestion.get("priority", "low")).strip().lower()
                if priority not in {"high", "medium", "low"}:
                    raise ValueError("Invalid priority returned by Gemini.")

                saved = ShoppingSuggestion.objects.create(
                    user=user,
                    occasion_id=input_data.occasion_id,
                    occasion_description=input_data.occasion_description,
                    item_description=str(suggestion.get("item_description", "")).strip(),
                    reason=str(suggestion.get("reason", "")).strip(),
                    priority=priority,
                )
                saved_suggestions.append(saved)

        summary = str(payload.get("summary", "")).strip()
        return StyleAdvisorResult(
            suggestions=saved_suggestions,
            summary=summary,
            source_files=source_files,
            retrieval=retrieval,
        )