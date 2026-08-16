from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .retriever import upload_knowledge_chunk
from .services import StyleAdvisorInput, StyleAdvisorService
from .serializers import (
    KnowledgeUploadSerializer,
    ShoppingSuggestionSerializer,
    StyleCompleteSerializer,
    StyleKnowledgeChunkSerializer,
)


style_advisor_service = StyleAdvisorService()


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
        try:
            data = serializer.validated_data
            saved_suggestions = style_advisor_service.generate_shopping_suggestions(
                request.user,
                StyleAdvisorInput(
                    occasion_description=data["occasion_description"],
                    occasion_formality=data["occasion_formality"],
                    current_item_descriptions=data["current_item_descriptions"],
                    occasion_id=str(data["occasion_id"]) if data.get("occasion_id") else None,
                ),
            )
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
