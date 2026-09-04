FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

EXPOSE 8000

# Production start command (used by Render's docker runtime). Local dev via
# docker compose overrides this with runserver.
CMD ["gunicorn", "config.wsgi:application", "-c", "gunicorn.conf.py"]
