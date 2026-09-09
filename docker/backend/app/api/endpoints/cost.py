from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import BOQItem, CostRecord, Project
from app.services.evm_engine import compute_project_evm

router = APIRouter()

class BOQItemCreate(BaseModel):
    project_id: int
    item_code: str
    description: str
    unit: str = "m2"
    planned_quantity: float
    unit_rate: float
    budgeted_cost: float
    activity_id: Optional[int] = None

@router.get("/projects/{project_id}/evm")
def get_project_evm(project_id: int, db: Session = Depends(get_db)):
    evm_data = compute_project_evm(db, project_id)
    if not evm_data:
        raise HTTPException(status_code=404, detail="Project or EVM data not found")
    return evm_data

@router.get("/projects/{project_id}/boq")
def list_project_boq(project_id: int, db: Session = Depends(get_db)):
    boq_items = db.query(BOQItem).filter(BOQItem.project_id == project_id).all()
    return [
        {
            "id": b.id,
            "item_code": b.item_code,
            "description": b.description,
            "unit": b.unit,
            "planned_quantity": b.planned_quantity,
            "actual_quantity": b.actual_quantity,
            "unit_rate": b.unit_rate,
            "budgeted_cost": b.budgeted_cost,
            "actual_cost": b.actual_cost,
            "activity_id": b.activity_id,
            "cost_variance": b.budgeted_cost - b.actual_cost,
            "progress_pct": round((b.actual_quantity / max(b.planned_quantity, 1.0)) * 100.0, 1)
        }
        for b in boq_items
    ]

@router.post("/boq")
def create_boq_item(data: BOQItemCreate, db: Session = Depends(get_db)):
    boq = BOQItem(
        project_id=data.project_id,
        item_code=data.item_code,
        description=data.description,
        unit=data.unit,
        planned_quantity=data.planned_quantity,
        unit_rate=data.unit_rate,
        budgeted_cost=data.budgeted_cost,
        activity_id=data.activity_id
    )
    db.add(boq)
    db.commit()
    db.refresh(boq)
    return boq

@router.get("/projects/{project_id}/cost")
def get_project_cost_breakdown(project_id: int, db: Session = Depends(get_db)):
    evm = compute_project_evm(db, project_id)
    records = db.query(CostRecord).filter(CostRecord.project_id == project_id).all()
    return {
        "evm_summary": evm,
        "recent_cost_records": [
            {
                "id": c.id,
                "date": c.date.isoformat(),
                "planned_cost": c.planned_cost,
                "actual_cost": c.actual_cost,
                "notes": c.notes
            }
            for c in records
        ]
    }
