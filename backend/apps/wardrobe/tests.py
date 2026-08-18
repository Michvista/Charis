from django.test import TestCase
from django.core.management import call_command
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.wardrobe.models import WardrobeItem, Season, WearLog
from apps.wardrobe.services import upload_image_to_cloudinary
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

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


class WardrobeUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="creator",
            email="creator@example.com",
            password="Password123!",
        )
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    @patch("apps.wardrobe.services.cloudinary.uploader.upload")
    def test_cloudinary_upload_extracts_primary_color(self, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/shirt.jpg",
            "colors": [["#112233", 45.0], ["#ffffff", 10.0]],
        }

        result = upload_image_to_cloudinary(SimpleUploadedFile("shirt.jpg", b"fake-image-bytes"))

        self.assertEqual(result["secure_url"], "https://res.cloudinary.com/demo/image/upload/v1/shirt.jpg")
        self.assertEqual(result["primary_color"], "#112233")
        mock_upload.assert_called_once()
        self.assertTrue(mock_upload.call_args.kwargs["colors"])

    @patch("apps.wardrobe.views.enqueue_tagging_job")
    @patch("apps.wardrobe.views.upload_image_to_cloudinary")
    def test_create_wardrobe_item_uses_extracted_primary_color(self, mock_upload, mock_enqueue):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/tee.jpg",
            "primary_color": "#445566",
        }

        image = SimpleUploadedFile(
            "tee.jpg",
            b"fake-image-bytes",
            content_type="image/jpeg",
        )

        response = self.client.post(
            "/api/wardrobe/items/",
            {
                "name": "Cloud Tee",
                "category": "top",
                "primary_color": "black",
                "formality_level": 2,
                "image": image,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(WardrobeItem.objects.count(), 1)
        item = WardrobeItem.objects.get()
        self.assertEqual(item.primary_color, "#445566")
        self.assertEqual(item.image_url, "https://res.cloudinary.com/demo/image/upload/v1/tee.jpg")
        mock_enqueue.assert_called_once()

    @patch("apps.wardrobe.views.enqueue_tagging_job")
    @patch("apps.wardrobe.views.upload_image_to_cloudinary")
    def test_cloudinary_extracted_color_overrides_placeholder_input(self, mock_upload, mock_enqueue):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/coat.jpg",
            "primary_color": "#112233",
        }

        image = SimpleUploadedFile(
            "coat.jpg",
            b"fake-image-bytes",
            content_type="image/jpeg",
        )

        response = self.client.post(
            "/api/wardrobe/items/",
            {
                "name": "Cloud Coat",
                "category": "outerwear",
                "primary_color": "black",
                "formality_level": 4,
                "image": image,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        item = WardrobeItem.objects.get()
        self.assertEqual(item.primary_color, "#112233")
        mock_enqueue.assert_called_once()

    @override_settings(STYLING_SERVICE_INTERNAL_TOKEN="test-internal-token")
    def test_internal_service_token_allows_wardrobe_update_without_jwt(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer test-internal-token")

        item = WardrobeItem.objects.create(
            user=self.user,
            name="Internal Auth Tee",
            category="top",
            primary_color="black",
            image_url="https://example.com/internal-tee.jpg",
        )

        response = self.client.patch(
            f"/api/wardrobe/items/{item.pk}/",
            {
                "tagging_status": "done",
                "primary_color": "#abcdef",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.tagging_status, "done")
        self.assertEqual(item.primary_color, "#abcdef")


class WardrobeBackfillCommandTests(TestCase):
    @patch("apps.wardrobe.management.commands.backfill_wardrobe_assets.enqueue_tagging_job")
    @patch("apps.wardrobe.management.commands.backfill_wardrobe_assets.normalize_image_source_to_cloudinary")
    def test_backfill_rehosts_external_urls_and_requeues_tagging(self, mock_rehost, mock_enqueue):
        mock_rehost.return_value = {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/backfilled.jpg",
            "primary_color": "#123456",
        }

        owner = User.objects.create_user(
            username="backfill-owner",
            email="backfill@example.com",
            password="Password123!",
        )
        external_item = WardrobeItem.objects.create(
            user=owner,
            name="External Coat",
            category="outerwear",
            primary_color="black",
            image_url="https://example.com/coat.jpg",
            tagging_status="failed",
        )
        cloudinary_item = WardrobeItem.objects.create(
            user=owner,
            name="Cloud Tee",
            category="top",
            primary_color="#abcdef",
            image_url="https://res.cloudinary.com/demo/image/upload/v1/tee.jpg",
            tagging_status="done",
        )

        call_command("backfill_wardrobe_assets")

        external_item.refresh_from_db()
        cloudinary_item.refresh_from_db()

        self.assertEqual(external_item.image_url, "https://res.cloudinary.com/demo/image/upload/v1/backfilled.jpg")
        self.assertEqual(external_item.primary_color, "#123456")
        self.assertEqual(external_item.tagging_status, "pending")

        self.assertEqual(cloudinary_item.image_url, "https://res.cloudinary.com/demo/image/upload/v1/tee.jpg")
        self.assertEqual(cloudinary_item.tagging_status, "pending")
        mock_rehost.assert_called_once_with("https://example.com/coat.jpg")
        self.assertEqual(mock_enqueue.call_count, 2)
