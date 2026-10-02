from pydantic import BaseModel
from typing import Optional
from datetime import date

class ComplaintCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    photo_url: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    authority: str
    work_type: str
    latitude: float
    longitude: float
    start_date: date
    end_date: date