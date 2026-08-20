from rest_framework import serializers

from .models import PackingList, PackingListItem, Trip, TripEvent


class TripEventSerializer(serializers.ModelSerializer):
    trip = serializers.PrimaryKeyRelatedField(queryset=Trip.objects.all(), required=False)

    class Meta:
        model = TripEvent
        fields = [
            "id",
            "trip",
            "name",
            "date",
            "formality_required",
            "location",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PackingListItemSerializer(serializers.ModelSerializer):
    wardrobe_item_id = serializers.UUIDField(source="wardrobe_item.id", read_only=True)
    wardrobe_item_name = serializers.CharField(source="wardrobe_item.name", read_only=True)
    wardrobe_item_category = serializers.CharField(source="wardrobe_item.category", read_only=True)
    wardrobe_item_image = serializers.CharField(source="wardrobe_item.image_url", read_only=True)

    class Meta:
        model = PackingListItem
        fields = [
            "id",
            "wardrobe_item_id",
            "wardrobe_item_name",
            "wardrobe_item_category",
            "wardrobe_item_image",
            "covers_event_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PackingListSerializer(serializers.ModelSerializer):
    items = PackingListItemSerializer(many=True, read_only=True)

    class Meta:
        model = PackingList
        fields = ["id", "trip", "items", "created_at", "updated_at"]
        read_only_fields = fields


class TripSerializer(serializers.ModelSerializer):
    trip_events = TripEventSerializer(many=True, required=False)
    packing_lists = PackingListSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "user",
            "name",
            "destination",
            "start_date",
            "end_date",
            "description",
            "trip_events",
            "packing_lists",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at", "packing_lists"]

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "end_date must be on or after start_date."})
        return attrs

    def create(self, validated_data):
        trip_events = validated_data.pop("trip_events", [])
        trip = Trip.objects.create(**validated_data)

        for event_data in trip_events:
            event_data.pop("trip", None)
            TripEvent.objects.create(trip=trip, **event_data)

        return trip

    def update(self, instance, validated_data):
        trip_events = validated_data.pop("trip_events", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if trip_events is not None:
            instance.trip_events.all().delete()
            for event_data in trip_events:
                event_data.pop("trip", None)
                TripEvent.objects.create(trip=instance, **event_data)

        return instance
