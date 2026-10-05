import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class CompletionApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_sanctioned_complaint_can_be_marked_complete(self):
        complaint = {
            "id": 42,
            "status": "sanctioned",
            "completed": True,
            "completed_at": "2026-10-05T00:00:00+00:00",
            "completed_by": None,
        }
        with patch.object(main, "supabase") as supabase:
            (
                supabase.table.return_value.update.return_value.eq.return_value
                .eq.return_value.execute.return_value.data
            ) = [complaint]
            response = self.client.patch(
                "/complaints/42/completion",
                json={"completed": True},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["completed"])
        self.assertEqual(response.json()["status"], "sanctioned")

    def test_pending_complaint_cannot_be_marked_complete(self):
        with patch.object(main, "supabase") as supabase:
            (
                supabase.table.return_value.update.return_value.eq.return_value
                .eq.return_value.execute.return_value.data
            ) = []
            (
                supabase.table.return_value.select.return_value.eq.return_value
                .limit.return_value.execute.return_value.data
            ) = [{"id": 42, "status": "pending"}]
            response = self.client.patch(
                "/complaints/42/completion",
                json={"completed": True},
            )

        self.assertEqual(response.status_code, 409)
        self.assertIn("sanctioned", response.json()["detail"])

    def test_unknown_complaint_returns_not_found(self):
        with patch.object(main, "supabase") as supabase:
            (
                supabase.table.return_value.update.return_value.eq.return_value
                .eq.return_value.execute.return_value.data
            ) = []
            (
                supabase.table.return_value.select.return_value.eq.return_value
                .limit.return_value.execute.return_value.data
            ) = []
            response = self.client.patch(
                "/complaints/999/completion",
                json={"completed": True},
            )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
