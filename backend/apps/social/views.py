from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comment, Friendship, OutfitShare, Vote
from .serializers import (
    CommentSerializer,
    FriendshipSerializer,
    OutfitShareSerializer,
    VoteSerializer,
)


def _friendship_filter(user):
    return Q(requester=user) | Q(addressee=user)


def _accepted_friend_ids(user):
    if not user or not user.is_authenticated:
        return set()

    friend_ids: set[int] = set()
    for requester_id, addressee_id in (
        Friendship.objects.filter(status=Friendship.Status.ACCEPTED)
        .filter(_friendship_filter(user))
        .values_list("requester_id", "addressee_id")
    ):
        friend_ids.add(addressee_id if requester_id == user.id else requester_id)
    return friend_ids


class OutfitShareViewSet(viewsets.ModelViewSet):
    serializer_class = OutfitShareSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        friend_ids = _accepted_friend_ids(user)
        return (
            OutfitShare.objects.filter(
                Q(user=user)
                | Q(visibility=OutfitShare.Visibility.PUBLIC)
                | (
                    Q(visibility=OutfitShare.Visibility.FRIENDS)
                    & Q(user_id__in=friend_ids)
                )
            )
            .select_related("user")
            .prefetch_related("comments__user", "votes")
            .distinct()
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        share = self.get_object()
        if share.user_id != self.request.user.id:
            raise PermissionDenied("You can only modify your own outfit shares.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user_id != self.request.user.id:
            raise PermissionDenied("You can only delete your own outfit shares.")
        instance.delete()

    @action(detail=True, methods=["post"], url_path="comments")
    def add_comment(self, request, pk=None):
        share = self.get_object()
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(share=share, user=request.user)
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="vote")
    def add_vote(self, request, pk=None):
        share = self.get_object()
        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        existing = Vote.objects.filter(share=share, user=request.user).first()

        if existing:
            existing.value = serializer.validated_data["value"]
            existing.save(update_fields=["value", "updated_at"])
            return Response(
                VoteSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        vote = serializer.save(share=share, user=request.user)
        return Response(VoteSerializer(vote).data, status=status.HTTP_201_CREATED)


class OutfitShareFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friend_ids = _accepted_friend_ids(request.user)
        shares = (
            OutfitShare.objects.filter(
                Q(visibility=OutfitShare.Visibility.PUBLIC)
                | (
                    Q(visibility=OutfitShare.Visibility.FRIENDS)
                    & Q(user_id__in=friend_ids)
                )
            )
            .select_related("user")
            .prefetch_related("comments__user", "votes")
            .order_by("-shared_at")
            .distinct()
        )
        serializer = OutfitShareSerializer(shares, many=True)
        return Response(serializer.data)


class FriendshipViewSet(viewsets.ModelViewSet):
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Friendship.objects.filter(_friendship_filter(self.request.user))
            .select_related("requester", "addressee")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        friendship = self.get_object()
        if friendship.addressee_id != request.user.id:
            raise PermissionDenied("Only the invited user can accept this friendship.")

        friendship.status = Friendship.Status.ACCEPTED
        if friendship.accepted_at is None:
            from django.utils import timezone

            friendship.accepted_at = timezone.now()
        friendship.save(update_fields=["status", "accepted_at", "updated_at"])
        return Response(FriendshipSerializer(friendship).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        friendship = self.get_object()
        if friendship.addressee_id != request.user.id:
            raise PermissionDenied("Only the invited user can reject this friendship.")

        friendship.status = Friendship.Status.REJECTED
        friendship.save(update_fields=["status", "updated_at"])
        return Response(FriendshipSerializer(friendship).data, status=status.HTTP_200_OK)
