import cloudinary.uploader
import requests
from typing import Any
from django.conf import settings


def _extract_primary_color(response: dict[str, Any]) -> str | None:
    """Normalize Cloudinary's dominant color response into a 6-digit hex string."""
    colors = response.get("colors")
    if not isinstance(colors, list) or not colors:
        return None

    top_color = colors[0]
    candidate: Any = None

    if isinstance(top_color, (list, tuple)) and top_color:
        candidate = top_color[0]
    elif isinstance(top_color, dict):
        candidate = top_color.get("color") or top_color.get("hex")
    elif isinstance(top_color, str):
        candidate = top_color

    if not isinstance(candidate, str):
        return None

    normalized = candidate.strip().lower()
    if normalized.startswith("#") and len(normalized) == 9:
        normalized = normalized[:7]

    if normalized.startswith("#") and len(normalized) == 7:
        return normalized

    if len(normalized) == 6:
        return f"#{normalized}"

    return None


def upload_image_to_cloudinary(file: Any) -> dict[str, str]:
    """Upload a file object to Cloudinary and return the hosted URL plus dominant color."""
    response = cloudinary.uploader.upload(file, folder="charis/wardrobe", colors=True)
    secure_url = response.get("secure_url")
    if not secure_url:
        raise ValueError("Cloudinary upload did not return a secure_url")

    primary_color = _extract_primary_color(response) or "#808080"

    return {
        "secure_url": secure_url,
        "primary_color": primary_color,
    }


def enqueue_tagging_job(item_id: str) -> None:
    """Queue stub for AI auto-tagging."""
    print(f"[QUEUE STUB] Enqueuing auto-tagging job for item ID: {item_id}", flush=True)


class StylingServiceUnavailable(Exception):
    """Raised when the styling service cannot be reached."""


class StylingServiceClient:
    """HTTP Client responsible for making cross-service calls to DolphJS Styling Service."""
    BASE_URL = getattr(settings, "STYLING_SERVICE_URL", "http://localhost:3300")
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
            if response.status_code == 404:
                return None
            raise StylingServiceUnavailable(
                f"Unexpected response from styling-service: {response.status_code}"
            )
        except requests.RequestException as e:
            raise StylingServiceUnavailable(
                f"Failed to fetch outfit from DolphJS styling-service: {e}"
            ) from e
