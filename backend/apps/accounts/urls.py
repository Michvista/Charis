from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import HealthCheckView, RegisterView, LoginView, LogoutView, UserProfileView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
]