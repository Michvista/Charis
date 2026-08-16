from __future__ import annotations

import json
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass


@dataclass
class GeminiTextResult:
    text: str


def _get_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return api_key


def _sdk_available():
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError:
        return None
    genai.configure(api_key=_get_api_key())
    return genai


def _extract_candidate_text(response: object) -> str:
    if hasattr(response, "text"):
        text = getattr(response, "text", "") or ""
        if text:
            return text
    if isinstance(response, dict):
        candidates = response.get("candidates") or []
        if candidates:
            content = candidates[0].get("content") or {}
            parts = content.get("parts") or []
            if parts:
                text = parts[0].get("text") or ""
                if text:
                    return text
    return ""


def generate_gemini_text(model_name: str, prompt: str) -> str:
    sdk = _sdk_available()
    if sdk is not None:
        response = sdk.GenerativeModel(model_name).generate_content(prompt)
        return _extract_candidate_text(response)

    api_key = _get_api_key()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model_name, safe='')}:generateContent?key={urllib.parse.quote(api_key, safe='')}"
    payload = json.dumps(
        {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ]
                }
            ]
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:  # pragma: no cover - network/runtime dependent
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini request failed with HTTP {exc.code}: {detail}") from exc

    text = _extract_candidate_text(response_payload)
    if not text:
        raise RuntimeError("Gemini returned an empty response.")
    return text


def upload_gemini_file(file_path: str) -> str:
    sdk = _sdk_available()
    if sdk is None:
        return ""

    uploaded = sdk.upload_file(path=file_path)
    return getattr(uploaded, "uri", None) or getattr(uploaded, "name", "") or ""
