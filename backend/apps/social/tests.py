from uuid import uuid4

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Friendship, OutfitShare

User = get_user_model()


class OutfitShareAuthorizationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="Password123!",
        )
        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="Password123!",
        )
        self.friend = User.objects.create_user(
            username="friend",
            email="friend@example.com",
            password="Password123!",
        )
        self.public_share = OutfitShare.objects.create(
            user=self.owner,
            outfit_id=uuid4(),
            caption="Public fit",
            visibility=OutfitShare.Visibility.PUBLIC,
        )
        self.link_only_share = OutfitShare.objects.create(
            user=self.owner,
            outfit_id=uuid4(),
            caption="Private fit",
            visibility=OutfitShare.Visibility.LINK_ONLY,
        )
        self.friend_share = OutfitShare.objects.create(
            user=self.friend,
            outfit_id=uuid4(),
            caption="Friend fit",
            visibility=OutfitShare.Visibility.FRIENDS,
        )
        self.friendship = Friendship.objects.create(
            requester=self.friend,
            addressee=self.viewer,
            status=Friendship.Status.ACCEPTED,
            accepted_at=timezone.now(),
        )
        self.list_url = reverse("outfit-share-list")
        self.friendship_list_url = reverse("friendship-list")

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_public_shares_are_visible_but_link_only_shares_are_hidden(self):
        self._auth(self.viewer)

        response = self.client.get(self.list_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}
        self.assertIn(str(self.public_share.id), returned_ids)
        self.assertNotIn(str(self.link_only_share.id), returned_ids)
        self.assertIn(str(self.friend_share.id), returned_ids)

    def test_non_owner_cannot_update_public_share(self):
        self._auth(self.viewer)
        detail_url = reverse("outfit-share-detail", args=[self.public_share.id])

        response = self.client.patch(
            detail_url,
            {"caption": "Edited by viewer"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.public_share.refresh_from_db()
        self.assertEqual(self.public_share.caption, "Public fit")

    def test_link_only_share_is_not_retrievable_by_other_users(self):
        self._auth(self.viewer)
        detail_url = reverse("outfit-share-detail", args=[self.link_only_share.id])

        response = self.client.get(detail_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_friendship_request_and_accept_flow(self):
        self._auth(self.viewer)

        response = self.client.post(
            self.friendship_list_url,
            {"friend_user_id": str(self.owner.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        friendship_id = response.data["id"]

        self._auth(self.owner)
        detail_url = reverse("friendship-accept", args=[friendship_id])
        accept_response = self.client.post(detail_url, format="json")

        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        self.assertEqual(accept_response.data["status"], Friendship.Status.ACCEPTED)

    def test_owner_can_update_own_share(self):
        self._auth(self.owner)
        detail_url = reverse("outfit-share-detail", args=[self.public_share.id])

        response = self.client.patch(
            detail_url,
            {"caption": "Updated by owner"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.public_share.refresh_from_db()
        self.assertEqual(self.public_share.caption, "Updated by owner")
