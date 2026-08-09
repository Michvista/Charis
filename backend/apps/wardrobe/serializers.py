from rest_framework import serializers
from .models import WardrobeItem, Season

class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ['id', 'name']

class WardrobeItemSerializer(serializers.ModelSerializer):
    seasons = SeasonSerializer(many=True, read_only=True)
    seasons_ids = serializers.PrimaryKeyRelatedField(
        queryset= Season.objects.all(),
        many = True,
        write_only=True,
        source="seasons",
        required=False
    )

    class Meta:
        model = WardrobeItem
        fields = [
            'id', 'user', 'name', 'category', 'primary_color', 
            'secondary_color', 'fabric', 'formality_level', 
            'seasons', 'seasons_ids', 'brand', 'image_url', 
            'tagging_status', 'times_worn', 'purchase_price', 
            'purchase_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'tagging_status', 
                            'times_worn', 'created_at', 'updated_at']
        