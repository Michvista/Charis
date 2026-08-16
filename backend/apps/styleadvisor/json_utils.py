from __future__ import annotations

import json
import re


def _extract_code_block(text: str, opener: str, closer: str) -> str | None:
    pattern = rf"```(?:json)?\s*({re.escape(opener)}.*?{re.escape(closer)})\s*```"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1)
    return None


def _extract_balanced_fragment(text: str, opener: str, closer: str) -> str:
    start = text.find(opener)
    if start == -1:
        raise ValueError("No JSON fragment found in Gemini response.")

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return text[start : index + 1]

    raise ValueError("Gemini response contains an unterminated JSON fragment.")


def extract_json_object(raw_text: str) -> dict:
    text = raw_text.strip()
    candidate = _extract_code_block(text, "{", "}") or _extract_balanced_fragment(text, "{", "}")
    payload = json.loads(candidate)
    if not isinstance(payload, dict):
        raise ValueError("Gemini did not return a JSON object.")
    return payload


def extract_json_array(raw_text: str) -> list:
    text = raw_text.strip()
    candidate = _extract_code_block(text, "[", "]") or _extract_balanced_fragment(text, "[", "]")
    payload = json.loads(candidate)
    if not isinstance(payload, list):
        raise ValueError("Gemini did not return a JSON array.")
    return payload
