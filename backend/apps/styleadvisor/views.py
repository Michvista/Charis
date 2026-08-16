from __future__ import annotations

import json
import os

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ShoppingSuggestion
from .retriever import retrieve_relevant_chunks, upload_knowledge_chunk
from .serializers import (
    KnowledgeUploadSerializer,
    ShoppingSuggestionSerializer,
    StyleCompleteSerializer,
    StyleKnowledgeChunkSerializer,
)


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


class StyleKnowledgeUploadView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = KnowledgeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        chunk = upload_knowledge_chunk(
            content=serializer.validated_data["content"],
            tags=serializer.validated_data.get("tags", []),
        )
        return Response(
            StyleKnowledgeChunkSerializer(chunk).data,
            status=status.HTTP_201_CREATED,
        )


class StyleCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StyleCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            chunks = retrieve_relevant_chunks(data["occasion_description"])
            chunk_text = "\n".join(
                f"- {chunk.content} [tags: {chunk.tags}]"
                for chunk in chunks
            )

            prompt = (
                "You are a fashion stylist. The user is attending:\n"
                f"{data['occasion_description']} (formality {data['occasion_formality']}/5).\n"
                f"They currently have: {', '.join(data['current_item_descriptions'])}.\n\n"
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

            genai = _get_genai()
            model_name = os.getenv("STYLEADVISOR_MODEL", "gemini-2.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            raw_text = getattr(response, "text", "") or ""

            start = raw_text.find("{")
            end = raw_text.rfind("}")
            candidate = raw_text[start : end + 1] if start != -1 and end >= start else raw_text
            payload = json.loads(candidate)
            suggestions = payload.get("suggestions", [])
            if not isinstance(suggestions, list):
                raise ValueError("Gemini response missing suggestions list.")

            saved_suggestions = []
            with transaction.atomic():
                for suggestion in suggestions:
                    if not isinstance(suggestion, dict):
                        continue
                    priority = str(suggestion.get("priority", "low")).strip().lower()
                    if priority not in {"high", "medium", "low"}:
                        raise ValueError("Invalid priority returned by Gemini.")
                    saved = ShoppingSuggestion.objects.create(
                        user=request.user,
                        occasion_id=data.get("occasion_id"),
                        occasion_description=data["occasion_description"],
                        item_description=str(suggestion.get("item_description", "")).strip(),
                        reason=str(suggestion.get("reason", "")).strip(),
                        priority=priority,
                    )
                    saved_suggestions.append(saved)

            return Response(
                {
                    "suggestions": ShoppingSuggestionSerializer(saved_suggestions, many=True).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
