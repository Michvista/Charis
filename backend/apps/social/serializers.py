from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.outfits.models import Outfit
from apps.outfits.serializers import OutfitSerializer

from .models import Comment, Friendship, OutfitShare, Vote

User = get_user_model()


class CommentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "share", "user", "user_email", "text", "created_at", "updated_at"]
        read_only_fields = ["id", "share", "user", "user_email", "created_at", "updated_at"]


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ["id", "share", "user", "value", "created_at", "updated_at"]
        read_only_fields = ["id", "share", "user", "created_at", "updated_at"]

    def validate_value(self, value):
        if value not in (1, -1):
            raise serializers.ValidationError("Vote value must be 1 or -1.")
        return value


class OutfitShareSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    vote_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    vote_breakdown = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    outfit = serializers.SerializerMethodField()

    class Meta:
        model = OutfitShare
        fields = [
            "id",
            "user",
            "user_email",
            "outfit_id",
            "outfit",
            "caption",
            "visibility",
            "shared_at",
            "vote_count",
            "comment_count",
            "vote_breakdown",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_email",
            "outfit",
            "shared_at",
            "vote_count",
            "comment_count",
            "vote_breakdown",
            "comments",
            "created_at",
            "updated_at",
        ]

    def get_outfit(self, obj):
        outfit = Outfit.objects.filter(outfit_id=obj.outfit_id).first()
        if outfit is None:
            return None
        return OutfitSerializer(outfit).data

    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_vote_breakdown(self, obj):
        upvotes = obj.votes.filter(value=1).count()
        downvotes = obj.votes.filter(value=-1).count()
        return {"upvotes": upvotes, "downvotes": downvotes}


class FriendshipSerializer(serializers.ModelSerializer):
    requester_email = serializers.EmailField(source="requester.email", read_only=True)
    addressee_email = serializers.EmailField(source="addressee.email", read_only=True)
    friend_user_id = serializers.UUIDField(write_only=True, required=True)

    class Meta:
        model = Friendship
        fields = [
            "id",
            "requester",
            "requester_email",
            "addressee",
            "addressee_email",
            "friend_user_id",
            "status",
            "accepted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requester",
            "requester_email",
            "addressee",
            "addressee_email",
            "status",
            "accepted_at",
            "created_at",
            "updated_at",
        ]

    def validate_friend_user_id(self, value):
        if self.context.get("request") and str(self.context["request"].user.id) == str(value):
            raise serializers.ValidationError("You cannot friend yourself.")
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value

    def create(self, validated_data):
        friend_user_id = validated_data.pop("friend_user_id")
        addressee = User.objects.get(id=friend_user_id)
        requester = self.context["request"].user
        existing = Friendship.objects.filter(
            (
                Q(requester=requester, addressee=addressee)
                | Q(requester=addressee, addressee=requester)
            )
        ).first()
        if existing:
            raise serializers.ValidationError(
                {"friend_user_id": "A friendship already exists between these users."}
            )
        return Friendship.objects.create(
            requester=requester,
            addressee=addressee,
            status=Friendship.Status.PENDING,
        )
