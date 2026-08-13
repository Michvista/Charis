import cloudinary.uploader
import requests
from typing import Any
from django.conf import settings


def upload_image_to_cloudinary(file: Any) -> str:
    """Upload a file object to Cloudinary and return the secure URL."""
    response = cloudinary.uploader.upload(file, folder="charis/wardrobe")
    secure_url = response.get("secure_url")
    if not secure_url:
        raise ValueError("Cloudinary upload did not return a secure_url")
    return secure_url


def enqueue_tagging_job(item_id: str) -> None:
    """Queue stub for AI auto-tagging."""
    print(f"[QUEUE STUB] Enqueuing auto-tagging job for item ID: {item_id}", flush=True)


class StylingServiceClient:
    """HTTP Client responsible for making cross-service calls to DolphJS Styling Service."""
    BASE_URL = getattr(settings, "STYLING_SERVICE_URL", "http://styling-service:3300")
    INTERNAL_TOKEN = getattr(settings, "STYLING_SERVICE_INTERNAL_TOKEN", "")

    @classmethod
    def get_outfit_by_id(cls, outfit_id: str) -> dict | None:
        """Calls DolphJS GET /verdict/:id endpoint using the stored outfit_id UUID."""
        try:
            url = f"{cls.BASE_URL}/verdict/{outfit_id}"
            headers = {}
            if cls.INTERNAL_TOKEN:
                headers["Authorization"] = f"Bearer {cls.INTERNAL_TOKEN}"
            response = requests.get(url, headers=headers, timeout=3.0)

            if response.status_code == 200:
                body = response.json()
                return body.get("body") or body.get("data") or body
            return None
        except requests.RequestException as e:
            print(f"[Django] Failed to fetch outfit from DolphJS styling-service: {e}")
            return None
