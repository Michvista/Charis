"""Production gunicorn config for the Django backend (Render / VPS)."""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = 2
timeout = 60
graceful_timeout = 30
accesslog = "-"
errorlog = "-"