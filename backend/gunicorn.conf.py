"""Production gunicorn config for the Django backend (Render / VPS)."""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = 2
# Gemini File Search retrieval + generation is slow (can exceed 60s), and the
# local fallback adds more — give workers enough headroom so the request completes.
timeout = 180
graceful_timeout = 30
accesslog = "-"
errorlog = "-"