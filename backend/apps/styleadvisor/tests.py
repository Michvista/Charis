import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from . import ingestion
from .json_utils import extract_json_array, extract_json_object
from .models import ShoppingSuggestion, StyleKnowledgeChunk
from .retriever import retrieve_relevant_chunks
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

        with patch(
            "apps.styleadvisor.services.retrieve_relevant_chunks",
            return_value=list(StyleKnowledgeChunk.objects.all()),
        ), patch(
            "apps.styleadvisor.services.generate_gemini_text",
            return_value=json.dumps(
                {
                    "summary": "A light, airy look is needed.",
                    "suggestions": [
                        {
                            "item_description": "tan loafers",
                            "reason": "They balance the relaxed outfit.",
                            "priority": "medium",
                        }
                    ],
                }
            ),
        ):
            result = service.generate_shopping_suggestions(self.user, input_data)

        self.assertEqual(len(result.suggestions), 1)
        self.assertEqual(result.suggestions[0].item_description, "tan loafers")
        self.assertEqual(result.summary, "A light, airy look is needed.")
        self.assertEqual(ShoppingSuggestion.objects.count(), 1)


class KnowledgeIngestionTests(TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.knowledge_path = Path(self.temp_dir)
        (self.knowledge_path / "dress_codes.md").write_text(
            "# Dress Codes\nFormal requires dark tailoring and polished shoes.",
            encoding="utf-8",
        )
        (self.knowledge_path / "fabrics.md").write_text(
            "# Fabrics\nLinen is breathable for warm weather.",
            encoding="utf-8",
        )
        patcher = patch.object(ingestion, "KNOWLEDGE_DIR", self.knowledge_path)
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        for path in self.knowledge_path.glob("*.md"):
            path.unlink(missing_ok=True)

    def _run_ingest(self):
        with patch("apps.styleadvisor.retriever.sync_corpus_document", return_value="corpora/x/documents/y"), patch(
            "apps.styleadvisor.retriever.generate_embedding",
            return_value=[0.1, 0.2, 0.3],
        ):
            return ingestion.ingest_knowledge_folder()

    def test_ingestion_creates_records(self):
        summary = self._run_ingest()
        self.assertEqual(StyleKnowledgeChunk.objects.count(), 2)
        self.assertEqual(summary["created"], 2)
        self.assertEqual(summary["failed"], 0)

    def test_duplicate_ingestion_does_not_duplicate(self):
        self._run_ingest()
        self._run_ingest()
        self.assertEqual(StyleKnowledgeChunk.objects.count(), 2)

    def test_changed_file_updates_only_that_record(self):
        self._run_ingest()

        (self.knowledge_path / "fabrics.md").write_text(
            "# Fabrics\nLinen is breathable and silk is luxurious for evening.",
            encoding="utf-8",
        )
        summary = self._run_ingest()

        self.assertEqual(StyleKnowledgeChunk.objects.count(), 2)
        self.assertEqual(summary["updated"], 1)
        self.assertEqual(summary["created"], 0)
        fabrics = StyleKnowledgeChunk.objects.get(source_file="fabrics.md")
        self.assertIn("silk is luxurious", fabrics.content)

    def test_metadata_populated(self):
        self._run_ingest()
        dress = StyleKnowledgeChunk.objects.get(source_file="dress_codes.md")
        self.assertEqual(dress.title, "Dress Codes")
        self.assertIn("formal", dress.tags)
        self.assertTrue(dress.content_hash)
        self.assertEqual(dress.embedding, [0.1, 0.2, 0.3])


class KnowledgeRetrievalTests(TestCase):
    def setUp(self):
        StyleKnowledgeChunk.objects.create(
            title="Beach Weddings",
            source_file="dress_codes.md",
            tags=["beach", "wedding", "formal"],
            content="Beach weddings call for linen and light fabrics.",
            content_hash="a",
            embedding=[],
        )
        StyleKnowledgeChunk.objects.create(
            title="Office Wear",
            source_file="occasion_styling.md",
            tags=["business", "office"],
            content="Office wear needs conservative tailoring.",
            content_hash="b",
            embedding=[],
        )

    def test_retrieval_uses_file_search_results(self):
        with patch(
            "apps.styleadvisor.retriever.query_rag_corpus",
            return_value=[
                {"text": "Beach weddings call for linen.", "metadata": {"source_file": "dress_codes.md"}},
                {"text": "Office wear needs tailoring.", "metadata": {"source_file": "occasion_styling.md"}},
            ],
        ):
            result = retrieve_relevant_chunks("beach wedding", top_k=1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].source_file, "dress_codes.md")

    def test_retrieval_falls_back_to_local_when_file_search_empty(self):
        with patch("apps.styleadvisor.retriever.query_rag_corpus", return_value=[]), patch(
            "apps.styleadvisor.retriever.generate_embedding",
            return_value=None,
        ):
            result = retrieve_relevant_chunks("beach wedding", top_k=1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].source_file, "dress_codes.md")

    def test_retrieval_uses_embeddings_when_available(self):
        with patch("apps.styleadvisor.retriever.query_rag_corpus", return_value=[]), patch(
            "apps.styleadvisor.retriever.generate_embedding",
            return_value=[1.0, 0.0, 0.0],
        ):
            result = retrieve_relevant_chunks("beach wedding", top_k=1)
        self.assertEqual(len(result), 1)

    def test_retrieval_returns_empty_with_no_chunks(self):
        StyleKnowledgeChunk.objects.all().delete()
        with patch("apps.styleadvisor.retriever.query_rag_corpus", return_value=[]), patch(
            "apps.styleadvisor.retriever.generate_embedding",
            return_value=None,
        ):
            self.assertEqual(retrieve_relevant_chunks("beach wedding"), [])
