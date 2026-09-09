from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import Scenario
from app.services.scenario_engine import run_scenario_simulation

router = APIRouter()

class ScenarioRunRequest(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = ""
    parameters: Dict[str, Any]

@router.post("/scenarios/run")
def run_scenario(req: ScenarioRunRequest, db: Session = Depends(get_db)):
    res = run_scenario_simulation(
        db,
        project_id=req.project_id,
        name=req.name,
        description=req.description,
        parameters=req.parameters
    )
    if not res:
        raise HTTPException(status_code=400, detail="Unable to execute scenario simulation")
    return res

@router.get("/scenarios/project/{project_id}")
def get_project_scenarios(project_id: int, db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "parameters": s.parameters,
            "predicted_completion": s.predicted_completion.isoformat() if s.predicted_completion else None,
            "schedule_impact_days": s.schedule_impact_days,
            "cost_impact": s.cost_impact,
            "affected_activities": s.affected_activities,
            "created_at": s.created_at.isoformat()
        }
        for s in scenarios
    ]
