import csv
import io
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schema import ActivityEvent, AuditLog, ScheduleActivity, ScheduleSyncQueue, TerminologyAlias
from app.services.execution_engine import (DISCIPLINES, approve_event, infer_discipline, normalize_event,
                                           process_local_sync, record_event)

router = APIRouter()

class PlainTextIngest(BaseModel): project_id: int; text: str; source_user: str = "Planner"
class Decision(BaseModel): action: str; activity_id: Optional[int] = None; user_name: str = "Planner"
class AliasIn(BaseModel): project_id: Optional[int] = None; site_term: str; planned_term: str; discipline: Optional[str] = None

def _result(events):
    return {"imported": len(events), "auto_linked": sum(e.approval_status == "AUTO_APPROVED" for e in events),
            "needs_review": sum(e.approval_status == "PENDING_REVIEW" for e in events), "unmatched": sum(e.approval_status == "UNMATCHED" for e in events), "invalid": 0,
            "events": [{"id":e.id,"status":e.approval_status,"discipline":e.discipline,"confidence":e.confidence_score} for e in events]}

@router.get("/execution/disciplines")
def disciplines(): return {"disciplines": DISCIPLINES}

@router.post("/execution/ingest/text")
def ingest_text(payload: PlainTextIngest, db: Session = Depends(get_db)):
    if not payload.text.strip(): raise HTTPException(400, "Text is required")
    source = {"source_user": payload.source_user, "source_doc_metadata": {"source_type":"PLAINTEXT_REPORT", "page": None, "row": 1}}
    event = record_event(db, payload.project_id, normalize_event({"description": payload.text}, source)); db.commit()
    return _result([event])

@router.post("/execution/ingest/file")
async def ingest_file(project_id: int = Form(...), file: UploadFile = File(...), source_user: str = Form("Planner"), db: Session = Depends(get_db)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower(); raw = await file.read(); rows = []
    if ext == "csv": rows = pd.read_csv(io.BytesIO(raw)).fillna("").to_dict("records")
    elif ext in ("xls", "xlsx"): rows = pd.read_excel(io.BytesIO(raw)).fillna("").to_dict("records")
    elif ext == "txt": rows = [{"description": raw.decode("utf-8", errors="replace")}]
    elif ext in ("pdf", "jpg", "jpeg", "png"):
        # No OCR engine configured: retain source and create a review item without fabricated extraction.
        rows = [{"description": "", "remarks": "Manual review required: OCR is not configured."}]
    else: raise HTTPException(400, "Supported formats: CSV, XLS, XLSX, TXT, PDF, JPG, JPEG, PNG")
    events=[]; invalid=0
    for index,row in enumerate(rows, start=1):
        try:
            source={"source_user":source_user,"source_doc_metadata":{"source_type":ext.upper()+"_IMPORT","filename":file.filename,"page":1 if ext in ("pdf","jpg","jpeg","png") else None,"row":index,"ocr_status":"manual_review_required" if ext in ("pdf","jpg","jpeg","png") else "not_needed"}}
            event=record_event(db,project_id,normalize_event(row,source))
            if ext in ("pdf","jpg","jpeg","png"): event.approval_status="PENDING_REVIEW"; event.confidence_score=0
            events.append(event)
        except Exception: invalid += 1
    db.commit(); output=_result(events); output["invalid"]=invalid; return output

@router.get("/execution/events")
def events(project_id: int, status: Optional[str]=None, discipline: Optional[str]=None, db: Session=Depends(get_db)):
    q=db.query(ActivityEvent).filter_by(project_id=project_id)
    if status: q=q.filter(ActivityEvent.approval_status==status)
    if discipline: q=q.filter(ActivityEvent.discipline==discipline)
    return [{"id":e.id,"event_type":e.event_type,"discipline":e.discipline,"timestamp":e.event_timestamp,"raw_input":e.raw_input,"status":e.approval_status,"confidence":e.confidence_score,"activity_id":e.activity_id,"mapping_type":e.mapping_type,"is_inferred":e.is_inferred} for e in q.order_by(ActivityEvent.created_at.desc()).all()]

@router.post("/execution/events/{event_id}/decision")
def decide(event_id:int, decision:Decision, db:Session=Depends(get_db)):
    e=db.get(ActivityEvent,event_id)
    if not e: raise HTTPException(404,"Event not found")
    before={"status":e.approval_status,"activity_id":e.activity_id}
    if decision.action in ("approve","change_activity","create_unplanned_activity"):
        target=decision.activity_id
        if decision.action=="create_unplanned_activity":
            a=ScheduleActivity(project_id=e.project_id,activity_id=f"UNPLANNED-{e.id}",activity_name=e.raw_input or "Unplanned execution",wbs_code="UNPLANNED",description=e.remarks,start_date=e.event_timestamp.date(),end_date=e.event_timestamp.date(),discipline=e.discipline,location=e.location,status="NOT_STARTED")
            db.add(a);db.flush();target=a.id
        approve_event(db,e,decision.user_name,target,"PLANNER_OVERRIDE")
    elif decision.action=="reject": e.approval_status="REJECTED"; e.approved_by=decision.user_name
    elif decision.action=="merge_duplicate": e.approval_status="REJECTED"; e.remarks=(e.remarks or "")+" [Merged duplicate]"
    else: raise HTTPException(400,"Unsupported action")
    db.add(AuditLog(event_type="EXECUTION_REVIEW",user_name=decision.user_name,description=f"{decision.action} event {e.id}",confidence_score=e.confidence_score,details={"before":before,"after":{"status":e.approval_status,"activity_id":e.activity_id}})); db.commit()
    return {"id":e.id,"status":e.approval_status,"activity_id":e.activity_id}

@router.post("/execution/aliases")
def add_alias(item:AliasIn,db:Session=Depends(get_db)):
    alias=TerminologyAlias(**item.model_dump());db.add(alias);db.commit();return {"id":alias.id}

@router.get("/execution/sync")
def sync_queue(project_id:int,db:Session=Depends(get_db)):
    return [{"id":q.id,"activity_id":q.activity_id,"action":q.sync_action,"status":q.status,"adapter":q.adapter_type,"error":q.error_message} for q in db.query(ScheduleSyncQueue).filter_by(project_id=project_id).all()]

@router.post("/execution/sync/process")
def process_sync(project_id:int,db:Session=Depends(get_db)):
    queues=db.query(ScheduleSyncQueue).filter_by(project_id=project_id).filter(ScheduleSyncQueue.status.in_(["QUEUED","RETRYING"])).all()
    for q in queues:
        if q.adapter_type=="LOCAL_INTERNAL": process_local_sync(db,q)
        else: q.status="MANUAL_ACTION_REQUIRED";q.error_message="Adapter stub only; configure credentials for a live PMIS integration."
    db.commit(); return {"processed":len(queues)}

@router.get("/execution/analytics")
def analytics(project_id:int,db:Session=Depends(get_db)):
    acts=db.query(ScheduleActivity).filter_by(project_id=project_id).all(); approved=db.query(ActivityEvent).filter_by(project_id=project_id).filter(ActivityEvent.approval_status.in_(["APPROVED","AUTO_APPROVED"])).all()
    durations=[{"activity":a.activity_name,"discipline":a.discipline,"planned_days":(a.end_date-a.start_date).days,"actual_days":(a.actual_end_at-a.actual_start_at).total_seconds()/86400,"confirmed":True} for a in acts if a.actual_start_at and a.actual_end_at]
    productivity={}; delays={}; unmatched={}
    for e in approved:
        productivity[e.discipline]=productivity.get(e.discipline,0)+e.quantity
        if e.delay_cause: delays[e.delay_cause]=delays.get(e.delay_cause,0)+1
    for e in db.query(ActivityEvent).filter_by(project_id=project_id,approval_status="UNMATCHED").all(): unmatched[e.raw_input or "(no extracted text)"]=unmatched.get(e.raw_input or "(no extracted text)",0)+1
    return {"actual_vs_planned":durations,"discipline_productivity":productivity,"recurring_delay_reasons":delays,"unmatched_terminology":unmatched,"lessons":["Confirmed values are sourced from approved execution events.","Inferred labels require planner review."]}
