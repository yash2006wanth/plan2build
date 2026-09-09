from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import SiteReport, AuditLog
from app.ai.matcher import match_report_to_activity
from app.services.progress_engine import update_activity_progress

router = APIRouter()

class OfflineSyncReport(BaseModel):
    project_id: int
    report_text: str
    quantity_completed: float
    unit: str = "m2"
    latitude: float = 12.9250
    longitude: float = 77.6825
    timestamp: str
    remarks: str = "Offline site report"

class SyncPayload(BaseModel):
    reports: List[OfflineSyncReport]

@router.post("/sync")
def sync_offline_reports(payload: SyncPayload, db: Session = Depends(get_db)):
    synced_count = 0
    matched_activities = []

    for item in payload.reports:
        sreport = SiteReport(
            project_id=item.project_id,
            report_text=item.report_text,
            quantity_completed=item.quantity_completed,
            unit=item.unit,
            latitude=item.latitude,
            longitude=item.longitude,
            remarks=f"[OFFLINE SYNCED] {item.remarks}"
        )
        db.add(sreport)
        db.flush()

        match_res = match_report_to_activity(db, item.project_id, item.report_text, item.quantity_completed, item.unit)
        best = match_res.get("best_match", {})
        if best and best.get("activity_id"):
            update_activity_progress(db, best["activity_id"])
            matched_activities.append(best.get("activity_name"))

        synced_count += 1

    audit = AuditLog(
        event_type="OFFLINE_SYNC",
        user_name="Site Worker",
        description=f"Successfully synchronized {synced_count} offline site reports with database.",
        confidence_score=100.0,
        confidence_level="High",
        details={"synced_count": synced_count, "matched_activities": matched_activities}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "SUCCESS",
        "synced_count": synced_count,
        "message": f"Successfully synchronized {synced_count} queued site reports.",
        "matched_activities": matched_activities
    }
