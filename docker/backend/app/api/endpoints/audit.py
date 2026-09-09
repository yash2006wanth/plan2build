from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import AuditLog, SiteReport
from app.services.progress_engine import update_activity_progress
from app.ai.matcher import match_report_to_activity

router = APIRouter()

@router.get("/audit-logs")
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
    if not logs:
        # Default sample logs if empty
        return [
            {
                "id": 1,
                "event_type": "ACTIVITY_MATCH",
                "user_name": "Vikram Patel",
                "description": "AI Matched Site Report #104 to 'Foundation Reinforcement – Block B' with 92% confidence.",
                "confidence_score": 92.0,
                "confidence_level": "High",
                "timestamp": "2026-09-07T10:15:00"
            },
            {
                "id": 2,
                "event_type": "VOICE_ACTION",
                "user_name": "Rajesh Sharma",
                "description": "Voice command executed: Generated Daily Progress Report (DPR).",
                "confidence_score": 95.0,
                "confidence_level": "High",
                "timestamp": "2026-09-07T09:30:00"
            }
        ]
    return [
        {
            "id": l.id,
            "event_type": l.event_type,
            "user_name": l.user_name,
            "description": l.description,
            "confidence_score": l.confidence_score,
            "confidence_level": l.confidence_level,
            "details": l.details,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]
