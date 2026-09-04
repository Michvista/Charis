from __future__ import annotations

import os
from dataclasses import dataclass

from django.db import transaction

from .gemini_client import generate_gemini_text
from .json_utils import extract_json_object
from .models import ShoppingSuggestion
from .retriever import retrieve_relevant_chunks


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


class StyleAdvisorService:
    def __init__(
        self,
        model_name: str | None = None,
        retriever_model_name: str | None = None,
    ) -> None:
        self.model_name = model_name or os.getenv("STYLEADVISOR_MODEL", "gemini-2.5-flash")
        self.retriever_model_name = retriever_model_name or os.getenv(
            "STYLEADVISOR_RETRIEVER_MODEL",
            self.model_name,
        )

    def _build_prompt(self, occasion_description: str, occasion_formality: int, current_item_descriptions: list[str]) -> str:
        chunks = retrieve_relevant_chunks(
            occasion_description,
            top_k=5,
            model_name=self.retriever_model_name,
        )
        knowledge_blocks = []
        for chunk in chunks:
            title = chunk.title or chunk.source_file or "Style knowledge"
            tags = ", ".join(chunk.tags or [])
            header = f"### {title}" + (f" [tags: {tags}]" if tags else "")
            knowledge_blocks.append(f"{header}\n{chunk.content}")
        knowledge_text = "\n\n".join(knowledge_blocks) if knowledge_blocks else "(no knowledge retrieved)"

        owned = ", ".join(current_item_descriptions) if current_item_descriptions else "(none provided)"

        return (
            "You are a fashion stylist. Help the user complete a look for their occasion.\n\n"
            "## User request / occasion\n"
            f"{occasion_description} (formality {occasion_formality}/5)\n\n"
            "## User's current wardrobe items\n"
            f"{owned}\n\n"
            "## Relevant fashion knowledge (use this as grounding)\n"
            f"{knowledge_text}\n\n"
            "## Instructions\n"
            "- Base your advice on the retrieved knowledge; do not blindly repeat it and do not dump it verbatim.\n"
            "- Do not invent facts when the knowledge base already provides the answer.\n"
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

    def generate_shopping_suggestions(
        self,
        user,
        input_data: StyleAdvisorInput,
    ) -> StyleAdvisorResult:
        prompt = self._build_prompt(
            input_data.occasion_description,
            input_data.occasion_formality,
            input_data.current_item_descriptions,
        )
        raw_text = generate_gemini_text(self.model_name, prompt)
        payload = extract_json_object(raw_text)

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
        return StyleAdvisorResult(suggestions=saved_suggestions, summary=summary)
