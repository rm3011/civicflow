from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ComplaintCreate, ProjectCreate
from supabase_client import supabase
from services.gemini_service import classify_complaint
from services.conflict_service import find_nearby_projects, detect_all_conflicts
from config import SUPABASE_URL, SUPABASE_KEY


app = FastAPI(title="CIVICFLOW API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "CIVICFLOW running"}

@app.post("/projects")
def create_project(payload: ProjectCreate):
    try:
        res = supabase.rpc("insert_project", {
            "p_name": payload.name,
            "p_authority": payload.authority,
            "p_work_type": payload.work_type,
            "p_lat": payload.latitude,
            "p_lng": payload.longitude,
            "p_start": payload.start_date.isoformat(),
            "p_end": payload.end_date.isoformat(),
        }).execute()
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

@app.post("/complaints")
def create_complaint(payload: ComplaintCreate):
    classification = classify_complaint(payload.description, payload.photo_url)

    try:
        res = supabase.rpc("insert_complaint", {
            "p_description": payload.description,
            "p_photo_url": payload.photo_url,
            "p_lat": payload.latitude,
            "p_lng": payload.longitude,
            "p_problem_type": classification["problem_type"],
            "p_severity": classification["severity"],
            "p_confidence": classification["confidence"],
            "p_reasoning": classification["reasoning"],
        }).execute()
    except Exception as e:
        print(f"[create_complaint ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=500, detail="Insert returned no data")

    complaint = res.data[0]
    nearby = find_nearby_projects(complaint["id"], 100)

    return {
        "complaint": complaint,
        "nearby_projects": nearby,
        "coordination_needed": len(nearby) > 0,
    }

@app.get("/complaints")
def list_complaints():
    res = supabase.table("complaints").select("*").order("created_at", desc=True).execute()
    return res.data or []

@app.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: int):
    res = supabase.table("complaints").select("*").eq("id", complaint_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint = res.data[0]
    nearby = find_nearby_projects(complaint_id, 100)
    return {"complaint": complaint, "nearby_projects": nearby}

@app.get("/conflicts")
def list_conflicts():
    conflicts = detect_all_conflicts()
    return {"count": len(conflicts), "conflicts": conflicts}