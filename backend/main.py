# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import uuid

from models import (
    ComplaintCreate,
    CompletionRequest,
    ProjectCreate,
    SanctionRequest,
    LoginRequest,
)
from supabase_client import supabase
from services.gemini_service import classify_complaint
from services.conflict_service import (
    detect_complaint_conflicts,
    find_nearby_projects,
    detect_all_conflicts,
)
from constants import (
    DEPARTMENTS,
    DISTRICTS,
    CHENNAI_ZONES,
    CHENGALPATTU_AREAS,
    KANCHEEPURAM_AREAS,
)


app = FastAPI(title="CIVICFLOW API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------- Health / Root ----------
@app.get("/")
def root():
    return {
        "status": "CIVICFLOW running",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "/auth/login",
            "/constants/districts",
            "/constants/departments",
            "/constants/areas",
            "/constants/zones",
            "/complaints",
            "/projects",
            "/conflicts",
            "/upload",
        ],
    }


@app.get("/health")
def health():
    return {"ok": True}


# ---------- Auth (MVP mock) ----------
MOCK_OFFICIALS = {
    "engineer@chennai.gov.in": {
        "password": "demo123",
        "department_id": "storm_water",
        "zone_id": 9,
        "name": "Zone 9 Engineer",
    },
}


@app.post("/auth/login")
def login(payload: LoginRequest):
    official = MOCK_OFFICIALS.get(payload.email)
    if not official or official["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": f"demo-token-{payload.email}",
        "department_id": official["department_id"],
        "zone_id": official["zone_id"],
        "name": official["name"],
    }


# ---------- Constants ----------
@app.get("/constants/districts")
def get_districts():
    return DISTRICTS


@app.get("/constants/departments")
def get_departments(city: str = "chennai"):
    if city not in {district["id"] for district in DISTRICTS}:
        raise HTTPException(status_code=404, detail="District not found")
    return [department for department in DEPARTMENTS if department["handles_complaints"]]


@app.get("/constants/areas")
def get_areas(city: str = "chennai"):
    if city not in {district["id"] for district in DISTRICTS}:
        raise HTTPException(status_code=404, detail="District not found")
    if city == "chengalpattu":
        areas = CHENGALPATTU_AREAS
        area_type = "revenue_division"
    elif city == "kancheepuram":
        areas = KANCHEEPURAM_AREAS
        area_type = "revenue_division"
    else:
        areas = CHENNAI_ZONES
        area_type = "zone"
    return [{**area, "area_type": area_type} for area in areas]


@app.get("/constants/zones")
def get_zones(city: str = "chennai"):
    return get_areas(city)


# ---------- Photo Upload ----------
@app.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP allowed")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    path = f"{uuid.uuid4().hex}.{ext}"

    try:
        supabase.storage.from_("complaint-photos").upload(
            path,
            content,
            {"content-type": file.content_type},
        )
    except Exception as e:
        print(f"[upload ERROR] {e}")
        raise HTTPException(
            status_code=503,
            detail=(
                "Photo storage is unavailable. Verify the complaint-photos bucket "
                "and upload permission using backend/sql/schema.sql."
            ),
        ) from e

    try:
        public_url = supabase.storage.from_("complaint-photos").get_public_url(path)
    except Exception as e:
        print(f"[upload URL ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Could not generate public URL: {e}")

    return {"photo_url": public_url}


# ---------- Projects ----------
@app.post("/projects")
def create_project(payload: ProjectCreate):
    try:
        res = supabase.rpc(
            "insert_project",
            {
                "p_name": payload.name,
                "p_authority": payload.authority,
                "p_work_type": payload.work_type,
                "p_lat": payload.latitude,
                "p_lng": payload.longitude,
                "p_start": payload.start_date.isoformat(),
                "p_end": payload.end_date.isoformat(),
            },
        ).execute()
    except Exception as e:
        print(f"[create_project ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=500, detail="Insert returned no data")
    return res.data[0]


@app.get("/projects")
def list_projects():
    res = supabase.table("projects").select("*").order("created_at", desc=True).execute()
    return res.data or []


# ---------- Complaints ----------
@app.post("/complaints")
def create_complaint(payload: ComplaintCreate):
    valid_area_ids = {area["id"] for area in get_areas(payload.city)}
    if payload.zone_id not in valid_area_ids:
        raise HTTPException(status_code=422, detail="Reporting area does not belong to the selected district")

    # 1. AI classification
    classification = classify_complaint(payload.description, payload.photo_url, payload.city)

    # 2. Insert via RPC
    try:
        res = supabase.rpc(
            "insert_complaint",
            {
                "p_description": payload.description,
                "p_photo_url": payload.photo_url,
                "p_lat": payload.latitude,
                "p_lng": payload.longitude,
                "p_problem_type": classification["problem_type"],
                "p_severity": classification["severity"],
                "p_confidence": classification["confidence"],
                "p_reasoning": classification["reasoning"],
                "p_department_id": classification["department_id"],
                "p_zone_id": payload.zone_id,
                "p_city": payload.city,
            },
        ).execute()
    except Exception as e:
        print(f"[create_complaint ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=500, detail="Insert returned no data")

    complaint = res.data[0]

    # 3. Spatial conflict check
    nearby = find_nearby_projects(complaint["id"], 100)

    return {
        "complaint": complaint,
        "nearby_projects": nearby,
        "coordination_needed": len(nearby) > 0,
    }


@app.get("/complaints")
def list_complaints(
    department: str | None = None,
    zone: int | None = None,
    city: str | None = "chennai",
):
    query = supabase.table("complaints").select("*")
    if department:
        query = query.eq("department_id", department)
    if zone:
        query = query.eq("zone_id", zone)
    if city:
        query = query.eq("city", city)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@app.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: int):
    res = supabase.table("complaints").select("*").eq("id", complaint_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint = res.data[0]
    nearby = find_nearby_projects(complaint_id, 100)
    return {"complaint": complaint, "nearby_projects": nearby}


# ---------- Sanction ----------
@app.patch("/complaints/{complaint_id}/sanction")
def sanction_complaint(complaint_id: int, payload: SanctionRequest):
    update = {
        "status": "sanctioned" if payload.sanctioned else "rejected",
        "sanctioned_by": payload.sanctioned_by,
        "sanction_remarks": payload.remarks,
    }
    if not payload.sanctioned:
        update.update(
            {
                "completed": False,
                "completed_at": None,
                "completed_by": None,
            }
        )

    try:
        res = (
            supabase.table("complaints")
            .update(update)
            .eq("id", complaint_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return res.data[0]


@app.patch("/complaints/{complaint_id}/completion")
def update_complaint_completion(
    complaint_id: int, payload: CompletionRequest
):
    update = {
        "completed": payload.completed,
        "completed_at": (
            datetime.now(timezone.utc).isoformat() if payload.completed else None
        ),
        "completed_by": payload.completed_by if payload.completed else None,
    }

    try:
        result = (
            supabase.table("complaints")
            .update(update)
            .eq("id", complaint_id)
            .eq("status", "sanctioned")
            .execute()
        )
        if result.data:
            return result.data[0]

        existing = (
            supabase.table("complaints")
            .select("id, status")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
    except Exception as e:
        print(f"[update_complaint_completion ERROR] {e}")
        raise HTTPException(
            status_code=503,
            detail="Could not update completion. Please try again.",
        ) from e

    if not existing.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    raise HTTPException(
        status_code=409,
        detail="Only sanctioned complaints can be marked complete.",
    )


# ---------- Conflicts ----------
@app.get("/conflicts")
def list_conflicts():
    try:
        conflicts = detect_all_conflicts()
    except Exception as e:
        print(f"[list_conflicts ERROR] {e}")
        raise HTTPException(
            status_code=503,
            detail="Conflict analysis is temporarily unavailable",
        ) from e
    return {"count": len(conflicts), "conflicts": conflicts}


@app.get("/complaint-conflicts")
def list_complaint_conflicts(zone: int, city: str = "chennai"):
    if city not in {district["id"] for district in DISTRICTS}:
        raise HTTPException(status_code=404, detail="District not found")
    valid_area_ids = {area["id"] for area in get_areas(city)}
    if zone not in valid_area_ids:
        raise HTTPException(status_code=422, detail="Reporting area does not belong to the selected district")

    try:
        conflicts = detect_complaint_conflicts(city, zone)
    except Exception as e:
        print(f"[complaint conflict analysis ERROR] {e}")
        raise HTTPException(
            status_code=503,
            detail="Nearby complaint conflict analysis is temporarily unavailable.",
        ) from e
    return {"count": len(conflicts), "conflicts": conflicts}