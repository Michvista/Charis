from __future__ import annotations

from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header


class InternalServiceUser:
    """
    Lightweight authenticated principal for trusted service-to-service calls.

    We only use this for the shared internal bearer token so Django can accept
    worker callbacks without trying to parse them as JWTs.
    """

    is_authenticated = True
    is_anonymous = False
    is_internal_service = True

    def __init__(self, identifier: str = "internal-service") -> None:
        self.id = identifier
        self.pk = identifier
        self.user_id = identifier
        self.username = identifier


class InternalServiceAuthentication(BaseAuthentication):
    """
    Authenticate trusted internal requests using the shared internal bearer token.
    """

    def authenticate(self, request):
        auth_header = get_authorization_header(request).decode("utf-8").strip()
        if not auth_header:
            return None

        if not auth_header.lower().startswith("bearer "):
            return None

        token = auth_header[7:].strip()
        internal_token = getattr(settings, "STYLING_SERVICE_INTERNAL_TOKEN", "")

        if internal_token and token == internal_token:
            return InternalServiceUser(), token

        return None
