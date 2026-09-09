import datetime
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schema import Project, ScheduleActivity, SiteReport, ActivityMatch, EvidencePhoto
from app.services.progress_engine import update_activity_progress, compute_project_progress_summary
from app.services.alert_engine import generate_project_alerts
from app.ai.matcher import match_site_report

router = APIRouter()

DEMO_UPDATE_SCENARIOS = [
    {
        "report_text": "Completed Pier Column P03 concrete pour, 120 m3 M40 grade concrete poured using boom pump.",
        "quantity": 120.0,
        "unit": "m3",
        "lat": 12.9262,
        "lon": 77.6838,
        "target_wbs": "WBS-02.02",
        "remarks": "Verticality double-checked with laser transit.",
        "labour": 24,
        "eq": "36m Concrete Pump, 4 Transit Mixers",
        "mat": "M40 Concrete 120m3"
    },
    {
        "report_text": "Foundation Raft mass concrete pour completed for Pier P04, total 220 m3 poured continuous overnight shift.",
        "quantity": 220.0,
        "unit": "m3",
        "lat": 12.9254,
        "lon": 77.6827,
        "target_wbs": "WBS-01.03",
        "remarks": "Slump test 150mm maintained throughout pour.",
        "labour": 30,
        "eq": "2 Ready-Mix Pumps, 8 Transit Mixers",
        "mat": "M35 RMC 220m3"
    },
    {
        "report_text": "Column rebar cage assembly completed for Pier P03 & P04. Fixed 25 tons TMT rebar steel.",
        "quantity": 25.0,
        "unit": "tons",
        "lat": 12.9259,
        "lon": 77.6833,
        "target_wbs": "WBS-02.01",
        "remarks": "Cover blocks 50mm placed as per design specifications.",
        "labour": 20,
        "eq": "15-Ton Hydra Crane",
        "mat": "Fe550D Steel 25 Tons"
    }
]

@router.post("/run-update")
def run_demo_update(project_id: int = 1, db: Session = Depends(get_db)):
    """
    Executes a 1-click live demo update:
    Simulates field report submission -> AI activity match -> Progress update -> S-Curve recalculation -> Alert triggers.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scenario = random.choice(DEMO_UPDATE_SCENARIOS)

    # 1. Create Site Report
    sreport = SiteReport(
        project_id=project.id,
        report_text=scenario["report_text"],
        quantity_completed=scenario["quantity"],
        unit=scenario["unit"],
        latitude=scenario["lat"],
        longitude=scenario["lon"],
        timestamp=datetime.datetime.utcnow(),
        remarks=scenario["remarks"],
        labour_count=scenario["labour"],
        equipment_details=scenario["eq"],
        material_consumption=scenario["mat"]
    )
    db.add(sreport)
    db.flush()

    # 2. Attach Evidence Photo
    photo = EvidencePhoto(
        site_report_id=sreport.id,
        file_path="/uploads/demo_site_photo.jpg",
        cv_metadata={
            "processed": True,
            "quality": {"brightness": 132.0, "contrast": 50.0, "is_clear": True},
            "visual_features": ["High Structural Detail (Rebar pattern detected)", "Daylight Site Exposure"],
            "ai_confidence_score": 0.94
        }
    )
    db.add(photo)
    db.commit()

    # 3. Execute Multi-Signal Hybrid AI Matcher
    matches = match_site_report(db, sreport)

    # Find the top matched activity
    matched_activity = None
    if matches:
        top = matches[0]
        top.approved = True  # Auto-approve for seamless demo flow
        matched_activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == top.activity_id).first()
        db.commit()

        # 4. Update Progress Engine
        update_activity_progress(db, top.activity_id)

    # 5. Refresh Alerts
    new_alerts = generate_project_alerts(db, project.id)

    # 6. Fetch updated metrics summary
    summary = compute_project_progress_summary(db, project.id)

    return {
        "message": "Demo site update successfully simulated and matched!",
        "site_report_id": sreport.id,
        "matched_activity": {
            "id": matched_activity.id if matched_activity else None,
            "activity_id": matched_activity.activity_id if matched_activity else None,
            "name": matched_activity.activity_name if matched_activity else None,
        },
        "ai_match_confidence": matches[0].confidence if matches else "N/A",
        "ai_match_score": matches[0].final_score if matches else 0.0,
        "matching_reason": matches[0].matching_reason if matches else "",
        "updated_overall_actual_progress": summary["overall_actual_progress"],
        "updated_variance": summary["variance"],
        "new_alerts_count": len(new_alerts)
    }
