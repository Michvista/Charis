from __future__ import annotations

from urllib.parse import urlparse

import requests
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.authentication import InternalServiceAuthentication

ALLOWED_IMAGE_PROXY_HOSTS = frozenset(
    {
        "res.cloudinary.com",
        "images.unsplash.com",
    }
)


def is_allowed_image_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        return parsed.hostname in ALLOWED_IMAGE_PROXY_HOSTS
    except Exception:
        return False


class IsInternalService(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(getattr(request.user, "is_internal_service", False))


class ImageProxyView(APIView):
    """
    Internal-only proxy so job-worker can fetch wardrobe images when direct
    CDN access from the worker container fails (common in Docker on Windows).
    """

    authentication_classes = [InternalServiceAuthentication]
    permission_classes = [IsInternalService]

    def get(self, request):
        image_url = request.query_params.get("url", "").strip()
        if not image_url or not is_allowed_image_url(image_url):
            return Response(
                {"detail": "Invalid or disallowed image URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            upstream = requests.get(
                image_url,
                timeout=30,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (compatible; CharisImageProxy/1.0)"
                    ),
                    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                },
                stream=True,
            )
            upstream.raise_for_status()
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Failed to fetch image: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        content_type = upstream.headers.get("Content-Type", "image/jpeg")
        if ";" in content_type:
            content_type = content_type.split(";", 1)[0].strip()

        return HttpResponse(
            upstream.content,
            content_type=content_type,
            status=status.HTTP_200_OK,
        )
