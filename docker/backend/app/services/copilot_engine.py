import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.schema import Project, ScheduleActivity, SiteReport, Alert
from app.services.progress_engine import compute_project_progress_summary
from app.services.evm_engine import compute_project_evm
from app.ai.slm_engine import slm_engine

def query_project_copilot(db: Session, project_id: int, query: str, language: str = "en") -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {
            "answer": "Project not found in ground truth database.",
            "evidence": [],
            "relevant_metrics": {},
            "recommended_action": ""
        }

    # Parse intent using SLM Engine
    intent_info = slm_engine.parse_intent_and_entities(query)

    # 1. Progress Summary
    progress_summary = compute_project_progress_summary(db, project_id)

    # 2. Delayed & At Risk Activities
    delayed_activities = db.query(ScheduleActivity).filter(
        ScheduleActivity.project_id == project_id,
        ScheduleActivity.status.in_(["DELAYED", "AT_RISK"])
    ).limit(5).all()

    delayed_list = [
        {
            "activity_code": a.activity_code,
            "activity_name": a.activity_name,
            "status": a.status,
            "actual_progress_pct": a.actual_progress_pct,
            "planned_progress_pct": a.planned_progress_pct,
            "is_critical": a.is_critical
        }
        for a in delayed_activities
    ]

    # 3. EVM Metrics
    evm_metrics = compute_project_evm(db, project_id)

    # 4. Recent Site Reports
    recent_reports = db.query(SiteReport).filter(
        SiteReport.project_id == project_id
    ).order_by(SiteReport.timestamp.desc()).limit(3).all()

    reports_list = [
        {
            "report_text": r.report_text,
            "quantity_completed": r.quantity_completed,
            "unit": r.unit,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None
        }
        for r in recent_reports
    ]

    # 5. Active Alerts
    active_alerts = db.query(Alert).filter(
        Alert.project_id == project_id
    ).limit(3).all()

    alerts_list = [
        {
            "title": a.title,
            "description": a.description,
            "severity": a.severity
        }
        for a in active_alerts
    ]

    db_metrics = {
        "project": {
            "name": project.name,
            "location": getattr(project, "location", ""),
            "planned_end_date": project.planned_end_date.isoformat() if project.planned_end_date else None
        },
        "progress_summary": progress_summary,
        "evm_metrics": evm_metrics,
        "delayed_activities": delayed_list,
        "delayed_count": len(delayed_list),
        "recent_site_reports": reports_list,
        "active_alerts": alerts_list
    }

    # Generate grounded response via Gemini API or fallback RAG
    return slm_engine.generate_grounded_response(db_metrics, intent_info)
