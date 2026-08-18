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


class StyleAdvisorService:
    def __init__(
        self,
        model_name: str | None = None,
        retriever_model_name: str | None = None,
    ) -> None:
        self.model_name = model_name or os.getenv("STYLEADVISOR_MODEL", "gemini-1.5-flash")
        self.retriever_model_name = retriever_model_name or os.getenv(
            "STYLEADVISOR_RETRIEVER_MODEL",
            self.model_name,
        )

    def _build_prompt(self, occasion_description: str, occasion_formality: int, current_item_descriptions: list[str]) -> str:
        chunks = retrieve_relevant_chunks(
            occasion_description,
            model_name=self.retriever_model_name,
        )
        chunk_text = "\n".join(
            f"- {chunk.content} [tags: {chunk.tags}]"
            for chunk in chunks
        )

        return (
            "You are a fashion stylist. The user is attending:\n"
            f"{occasion_description} (formality {occasion_formality}/5).\n"
            f"They currently have: {', '.join(current_item_descriptions)}.\n\n"
            f"Relevant style rules:\n{chunk_text}\n\n"
            "What items are they missing to complete this look?\n"
            "Return ONLY valid JSON:\n"
            "{\n"
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
    ) -> list[ShoppingSuggestion]:
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

        return saved_suggestions
