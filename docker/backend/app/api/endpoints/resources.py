from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.resource_engine import compute_labour_productivity, compute_equipment_utilization, compute_material_intelligence
from app.models.schema import ProjectRisk

router = APIRouter()

@router.get("/projects/{project_id}/labour")
def get_labour_productivity(project_id: int, db: Session = Depends(get_db)):
    return compute_labour_productivity(db, project_id)

@router.get("/projects/{project_id}/equipment")
def get_equipment_utilization(project_id: int, db: Session = Depends(get_db)):
    return compute_equipment_utilization(db, project_id)

@router.get("/projects/{project_id}/materials")
def get_material_intelligence(project_id: int, db: Session = Depends(get_db)):
    return compute_material_intelligence(db, project_id)

@router.get("/projects/{project_id}/risks")
def get_project_risks(project_id: int, db: Session = Depends(get_db)):
    risks = db.query(ProjectRisk).filter(ProjectRisk.project_id == project_id).all()
    return [
        {
            "id": r.id,
            "risk_title": r.risk_title,
            "severity": r.severity,
            "category": r.category,
            "impact_days": r.impact_days,
            "mitigation_strategy": r.mitigation_strategy,
            "activity_id": r.activity_id
        }
        for r in risks
    ]
