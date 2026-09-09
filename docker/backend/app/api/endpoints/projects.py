from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.schema import Project, ScheduleActivity, SiteReport, Alert
from app.schemas.pydantic_models import (
    ProjectCreate, ProjectResponse, DashboardSummaryResponse, ScheduleActivityResponse
)
from app.services.progress_engine import compute_project_progress_summary, calculate_planned_percentage, calculate_actual_percentage
from app.services.forecast_engine import forecast_activity_completion

router = APIRouter()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        location=project_in.location,
        start_date=project_in.start_date,
        planned_end_date=project_in.planned_end_date,
        status=project_in.status
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.get("/{project_id}/dashboard", response_model=DashboardSummaryResponse)
def get_project_dashboard(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    total_projects = db.query(Project).count()
    summary = compute_project_progress_summary(db, project_id)

    # Recent Alerts
    alerts = db.query(Alert).filter(Alert.project_id == project_id).order_by(Alert.created_at.desc()).limit(10).all()
    alert_responses = [
        {
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
        }
        for a in alerts
    ]

    # Forecast project end date & max expected delay
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()
    max_delay = 0
    max_forecast_date = project.planned_end_date

    for act in activities:
        fc = forecast_activity_completion(db, act.id)
        if fc.get("expected_delay_days", 0) > max_delay:
            max_delay = fc["expected_delay_days"]
            if fc.get("projected_completion_date"):
                max_forecast_date = fc["projected_completion_date"]

    status_counts = summary.get("status_counts", {})

    return {
        "total_projects": total_projects,
        "overall_planned_progress": summary["overall_planned_progress"],
        "overall_actual_progress": summary["overall_actual_progress"],
        "variance": summary["variance"],
        "delayed_activities_count": status_counts.get("DELAYED", 0),
        "at_risk_activities_count": status_counts.get("AT_RISK", 0),
        "on_track_activities_count": status_counts.get("ON_TRACK", 0) + status_counts.get("COMPLETED", 0),
        "forecasted_completion_date": max_forecast_date,
        "overall_expected_delay_days": max_delay,
        "recent_alerts": alert_responses,
        "s_curve_data": summary["s_curve"],
        "wbs_progress_data": summary["wbs_breakdown"],
        "status_distribution": [
            {"name": "On Track / Completed", "value": status_counts.get("ON_TRACK", 0) + status_counts.get("COMPLETED", 0)},
            {"name": "At Risk", "value": status_counts.get("AT_RISK", 0)},
            {"name": "Delayed", "value": status_counts.get("DELAYED", 0)},
            {"name": "Not Started", "value": status_counts.get("NOT_STARTED", 0)},
        ]
    }
