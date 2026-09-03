"""Production gunicorn config for the Django backend (Render / VPS)."""

bind = "0.0.0.0:8000"
workers = 2
timeout = 60
graceful_timeout = 30
accesslog = "-"
errorlog = "-"