import cloudinary.uploader
from typing import Any


def upload_image_to_cloudinary(file: Any) -> str:
    """Upload a file object to Cloudinary and return the secure URL."""
    response = cloudinary.uploader.upload(file, folder="charis/wardrobe")
    secure_url = response.get("secure_url")
    if not secure_url:
        raise ValueError("Cloudinary upload did not return a secure_url")
    return secure_url


def enqueue_tagging_job(item_id: str) -> None:
    """Queue stub for AI auto-tagging."""
    # Currently logs to console. In Week 2, this will push to Redis / BullMQ.
    print(f"[QUEUE STUB] Enqueuing auto-tagging job for item ID: {item_id}")