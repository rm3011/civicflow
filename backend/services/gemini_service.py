import json
import re
from google import genai
from google.genai import types
from config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-3.5-flash"

PROMPT = """You are a civic complaint classifier for an Indian city.

Classify the complaint into exactly ONE problem_type from this list n:
- road_damage
- water_leakage
- drainage
- garbage
- streetlight
- electricity
- traffic
- construction
- other

Respond ONLY with a JSON object in this exact shape, no other text:
{
  "problem_type": "one of the categories above",
  "severity": "low" or "medium" or "high",
  "confidence": number between 0.0 and 1.0,
  "reasoning": "one line explanation"
}
"""

def classify_complaint(description: str, photo_url: str = None) -> dict:
    user_content = f"Complaint: {description}"
    if photo_url:
        user_content += f"\n(Photo: {photo_url})"

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[PROMPT, user_content],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        text = response.text.strip()
    except Exception as e:
        print(f"[GEMINI ERROR] {e}")
        return _fallback(str(e))

    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                return _fallback("unparseable JSON")
        else:
            return _fallback("no JSON in response")

    allowed = {"road_damage", "water_leakage", "drainage", "garbage",
               "streetlight", "electricity", "traffic", "construction", "other"}
    if result.get("problem_type") not in allowed:
        result["problem_type"] = "other"

    return {
        "problem_type": result.get("problem_type", "other"),
        "severity": result.get("severity", "medium"),
        "confidence": float(result.get("confidence", 0.0)),
        "reasoning": result.get("reasoning", ""),
    }

def _fallback(reason: str) -> dict:
    return {
        "problem_type": "other",
        "severity": "medium",
        "confidence": 0.0,
        "reasoning": f"Fallback: {reason}",
    }