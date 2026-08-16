import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from .json_utils import extract_json_array, extract_json_object
from .models import ShoppingSuggestion, StyleKnowledgeChunk
from .services import StyleAdvisorInput, StyleAdvisorService

User = get_user_model()


class StyleAdvisorJsonParsingTests(TestCase):
    def test_extract_json_object_handles_extra_text(self):
        payload = extract_json_object(
            "Here is the result:\n```json\n{\"suggestions\": [{\"item_description\": \"belt\"}]}\n```\nThanks!"
        )

        self.assertEqual(payload["suggestions"][0]["item_description"], "belt")

    def test_extract_json_array_handles_extra_text(self):
        values = extract_json_array("Indices: [0, 2, 4]\n")

        self.assertEqual(values, [0, 2, 4])


class StyleAdvisorServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="styleuser",
            email="styleuser@example.com",
            password="Password123!",
        )
        StyleKnowledgeChunk.objects.create(
            content="Linen works well for warm-weather smart casual looks.",
            tags=["summer", "linen"],
        )

    def test_generate_shopping_suggestions_persists_results(self):
        service = StyleAdvisorService(model_name="gemini-2.5-flash")
        input_data = StyleAdvisorInput(
            occasion_description="Beach wedding",
            occasion_formality=3,
            current_item_descriptions=["white linen shirt"],
            occasion_id="550e8400-e29b-41d4-a716-446655440000",
        )

        from unittest.mock import patch

        with patch(
            "apps.styleadvisor.services.retrieve_relevant_chunks",
            return_value=list(StyleKnowledgeChunk.objects.all()),
        ), patch(
            "apps.styleadvisor.services.generate_gemini_text",
            return_value=json.dumps(
                {
                    "suggestions": [
                        {
                            "item_description": "tan loafers",
                            "reason": "They balance the relaxed outfit.",
                            "priority": "medium",
                        }
                    ]
                }
            ),
        ):
            saved = service.generate_shopping_suggestions(self.user, input_data)

        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0].item_description, "tan loafers")
        self.assertEqual(ShoppingSuggestion.objects.count(), 1)
