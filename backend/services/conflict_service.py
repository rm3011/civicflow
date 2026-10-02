from supabase_client import supabase

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

def detect_all_conflicts():
    try:
        res = supabase.rpc("detect_all_conflicts").execute()
        return res.data or []
    except Exception as e:
        print(f"[detect_all_conflicts ERROR] {e}")
        return []