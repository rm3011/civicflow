# models.py
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

class ComplaintCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    zone_id: int
    photo_url: Optional[str] = None
    city: Literal["chennai", "chengalpattu", "kancheepuram"] = "chennai"

class ProjectCreate(BaseModel):
    name: str
    authority: str
    work_type: str
    latitude: float
    longitude: float
    start_date: date
    end_date: date
    department_id: str
    zone_id: int
    city: str = "chennai"

class SanctionRequest(BaseModel):
    sanctioned: bool
    sanctioned_by: Optional[str] = None
    remarks: Optional[str] = None


class CompletionRequest(BaseModel):
    completed: bool
    completed_by: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str