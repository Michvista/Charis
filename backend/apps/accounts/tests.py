from typing import cast

from typing import Any, cast

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User


class JWTAuthTests(APITestCase):

    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.refresh_url = reverse('token_refresh')
        self.logout_url = reverse('logout')
        self.profile_url = reverse('user_profile')

        self.user_data = {
            "username": "fashionista",
            "email": "style@charis.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "bio": "Capsule wardrobe enthusiast."
        }
        self.client: APIClient = APIClient()

        self.user = User.objects.create_user(
            username="existinguser",
            email="existing@charis.com",
            password="Password123!"
        )

    def test_register_returns_jwt_tokens(self):
        response = cast(Any, self.client.post(self.register_url, self.user_data, format='json'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.json()
        self.assertIn('tokens', response_data)
        self.assertIn('access', response_data['tokens'])
        self.assertIn('refresh', response_data['tokens'])

    def test_login_returns_jwt_tokens_and_user(self):
        login_payload = {
            "email": "existing@charis.com",
            "password": "Password123!"
        }
        response = cast(Any, self.client.post(self.login_url, login_payload, format='json'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertIn('access', response_data)
        self.assertIn('refresh', response_data)
        self.assertEqual(response_data['user']['email'], self.user.email)

    def test_token_refresh(self):
        refresh = cast(RefreshToken, RefreshToken.for_user(self.user))
        response = cast(Any, self.client.post(self.refresh_url, {"refresh": str(refresh)}, format='json'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertIn('access', response_data)

    def test_logout_blacklists_refresh_token(self):
        refresh = cast(RefreshToken, RefreshToken.for_user(self.user))
        access = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        
        # Logout call
        logout_response = cast(Any, self.client.post(self.logout_url, {"refresh": str(refresh)}, format='json'))
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        # Try to use the blacklisted refresh token again
        refresh_again_response = cast(Any, self.client.post(self.refresh_url, {"refresh": str(refresh)}, format='json'))
        self.assertEqual(refresh_again_response.status_code, status.HTTP_401_UNAUTHORIZED)