from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.models.schema import Project
from app.services.progress_engine import compute_project_progress_summary

router = APIRouter()

@router.get("/projects/{project_id}/progress", response_model=Dict[str, Any])
def get_project_progress(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    summary = compute_project_progress_summary(db, project_id)
    return summary
