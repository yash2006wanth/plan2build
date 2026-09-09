from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.services.critical_path_engine import compute_critical_path, calculate_downstream_impact

router = APIRouter()

class DownstreamImpactRequest(BaseModel):
    activity_id: int
    delay_days: int

@router.get("/projects/{project_id}/critical-path")
def get_critical_path(project_id: int, db: Session = Depends(get_db)):
    result = compute_critical_path(db, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Critical path analysis failed or project not found")
    return result

@router.post("/activities/{activity_id}/downstream-impact")
def get_activity_downstream_impact(activity_id: int, req: DownstreamImpactRequest, db: Session = Depends(get_db)):
    impact = calculate_downstream_impact(db, activity_id, req.delay_days)
    if not impact:
        raise HTTPException(status_code=404, detail="Activity not found")
    return impact
