from rest_framework import serializers

from .models import Comment, OutfitShare, Vote


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

    class Meta:
        model = OutfitShare
        fields = [
            "id",
            "user",
            "user_email",
            "outfit_id",
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
            "shared_at",
            "vote_count",
            "comment_count",
            "vote_breakdown",
            "comments",
            "created_at",
            "updated_at",
        ]

    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_vote_breakdown(self, obj):
        upvotes = obj.votes.filter(value=1).count()
        downvotes = obj.votes.filter(value=-1).count()
        return {"upvotes": upvotes, "downvotes": downvotes}
