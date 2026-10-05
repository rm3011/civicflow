import json
import unittest
from unittest.mock import patch

from google.genai.errors import ServerError

from services import gemini_service


class GeminiClassificationTests(unittest.TestCase):
    def test_uses_supported_flash_model(self):
        self.assertEqual(gemini_service.MODEL, "gemini-3.5-flash")

    def test_normalizes_classification_values(self):
        response = type(
            "Response",
            (),
            {
                "text": json.dumps(
                    {
                        "problem_type": "road_damage",
                        "department_id": "works",
                        "severity": "HIGH",
                        "confidence": 1.7,
                        "reasoning": "  Surface damage reported.  ",
                    }
                )
            },
        )()
        with patch.object(
            gemini_service.client.models,
            "generate_content",
            return_value=response,
        ):
            result = gemini_service.classify_complaint("A damaged road")

        self.assertEqual(result["problem_type"], "road_damage")
        self.assertEqual(result["severity"], "high")
        self.assertEqual(result["confidence"], 1.0)
        self.assertEqual(result["reasoning"], "Surface damage reported.")

    def test_invalid_model_response_routes_to_manual_review(self):
        response = type("Response", (), {"text": '["not", "an", "object"]'})()
        with patch.object(
            gemini_service.client.models,
            "generate_content",
            return_value=response,
        ):
            result = gemini_service.classify_complaint("Issue needs inspection")

        self.assertEqual(result["problem_type"], "other")
        self.assertEqual(result["department_id"], "works")
        self.assertEqual(result["confidence"], 0.0)
        self.assertIn("Manual review required", result["reasoning"])

    def test_retries_temporary_model_unavailability(self):
        response = type(
            "Response",
            (),
            {
                "text": json.dumps(
                    {
                        "problem_type": "road_damage",
                        "department_id": "works",
                        "severity": "high",
                        "confidence": 0.9,
                        "reasoning": "A pothole is affecting traffic.",
                    }
                )
            },
        )()
        temporary_error = ServerError(
            503,
            {"error": {"message": "Temporary model unavailability"}},
        )

        with (
            patch.object(
                gemini_service.client.models,
                "generate_content",
                side_effect=[temporary_error, response],
            ) as generate_content,
            patch.object(gemini_service.time, "sleep") as sleep,
        ):
            result = gemini_service.classify_complaint("A deep pothole")

        self.assertEqual(result["problem_type"], "road_damage")
        self.assertEqual(generate_content.call_count, 2)
        sleep.assert_called_once_with(1)


if __name__ == "__main__":
    unittest.main()
