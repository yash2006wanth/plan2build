import io
import datetime
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.schema import Project, ScheduleActivity, ActivityDependency, ActivityMatch, SiteReport
from app.schemas.pydantic_models import ScheduleActivityResponse, ActivityDependencyResponse
from app.services.schedule_parser import parse_schedule_file, import_schedule_to_db
from app.services.progress_engine import calculate_planned_percentage, calculate_actual_percentage
from app.services.forecast_engine import forecast_activity_completion

router = APIRouter()

@router.post("/upload/preview")
async def preview_schedule_upload(file: UploadFile = File(...)):
    """
    Parses and validates CSV/XLSX schedule file. Returns valid rows & highlighted invalid rows.
    """
    contents = await file.read()
    try:
        valid_rows, invalid_rows = parse_schedule_file(contents, file.filename)
        return {
            "filename": file.filename,
            "total_rows": len(valid_rows) + len(invalid_rows),
            "valid_count": len(valid_rows),
            "invalid_count": len(invalid_rows),
            "valid_rows": valid_rows,
            "invalid_rows": invalid_rows
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{project_id}/upload/confirm")
async def confirm_schedule_upload(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Inserts validated activities and dependencies into database.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    contents = await file.read()
    valid_rows, invalid_rows = parse_schedule_file(contents, file.filename)

    if not valid_rows:
        raise HTTPException(status_code=400, detail="No valid activities found in uploaded file.")

    imported_count = import_schedule_to_db(db, project_id, valid_rows)
    return {
        "message": f"Successfully imported {imported_count} schedule activities.",
        "imported_count": imported_count
    }

@router.get("/sample-schedule")
def download_sample_schedule(file_type: str = "xlsx"):
    """
    Generates downloadable sample schedule CSV or XLSX file.
    """
    sample_data = [
        {"Activity ID": "WBS-01.01", "Activity Name": "Site Preparation & Clearing", "WBS": "1.1", "Start Date": "2026-08-01", "End Date": "2026-08-10", "Planned Quantity": 500, "Unit": "meters", "Predecessor": "", "Location": "Corridor P01-P08"},
        {"Activity ID": "WBS-01.02", "Activity Name": "Foundation Excavation", "WBS": "1.2", "Start Date": "2026-08-05", "End Date": "2026-08-20", "Planned Quantity": 1200, "Unit": "m3", "Predecessor": "WBS-01.01", "Location": "Zone A"},
        {"Activity ID": "WBS-01.03", "Activity Name": "Raft Concrete Pouring", "WBS": "1.3", "Start Date": "2026-08-15", "End Date": "2026-08-28", "Planned Quantity": 850, "Unit": "m3", "Predecessor": "WBS-01.02", "Location": "Zone A Raft"},
        {"Activity ID": "WBS-02.01", "Activity Name": "Column Rebar Assembly", "WBS": "2.1", "Start Date": "2026-08-22", "End Date": "2026-09-08", "Planned Quantity": 90, "Unit": "tons", "Predecessor": "WBS-01.03", "Location": "Piers P01-P06"},
        {"Activity ID": "WBS-02.02", "Activity Name": "Pier Column Concrete Construction", "WBS": "2.2", "Start Date": "2026-08-28", "End Date": "2026-09-15", "Planned Quantity": 400, "Unit": "m3", "Predecessor": "WBS-02.01", "Location": "Piers P01-P04"}
    ]
    df = pd.DataFrame(sample_data)

    if file_type == "csv":
        csv_bytes = df.to_csv(index=False).encode('utf-8')
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=infrastructure_sample_schedule.csv"}
        )
    else:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="Project Schedule")
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=infrastructure_sample_schedule.xlsx"}
        )

@router.get("/projects/{project_id}/activities", response_model=List[ScheduleActivityResponse])
def get_project_activities(project_id: int, db: Session = Depends(get_db)):
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()
    current_date = datetime.date.today()
    results = []

    for act in activities:
        planned_pct = calculate_planned_percentage(act.start_date, act.end_date, current_date)
        
        approved_matches = db.query(ActivityMatch).filter(
            ActivityMatch.activity_id == act.id,
            ActivityMatch.approved == True
        ).all()
        report_ids = [m.site_report_id for m in approved_matches]
        total_actual_qty = 0.0
        if report_ids:
            reports = db.query(SiteReport).filter(SiteReport.id.in_(report_ids)).all()
            total_actual_qty = sum(r.quantity_completed for r in reports)

        actual_pct = calculate_actual_percentage(total_actual_qty, act.planned_quantity)
        variance = round(actual_pct - planned_pct, 2)
        fc = forecast_activity_completion(db, act.id, current_date)

        results.append({
            "id": act.id,
            "project_id": act.project_id,
            "activity_id": act.activity_id,
            "activity_name": act.activity_name,
            "wbs_code": act.wbs_code,
            "description": act.description,
            "start_date": act.start_date,
            "end_date": act.end_date,
            "planned_quantity": act.planned_quantity,
            "actual_quantity": total_actual_qty,
            "unit": act.unit,
            "location": act.location,
            "status": act.status,
            "parent_activity_id": act.parent_activity_id,
            "planned_percentage": planned_pct,
            "actual_percentage": actual_pct,
            "variance_percentage": variance,
            "projected_completion": fc.get("projected_completion_date"),
            "expected_delay_days": fc.get("expected_delay_days", 0),
            "created_at": act.created_at
        })

    return results

@router.get("/activities/{activity_id}", response_model=Dict[str, Any])
def get_activity_details(activity_id: int, db: Session = Depends(get_db)):
    act = db.query(ScheduleActivity).filter(ScheduleActivity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")

    current_date = datetime.date.today()
    planned_pct = calculate_planned_percentage(act.start_date, act.end_date, current_date)

    approved_matches = db.query(ActivityMatch).filter(
        ActivityMatch.activity_id == act.id,
        ActivityMatch.approved == True
    ).all()
    report_ids = [m.site_report_id for m in approved_matches]

    site_reports = []
    total_actual_qty = 0.0
    if report_ids:
        reports = db.query(SiteReport).filter(SiteReport.id.in_(report_ids)).all()
        total_actual_qty = sum(r.quantity_completed for r in reports)
        for r in reports:
            site_reports.append({
                "id": r.id,
                "report_text": r.report_text,
                "quantity_completed": r.quantity_completed,
                "unit": r.unit,
                "timestamp": r.timestamp,
                "remarks": r.remarks,
                "labour_count": r.labour_count,
                "equipment_details": r.equipment_details,
                "photos_count": len(r.photos)
            })

    actual_pct = calculate_actual_percentage(total_actual_qty, act.planned_quantity)
    variance = round(actual_pct - planned_pct, 2)
    fc = forecast_activity_completion(db, act.id, current_date)

    # Dependencies
    preds = db.query(ActivityDependency).filter(ActivityDependency.successor_id == act.id).all()
    succs = db.query(ActivityDependency).filter(ActivityDependency.predecessor_id == act.id).all()

    return {
        "activity": {
            "id": act.id,
            "project_id": act.project_id,
            "activity_id": act.activity_id,
            "activity_name": act.activity_name,
            "wbs_code": act.wbs_code,
            "description": act.description,
            "start_date": act.start_date,
            "end_date": act.end_date,
            "planned_quantity": act.planned_quantity,
            "actual_quantity": total_actual_qty,
            "unit": act.unit,
            "location": act.location,
            "status": act.status,
            "planned_percentage": planned_pct,
            "actual_percentage": actual_pct,
            "variance_percentage": variance
        },
        "forecast": fc,
        "predecessors": [{"id": p.predecessor.id, "code": p.predecessor.activity_id, "name": p.predecessor.activity_name} for p in preds],
        "successors": [{"id": s.successor.id, "code": s.successor.activity_id, "name": s.successor.activity_name} for s in succs],
        "site_reports": site_reports
    }
