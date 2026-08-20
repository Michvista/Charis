from rest_framework import serializers

from .models import Outfit


class OutfitSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Outfit
        fields = [
            "id",
            "user",
            "user_email",
            "outfit_id",
            "name",
            "score",
            "verdict",
            "visual_notes",
            "items",
            "item_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "user_email", "item_count", "created_at", "updated_at"]