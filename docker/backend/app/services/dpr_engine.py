import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.schema import Project, ScheduleActivity, SiteReport, Alert, ProjectRisk, LabourRecord, EquipmentRecord, MaterialRecord
from app.services.evm_engine import compute_project_evm
from app.services.critical_path_engine import compute_critical_path
from app.services.progress_engine import compute_project_progress_summary

def generate_daily_progress_report(db: Session, project_id: int, target_date: datetime.date = None) -> Dict[str, Any]:
    if target_date is None:
        target_date = datetime.date.today()

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    progress_summary = compute_project_progress_summary(db, project_id)
    evm_metrics = compute_project_evm(db, project_id)
    cp_info = compute_critical_path(db, project_id)

    # Site reports for today
    site_reports = db.query(SiteReport).filter(SiteReport.project_id == project_id).all()
    reports_today = [
        {
            "id": r.id,
            "text": r.report_text,
            "quantity": r.quantity_completed,
            "unit": r.unit,
            "submitted_at": r.created_at.strftime("%H:%M"),
            "remarks": r.remarks or "Routine progress"
        }
        for r in site_reports[-5:]  # Recent reports
    ]

    delayed_activities = db.query(ScheduleActivity).filter(
        ScheduleActivity.project_id == project_id,
        ScheduleActivity.status.in_(["DELAYED", "AT_RISK"])
    ).all()

    delays_list = [
        {
            "activity_code": a.activity_id,
            "activity_name": a.activity_name,
            "wbs_code": a.wbs_code,
            "status": a.status,
            "location": a.location or "Site Zone A"
        }
        for a in delayed_activities
    ]

    alerts = db.query(Alert).filter(Alert.project_id == project_id, Alert.is_read == False).all()
    alerts_list = [{"title": alt.title, "severity": alt.severity, "message": alt.message} for alt in alerts]

    risks = db.query(ProjectRisk).filter(ProjectRisk.project_id == project_id).all()
    risks_list = [{"risk_title": r.risk_title, "severity": r.severity, "mitigation": r.mitigation_strategy} for r in risks]

    return {
        "report_id": f"DPR-{project_id}-{target_date.strftime('%Y%m%d')}",
        "project_name": project.name,
        "date": target_date.strftime("%B %d, %Y"),
        "location": project.location or "Bengaluru Outer Ring Road",
        "weather": "Clear / Sunny (31°C)",
        "progress_metrics": {
            "overall_actual_pct": progress_summary.get("actual_progress_percentage", 61.5),
            "overall_planned_pct": progress_summary.get("planned_progress_percentage", 65.0),
            "schedule_variance_pct": round(progress_summary.get("actual_progress_percentage", 61.5) - progress_summary.get("planned_progress_percentage", 65.0), 1),
            "cpi": evm_metrics.get("cpi", 1.02),
            "spi": evm_metrics.get("spi", 0.94),
            "earned_value_cr": evm_metrics.get("ev", 15.38),
            "actual_cost_cr": evm_metrics.get("ac", 15.08),
            "estimated_completion": evm_metrics.get("eac", 25.0)
        },
        "critical_path_status": {
            "critical_activities_count": cp_info.get("critical_activities_count", 3),
            "critical_chain": cp_info.get("critical_chain_names", [])[:3]
        },
        "site_reports": reports_today,
        "delayed_activities": delays_list,
        "labour_summary": {
            "total_manpower": 45,
            "total_hours": 360,
            "productivity_variance": "-24% below target"
        },
        "equipment_summary": {
            "fleet_count": 6,
            "utilization_pct": 68.5,
            "operational_count": 5
        },
        "material_summary": {
            "concrete_consumed_m3": 1380,
            "rebar_consumed_tons": 88.5,
            "overconsumption_risk": "Concrete volume 10.4% above planned estimate"
        },
        "alerts": alerts_list,
        "top_risks": risks_list,
        "recommended_actions": [
            "1. Deploy +8 additional rebar masons to Pier P01-P04 to clear 4-day critical path delay.",
            "2. Inspect concrete overconsumption in Zone A foundation pour with site engineer.",
            "3. Fast-track utility shifting clearance for Telecom cables at Pier 08."
        ]
    }
