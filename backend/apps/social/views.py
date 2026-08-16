from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comment, OutfitShare, Vote
from .serializers import CommentSerializer, OutfitShareSerializer, VoteSerializer


class OutfitShareViewSet(viewsets.ModelViewSet):
    serializer_class = OutfitShareSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OutfitShare.objects.all().select_related("user").prefetch_related("comments__user", "votes")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        shares = (
            OutfitShare.objects.filter(visibility__in=[OutfitShare.Visibility.PUBLIC, OutfitShare.Visibility.FRIENDS])
            .select_related("user")
            .prefetch_related("comments__user", "votes")
            .order_by("-shared_at")
        )
        serializer = OutfitShareSerializer(shares, many=True)
        return Response(serializer.data)
