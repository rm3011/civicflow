import struct
import unittest

from services.conflict_service import (
    PROBLEM_TYPES,
    _point_coordinates,
    find_complaint_conflicts,
)


def _ewkb_point(longitude, latitude):
    return struct.pack("<BII2d", 1, 0x20000001, 4326, longitude, latitude).hex()


def _complaint(complaint_id, problem_type, longitude, latitude, status="pending"):
    return {
        "id": complaint_id,
        "description": f"Report {complaint_id}",
        "problem_type": problem_type,
        "status": status,
        "severity": "medium",
        "department_id": "works",
        "created_at": "2026-10-05T00:00:00Z",
        "location": _ewkb_point(longitude, latitude),
    }


class ComplaintConflictTests(unittest.TestCase):
    def test_detects_nearby_utility_and_road_reports_in_safe_order(self):
        conflicts = find_complaint_conflicts(
            [
                _complaint(10, "road_damage", 80.2700, 13.0800, "sanctioned"),
                _complaint(11, "drainage", 80.2700, 13.0805, "sanctioned"),
            ]
        )

        self.assertEqual(len(conflicts), 1)
        self.assertLess(conflicts[0]["distance_m"], 100)
        self.assertEqual(conflicts[0]["recommended_first_id"], 11)
        self.assertEqual(conflicts[0]["recommended_second_id"], 10)
        self.assertEqual(conflicts[0]["coordination_type"], "sequence")

    def test_detects_every_supported_problem_type_pair(self):
        complaints = [
            _complaint(index, problem_type, 80.27, 13.08)
            for index, problem_type in enumerate(
                sorted(PROBLEM_TYPES) * 2, start=1
            )
        ]

        conflicts = find_complaint_conflicts(complaints)
        observed_pairs = {
            frozenset(
                (
                    conflict["complaint_a_problem_type"],
                    conflict["complaint_b_problem_type"],
                )
            )
            for conflict in conflicts
        }
        expected_pairs = {
            frozenset((type_a, type_b))
            for index, type_a in enumerate(sorted(PROBLEM_TYPES))
            for type_b in sorted(PROBLEM_TYPES)[index:]
        }

        self.assertEqual(
            len(conflicts),
            len(PROBLEM_TYPES)
            + 4 * (len(PROBLEM_TYPES) * (len(PROBLEM_TYPES) - 1) // 2),
        )
        self.assertEqual(observed_pairs, expected_pairs)
        self.assertTrue(all("recommendation_reason" in item for item in conflicts))

    def test_different_types_without_known_order_are_coordination_only(self):
        conflicts = find_complaint_conflicts(
            [
                _complaint(1, "streetlight", 80.27, 13.08),
                _complaint(2, "public_health", 80.27, 13.08),
            ]
        )

        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0]["coordination_type"], "coordinate")
        self.assertIsNone(conflicts[0]["recommended_first_id"])
        self.assertIsNone(conflicts[0]["recommended_second_id"])

    def test_other_category_requires_manual_review_including_same_type_pair(self):
        conflicts = find_complaint_conflicts(
            [
                _complaint(1, "other", 80.27, 13.08),
                _complaint(2, "other", 80.27, 13.08),
            ]
        )

        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0]["coordination_type"], "manual_review")
        self.assertIsNone(conflicts[0]["recommended_first_id"])

    def test_nearby_reports_require_coordination_without_assumed_sequence(self):
        conflicts = find_complaint_conflicts(
            [
                _complaint(1, "road_damage", 80.27, 13.08),
                _complaint(2, "garbage", 80.27, 13.08),
            ]
        )

        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0]["coordination_type"], "coordinate")
        self.assertIsNone(conflicts[0]["recommended_first_id"])

    def test_completed_work_only_alerts_against_unfinished_nearby_work(self):
        unfinished_pair = find_complaint_conflicts(
            [
                {
                    **_complaint(1, "drainage", 80.27, 13.08, "sanctioned"),
                    "completed": True,
                },
                _complaint(2, "road_damage", 80.27, 13.08, "sanctioned"),
            ]
        )
        completed_pair = find_complaint_conflicts(
            [
                {
                    **_complaint(1, "drainage", 80.27, 13.08, "sanctioned"),
                    "completed": True,
                },
                {
                    **_complaint(2, "road_damage", 80.27, 13.08, "sanctioned"),
                    "completed": True,
                },
            ]
        )

        self.assertEqual(len(unfinished_pair), 1)
        self.assertEqual(unfinished_pair[0]["coordination_type"], "completed_nearby")
        self.assertIsNone(unfinished_pair[0]["recommended_first_id"])
        self.assertEqual(completed_pair, [])

    def test_ignores_distant_and_rejected_reports(self):
        conflicts = find_complaint_conflicts(
            [
                _complaint(1, "road_damage", 80.2700, 13.0800),
                _complaint(2, "drainage", 80.2720, 13.0800),
                _complaint(3, "drainage", 80.2700, 13.0801, "rejected"),
                _complaint(4, "road_damage", 80.2700, 13.0801, "rejected"),
            ]
        )

        self.assertEqual(conflicts, [])

    def test_parses_supabase_ewkb_location(self):
        self.assertEqual(
            _point_coordinates(_ewkb_point(80.27, 13.08)),
            (80.27, 13.08),
        )


if __name__ == "__main__":
    unittest.main()
