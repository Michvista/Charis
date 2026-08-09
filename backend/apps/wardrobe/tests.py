from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.wardrobe.models import WardrobeItem, Season, WearLog
from django.utils import timezone

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