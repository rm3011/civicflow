import math
import re
import struct

from supabase_client import supabase
from services.gemini_service import recommend_conflict_orders
from constants import PROBLEM_TYPES

UNDERGROUND_UTILITY_TYPES = {"drainage", "sewage", "water_leakage"}
EARTH_RADIUS_METERS = 6_371_000
COMPLAINT_CONFLICT_RADIUS_METERS = 100
COMPLAINT_PAGE_SIZE = 1000


def find_nearby_projects(complaint_id: int, radius_meters: int = 100):
    try:
        res = supabase.rpc("nearby_projects", {
            "complaint_id": complaint_id,
            "radius_m": radius_meters,
        }).execute()
        return res.data or []
    except Exception as e:
        print(f"[nearby_projects ERROR] {e}")
        return []


def _point_coordinates(location):
    if isinstance(location, dict):
        coordinates = location.get("coordinates")
        if location.get("type") == "Point" and isinstance(coordinates, (list, tuple)):
            longitude, latitude = coordinates[:2]
            return _validated_point(float(longitude), float(latitude))

    if not isinstance(location, str):
        raise ValueError("Complaint location is not a supported point")

    text = location.strip()
    wkt_match = re.fullmatch(
        r"(?:SRID=\d+;)?POINT\s*\(\s*([-+0-9.eE]+)\s+([-+0-9.eE]+)\s*\)",
        text,
        re.IGNORECASE,
    )
    if wkt_match:
        return _validated_point(
            float(wkt_match.group(1)), float(wkt_match.group(2))
        )

    try:
        point = bytes.fromhex(text)
    except ValueError as exc:
        raise ValueError("Complaint location is not valid EWKB or WKT") from exc

    if len(point) < 21 or point[0] not in (0, 1):
        raise ValueError("Complaint location is not a supported EWKB point")

    byte_order = "<" if point[0] == 1 else ">"
    geometry_type = struct.unpack(f"{byte_order}I", point[1:5])[0]
    if geometry_type & 0xFF != 1:
        raise ValueError("Complaint location is not a point")

    has_srid = bool(geometry_type & 0x20000000)
    coordinate_offset = 9 if has_srid else 5
    if len(point) < coordinate_offset + 16:
        raise ValueError("Complaint location has incomplete coordinates")
    if has_srid and struct.unpack(
        f"{byte_order}I", point[5:9]
    )[0] != 4326:
        raise ValueError("Complaint location must use SRID 4326")

    longitude, latitude = struct.unpack(
        f"{byte_order}dd", point[coordinate_offset : coordinate_offset + 16]
    )
    return _validated_point(longitude, latitude)


def _validated_point(longitude, latitude):
    if (
        not math.isfinite(longitude)
        or not math.isfinite(latitude)
        or not -180 <= longitude <= 180
        or not -90 <= latitude <= 90
    ):
        raise ValueError("Complaint location coordinates are out of range")
    return longitude, latitude


def _distance_meters(point_a, point_b):
    longitude_a, latitude_a = map(math.radians, point_a)
    longitude_b, latitude_b = map(math.radians, point_b)
    latitude_delta = latitude_b - latitude_a
    longitude_delta = longitude_b - longitude_a
    haversine = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(latitude_a)
        * math.cos(latitude_b)
        * math.sin(longitude_delta / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(min(1, haversine)))


def _coordination_guidance(
    problem_type_a, problem_type_b, completed_a=False, completed_b=False
):
    if completed_a and completed_b:
        return None
    if completed_a or completed_b:
        return (
            "completed_nearby",
            None,
            None,
            "One nearby report is marked complete. Verify the completed work on site "
            "before authorizing work on the other report; no sequence is assumed.",
        )

    if "other" in (problem_type_a, problem_type_b):
        return (
            "manual_review",
            None,
            None,
            "At least one issue could not be classified reliably. Review both reports "
            "and coordinate the responsible teams; no work sequence is assumed.",
        )

    if problem_type_a == problem_type_b:
        return (
            "related_reports",
            None,
            None,
            "These reports describe the same issue type nearby. Check whether they "
            "are duplicate reports or separate incidents before assigning work.",
        )

    if problem_type_a == "road_damage" and problem_type_b in UNDERGROUND_UTILITY_TYPES:
        first_type, second_type = problem_type_b, problem_type_a
    elif problem_type_b == "road_damage" and problem_type_a in UNDERGROUND_UTILITY_TYPES:
        first_type, second_type = problem_type_a, problem_type_b
    else:
        return (
            "coordinate",
            None,
            None,
            "These different issue types are reported nearby and may affect the same "
            "site. Coordinate with both departments to check site overlap and agree "
            "on a safe sequence; the available information does not establish one.",
        )

    return (
        "sequence",
        first_type,
        second_type,
        "Complete and inspect underground drainage, sewer, or water work before "
        "road repair where both reports refer to the same work site. Confirm the "
        "site overlap and sequence with the responsible teams.",
    )


def find_complaint_conflicts(complaints, radius_meters=COMPLAINT_CONFLICT_RADIUS_METERS):
    if not math.isfinite(radius_meters) or radius_meters <= 0:
        raise ValueError("Conflict radius must be a positive finite distance")

    active_complaints = []
    for complaint in complaints:
        if complaint.get("status") == "rejected":
            continue
        problem_type = complaint.get("problem_type")
        if problem_type not in PROBLEM_TYPES:
            continue
        location = complaint.get("location")
        if location is None:
            continue
        active_complaints.append(
            {**complaint, "_coordinates": _point_coordinates(location)}
        )

    if not active_complaints:
        return []

    maximum_latitude = max(abs(item["_coordinates"][1]) for item in active_complaints)
    longitude_cosine = max(math.cos(math.radians(maximum_latitude)), 0.01)
    latitude_cell_size = radius_meters / 111_320
    longitude_cell_size = radius_meters / (111_320 * longitude_cosine)
    grid = {}
    conflicts = []

    for complaint in active_complaints:
        longitude, latitude = complaint["_coordinates"]
        cell = (
            math.floor(latitude / latitude_cell_size),
            math.floor(longitude / longitude_cell_size),
        )
        for row_offset in (-1, 0, 1):
            for column_offset in (-1, 0, 1):
                for neighbor in grid.get(
                    (cell[0] + row_offset, cell[1] + column_offset), ()
                ):
                    pair = (neighbor, complaint)
                    distance = _distance_meters(
                        neighbor["_coordinates"], complaint["_coordinates"]
                    )
                    if distance > radius_meters:
                        continue

                    if neighbor.get("completed", False) and complaint.get(
                        "completed", False
                    ):
                        continue

                    coordination_type, first_type, second_type, guidance = (
                        _coordination_guidance(
                            neighbor["problem_type"],
                            complaint["problem_type"],
                            neighbor.get("completed", False),
                            complaint.get("completed", False),
                        )
                    )
                    if coordination_type is None:
                        continue
                    recommended_first_id = None
                    recommended_second_id = None
                    if first_type is not None and second_type is not None:
                        recommended_first_id = next(
                            item["id"]
                            for item in pair
                            if item["problem_type"] == first_type
                        )
                        recommended_second_id = next(
                            item["id"]
                            for item in pair
                            if item["problem_type"] == second_type
                        )
                    conflicts.append(
                        {
                            "complaint_a_id": neighbor["id"],
                            "complaint_a_description": neighbor["description"],
                            "complaint_a_problem_type": neighbor["problem_type"],
                            "complaint_a_status": neighbor["status"],
                            "complaint_a_completed": neighbor.get("completed", False),
                            "complaint_a_severity": neighbor["severity"],
                            "complaint_a_department_id": neighbor.get("department_id"),
                            "complaint_a_created_at": neighbor["created_at"],
                            "complaint_b_id": complaint["id"],
                            "complaint_b_description": complaint["description"],
                            "complaint_b_problem_type": complaint["problem_type"],
                            "complaint_b_status": complaint["status"],
                            "complaint_b_completed": complaint.get("completed", False),
                            "complaint_b_severity": complaint["severity"],
                            "complaint_b_department_id": complaint.get("department_id"),
                            "complaint_b_created_at": complaint["created_at"],
                            "distance_m": round(distance, 1),
                            "coordination_type": coordination_type,
                            "recommended_first_id": recommended_first_id,
                            "recommended_second_id": recommended_second_id,
                            "recommendation_reason": guidance,
                        }
                    )
        grid.setdefault(cell, []).append(complaint)

    return conflicts


def detect_complaint_conflicts(city: str, zone_id: int):
    complaints = []
    offset = 0
    while True:
        response = (
            supabase.table("complaints")
            .select(
                "id, description, problem_type, status, severity, department_id, "
                "completed, created_at, location"
            )
            .eq("city", city)
            .eq("zone_id", zone_id)
            .in_("problem_type", list(PROBLEM_TYPES))
            .order("id")
            .range(offset, offset + COMPLAINT_PAGE_SIZE - 1)
            .execute()
        )
        page = response.data or []
        complaints.extend(page)
        if len(page) < COMPLAINT_PAGE_SIZE:
            break
        offset += COMPLAINT_PAGE_SIZE
    return find_complaint_conflicts(complaints)


def detect_all_conflicts():
    res = supabase.rpc("detect_all_conflicts").execute()
    conflicts = res.data or []
    if not conflicts:
        return []

    project_ids = {
        conflict[key]
        for conflict in conflicts
        for key in ("project_a_id", "project_b_id")
        if conflict.get(key) is not None
    }
    try:
        projects_res = (
            supabase.table("projects")
            .select("id, name, authority, work_type")
            .in_("id", list(project_ids))
            .execute()
        )
        projects = {project["id"]: project for project in projects_res.data or []}
    except Exception as e:
        print(f"[conflict project details ERROR] {e}")
        return [
            {
                **conflict,
                "recommendation_available": False,
                "recommendation_reason": "Project details are unavailable for AI execution-order analysis.",
            }
            for conflict in conflicts
        ]

    for conflict in conflicts:
        project_a = projects.get(conflict["project_a_id"], {})
        project_b = projects.get(conflict["project_b_id"], {})
        conflict["project_a_work_type"] = project_a.get("work_type")
        conflict["project_b_work_type"] = project_b.get("work_type")

    recommendations = recommend_conflict_orders(conflicts)
    return [
        {**conflict, **recommendation}
        for conflict, recommendation in zip(conflicts, recommendations)
    ]