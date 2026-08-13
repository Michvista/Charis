from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.wardrobe.models import WardrobeItem, Season, WearLog
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch

User = get_user_model()

class WardrobeModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", 
            email="testuser@example.com", 
            password="Password123!"
        )
        self.season_fall = Season.objects.create(name="fall")

    def test_create_wardrobe_item(self):
        item = WardrobeItem.objects.create(
            user=self.user,
            name="Classic Black Blazer",
            category="outerwear",
            primary_color="black",
            formality_level=4,
            image_url="https://example.com/blazer.jpg"
        )
        item.seasons.add(self.season_fall)

        self.assertEqual(str(item), f"Classic Black Blazer (outerwear) — {self.user.email}")
        self.assertEqual(item.seasons.count(), 1)
        self.assertEqual(item.tagging_status, "pending")

    def test_create_wear_log(self):
        item = WardrobeItem.objects.create(
            user=self.user,
            name="Blue Denim Jeans",
            category="bottom",
            primary_color="blue",
            image_url="https://example.com/jeans.jpg"
        )
        log = WearLog.objects.create(
            wardrobe_item=item,
            worn_date=timezone.now().date()
        )
        self.assertEqual(str(log), f"Blue Denim Jeans worn on {log.worn_date}")


class WearLogApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="Password123!",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="Password123!",
        )
        self.item = WardrobeItem.objects.create(
            user=self.owner,
            name="White Tee",
            category="top",
            primary_color="white",
            image_url="https://example.com/tee.jpg",
        )
        self.url = f"/api/wardrobe/items/{self.item.pk}/wear/"

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    @patch("apps.wardrobe.views.StylingServiceClient.get_outfit_by_id")
    def test_rejects_outfit_from_another_user(self, mock_get_outfit):
        self._auth(self.owner)
        mock_get_outfit.return_value = {
            "outfitId": "550e8400-e29b-41d4-a716-446655440000",
            "userId": str(self.other_user.id),
        }

        response = self.client.post(
            self.url,
            {"outfit_id": "550e8400-e29b-41d4-a716-446655440000"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(WearLog.objects.count(), 0)

    @patch("apps.wardrobe.views.StylingServiceClient.get_outfit_by_id")
    def test_accepts_owned_outfit(self, mock_get_outfit):
        self._auth(self.owner)
        mock_get_outfit.return_value = {
            "outfitId": "550e8400-e29b-41d4-a716-446655440001",
            "userId": str(self.owner.id),
        }

        response = self.client.post(
            self.url,
            {"outfit_id": "550e8400-e29b-41d4-a716-446655440001"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(WearLog.objects.count(), 1)
