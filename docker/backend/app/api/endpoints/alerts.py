from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.schema import Alert
from app.schemas.pydantic_models import AlertResponse
from app.services.alert_engine import generate_project_alerts

router = APIRouter()

@router.get("/projects/{project_id}/alerts", response_model=List[AlertResponse])
def get_project_alerts(project_id: int, db: Session = Depends(get_db)):
    generate_project_alerts(db, project_id)
    alerts = db.query(Alert).filter(Alert.project_id == project_id).order_by(Alert.created_at.desc()).all()
    
    results = []
    for a in alerts:
        results.append({
            "id": a.id,
            "project_id": a.project_id,
            "activity_id": a.activity_id,
            "activity_name": a.activity.activity_name if a.activity else None,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "recommended_action": a.recommended_action,
            "is_read": a.is_read,
            "created_at": a.created_at
        })
    return results

@router.put("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read", "alert_id": alert_id}
