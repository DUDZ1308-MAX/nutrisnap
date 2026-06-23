import base64
import json
import httpx
from config import GEMINI_API_KEY

SYSTEM_PROMPT = """You are a nutritionist AI. Analyze the food in this image and return ONLY valid JSON with these fields:
{
  "name": "short food description",
  "calories": total_calories (number),
  "protein": grams (number or null),
  "carbs": grams (number or null),
  "fat": grams (number or null),
  "confidence": "high" | "medium" | "low"
}
Use realistic estimates. If you cannot identify the food, set confidence to "low" and provide your best guess."""


def analyze_food_image(image_bytes: bytes) -> dict | None:
    if not GEMINI_API_KEY:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "contents": [{
            "parts": [
                {"text": SYSTEM_PROMPT},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
            ]
        }]
    }

    resp = httpx.post(url, json=payload, timeout=30)
    if resp.status_code == 429:
        return {"name": "Rate limited", "calories": 0, "protein": None, "carbs": None, "fat": None, "confidence": "low"}
    resp.raise_for_status()
    data = resp.json()

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)
