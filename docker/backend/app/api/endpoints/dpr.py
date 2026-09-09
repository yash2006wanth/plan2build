import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.services.dpr_engine import generate_daily_progress_report

router = APIRouter()

class DPRGenerateRequest(BaseModel):
    project_id: int
    date: Optional[str] = None

@router.post("/dpr/generate")
def generate_dpr(req: DPRGenerateRequest, db: Session = Depends(get_db)):
    target_d = datetime.date.today()
    if req.date:
        try:
            target_d = datetime.date.fromisoformat(req.date)
        except ValueError:
            pass

    dpr = generate_daily_progress_report(db, req.project_id, target_d)
    if not dpr:
        raise HTTPException(status_code=404, detail="Unable to generate Daily Progress Report")
    return dpr

@router.get("/dpr/{project_id}")
def get_dpr(project_id: int, db: Session = Depends(get_db)):
    return generate_daily_progress_report(db, project_id)
