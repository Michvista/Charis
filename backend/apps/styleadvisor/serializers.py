from rest_framework import serializers

from .models import ShoppingSuggestion, StyleKnowledgeChunk, WishlistItem


class WishlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "user",
            "suggestion_id",
            "occasion_description",
            "item_description",
            "reason",
            "priority",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class StyleKnowledgeChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = StyleKnowledgeChunk
        fields = [
            "id",
            "title",
            "content",
            "tags",
            "embedding_ref",
            "source_file",
            "content_hash",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "embedding_ref", "source_file", "content_hash", "created_at", "updated_at"]


class ShoppingSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShoppingSuggestion
        fields = [
            "id",
            "user",
            "occasion_id",
            "occasion_description",
            "item_description",
            "reason",
            "priority",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class KnowledgeUploadSerializer(serializers.Serializer):
    content = serializers.CharField()
    tags = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        required=False,
        default=list,
    )


class StyleCompleteSerializer(serializers.Serializer):
    occasion_description = serializers.CharField()
    occasion_formality = serializers.IntegerField(min_value=1, max_value=5)
    current_item_descriptions = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )
    occasion_id = serializers.UUIDField(required=False, allow_null=True)
