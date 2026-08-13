from pathlib import Path
from datetime import timedelta
import os
import cloudinary
import dj_database_url
from dotenv import load_dotenv

load_dotenv()
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-dev-key-change-in-production")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

#   Apps                               

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    'rest_framework_simplejwt.token_blacklist',
    "corsheaders",
    "cloudinary",
    
    # Local domain apps
    "common.apps.CommonConfig",
    "apps.accounts",
    "apps.wardrobe",
    "apps.tripplanner",
    "apps.social",
    "apps.analytics",
    "apps.styleadvisor",
]

# CRITICAL: Define Custom User Model BEFORE initial migrations
AUTH_USER_MODEL = "accounts.User"

#   Middleware                            ─

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # Must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

#   Database                             

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
        ssl_require=False if os.getenv("DATABASE_URL", "").startswith("sqlite") else True,
    )
}
DJANGO_DB_SCHEMA = os.getenv("DJANGO_DB_SCHEMA", "django")

#   Authentication & DRF                       

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": os.getenv("JWT_SECRET", SECRET_KEY),
}

#   CORS                               

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # React frontend (Vite default)
    "http://127.0.0.1:5173",
]

#   Redis                              ─

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STYLING_SERVICE_URL = os.getenv("STYLING_SERVICE_URL", "http://localhost:3300")
STYLING_SERVICE_INTERNAL_TOKEN = os.getenv(
    "STYLING_SERVICE_INTERNAL_TOKEN",
    os.getenv("INTERNAL_API_KEY", ""),
)

#   Password Validation & Defaults                 ─

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
