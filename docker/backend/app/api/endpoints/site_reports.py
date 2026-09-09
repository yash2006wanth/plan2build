import os
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.config import settings
from app.models.schema import SiteReport, EvidencePhoto, ActivityMatch, ScheduleActivity, Project
from app.schemas.pydantic_models import SiteReportResponse, ActivityMatchResponse, MatchApprovalRequest
from app.ai.matcher import match_site_report
from app.services.cv_module import process_evidence_photo
from app.services.progress_engine import update_activity_progress
from app.services.alert_engine import generate_project_alerts

router = APIRouter()

@router.post("", response_model=SiteReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_site_report(
    project_id: int = Form(...),
    report_text: str = Form(...),
    quantity_completed: float = Form(...),
    unit: str = Form("m2"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    remarks: Optional[str] = Form(None),
    labour_count: Optional[int] = Form(0),
    equipment_details: Optional[str] = Form(None),
    material_consumption: Optional[str] = Form(None),
    photos: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    site_report = SiteReport(
        project_id=project_id,
        report_text=report_text,
        quantity_completed=quantity_completed,
        unit=unit,
        latitude=latitude,
        longitude=longitude,
        timestamp=datetime.datetime.utcnow(),
        remarks=remarks,
        labour_count=labour_count or 0,
        equipment_details=equipment_details,
        material_consumption=material_consumption
    )
    db.add(site_report)
    db.flush()

    # Process and save photos
    if photos:
        for p in photos:
            if p.filename:
                file_ext = os.path.splitext(p.filename)[1]
                unique_name = f"{uuid.uuid4().hex}{file_ext}"
                dest_path = os.path.join(settings.UPLOAD_DIR, unique_name)
                
                contents = await p.read()
                with open(dest_path, "wb") as f:
                    f.write(contents)

                # Process photo with OpenCV
                cv_meta = process_evidence_photo(dest_path)

                evidence = EvidencePhoto(
                    site_report_id=site_report.id,
                    file_path=f"/uploads/{unique_name}",
                    cv_metadata=cv_meta
                )
                db.add(evidence)

    db.commit()

    # Run Multi-Signal Hybrid AI Matcher
    matches = match_site_report(db, site_report)

    # Auto-update progress if high confidence match was auto-approved
    top_match = matches[0] if matches else None
    if top_match and top_match.approved:
        update_activity_progress(db, top_match.activity_id)
        generate_project_alerts(db, project_id)

    db.refresh(site_report)
    return format_site_report_response(site_report, matches)


@router.get("/projects/{project_id}", response_model=List[SiteReportResponse])
def list_site_reports(project_id: int, db: Session = Depends(get_db)):
    reports = db.query(SiteReport).filter(SiteReport.project_id == project_id).order_by(SiteReport.timestamp.desc()).all()
    results = []
    for r in reports:
        matches = db.query(ActivityMatch).filter(ActivityMatch.site_report_id == r.id).order_by(ActivityMatch.final_score.desc()).all()
        results.append(format_site_report_response(r, matches))
    return results


@router.post("/{report_id}/approve-match", response_model=SiteReportResponse)
def approve_or_override_match(
    report_id: int,
    approval_req: MatchApprovalRequest,
    db: Session = Depends(get_db)
):
    report = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Site report not found")

    matches = db.query(ActivityMatch).filter(ActivityMatch.site_report_id == report_id).all()
    target_match = None

    for m in matches:
        if m.activity_id == approval_req.approved_activity_id:
            m.approved = True
            target_match = m
        else:
            m.approved = False

    if not target_match:
        # Create a manual override match record
        target_match = ActivityMatch(
            site_report_id=report_id,
            activity_id=approval_req.approved_activity_id,
            semantic_score=1.0,
            location_score=1.0,
            date_score=1.0,
            keyword_score=1.0,
            wbs_score=1.0,
            final_score=1.0,
            confidence="Manual Override",
            matching_reason="Manually selected and approved by Project Manager / Engineer.",
            approved=True
        )
        db.add(target_match)
        matches.append(target_match)

    db.commit()

    # Recalculate progress for approved activity & update project alerts
    update_activity_progress(db, approval_req.approved_activity_id)
    generate_project_alerts(db, report.project_id)

    db.refresh(report)
    return format_site_report_response(report, matches)


def format_site_report_response(r: SiteReport, matches: List[ActivityMatch]) -> dict:
    match_list = []
    for m in matches:
        act = m.activity
        match_list.append({
            "id": m.id,
            "site_report_id": m.site_report_id,
            "activity_id": m.activity_id,
            "activity_code": act.activity_id if act else None,
            "activity_name": act.activity_name if act else None,
            "semantic_score": m.semantic_score,
            "location_score": m.location_score,
            "date_score": m.date_score,
            "keyword_score": m.keyword_score,
            "wbs_score": m.wbs_score,
            "final_score": m.final_score,
            "confidence": m.confidence,
            "matching_reason": m.matching_reason,
            "approved": m.approved,
            "created_at": m.created_at
        })

    photo_list = [
        {
            "id": p.id,
            "site_report_id": p.site_report_id,
            "file_path": p.file_path,
            "cv_metadata": p.cv_metadata,
            "created_at": p.created_at
        }
        for p in r.photos
    ]

    return {
        "id": r.id,
        "project_id": r.project_id,
        "submitted_by": r.submitted_by,
        "submitter_name": r.submitter.name if r.submitter else "Site Engineer",
        "report_text": r.report_text,
        "quantity_completed": r.quantity_completed,
        "unit": r.unit,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "timestamp": r.timestamp,
        "remarks": r.remarks,
        "labour_count": r.labour_count,
        "equipment_details": r.equipment_details,
        "material_consumption": r.material_consumption,
        "photos": photo_list,
        "matches": match_list,
        "created_at": r.created_at
    }
