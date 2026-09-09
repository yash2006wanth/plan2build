import datetime as dt
import hashlib
import io
import re
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.models.schema import (ActivityEvent, ActualDateVersion, AuditLog, ScheduleActivity,
                               ScheduleSyncQueue, SiteReport, TerminologyAlias)

DISCIPLINES = ["Civil", "Piping", "Static Equipment", "Rotating Equipment", "Electrical", "Instrumentation", "HSE", "Unclassified"]
EVENT_TYPES = ["START", "FINISH", "PROGRESS", "HOLD", "RESUME"]
DISCIPLINE_TERMS = {
    "Civil": ["concrete", "excavat", "rebar", "foundation", "civil", "formwork"],
    "Piping": ["pipe", "spool", "weld", "flange", "erect line"],
    "Static Equipment": ["vessel", "tank", "heat exchanger", "column"],
    "Rotating Equipment": ["pump", "compressor", "turbine", "motor alignment"],
    "Electrical": ["cable", "switchgear", "electrical", "tray", "transformer"],
    "Instrumentation": ["instrument", "calibration", "transmitter", "loop check"],
    "HSE": ["safety", "incident", "permit", "hse", "hazard"],
}


def infer_discipline(text: str, supplied: Optional[str] = None) -> str:
    if supplied in DISCIPLINES and supplied != "Unclassified": return supplied
    value = (text or "").lower()
    best = max(((sum(term in value for term in terms), name) for name, terms in DISCIPLINE_TERMS.items()), default=(0, "Unclassified"))
    return best[1] if best[0] else "Unclassified"


def normalize_event(raw: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
    # Spreadsheet headers are accepted case/spacing-insensitively.
    raw = {str(k).strip().lower().replace(" ", "_"): v for k, v in raw.items()}
    text = str(raw.get("description") or raw.get("report_text") or raw.get("activity") or raw.get("remarks") or "").strip()
    joined = " ".join(str(v) for v in raw.values() if v is not None)
    kind = str(raw.get("event_type") or "").upper()
    if kind not in EVENT_TYPES:
        kind = next((e for e in EVENT_TYPES if e.lower() in joined.lower()), "PROGRESS")
    timestamp = raw.get("timestamp") or raw.get("date") or raw.get("event_date") or dt.datetime.utcnow()
    try: timestamp = pd.to_datetime(timestamp).to_pydatetime()
    except Exception: timestamp = dt.datetime.utcnow()
    quantity = raw.get("quantity", raw.get("quantity_completed", 0))
    try: quantity = float(quantity or 0)
    except (ValueError, TypeError): quantity = 0
    discipline = infer_discipline(joined, raw.get("discipline"))
    return {"description": text or joined, "event_type": kind, "timestamp": timestamp, "quantity": quantity,
            "unit": str(raw.get("unit") or "m2"), "location": raw.get("location"), "discipline": discipline,
            "supervisor": raw.get("supervisor") or raw.get("contractor"), "remarks": raw.get("remarks"),
            "wbs": raw.get("wbs") or raw.get("wbs_code") or raw.get("activity_id"), "delay_cause": raw.get("delay_cause"), **source}


def _aliases(db: Session, project_id: int, text: str) -> str:
    for alias in db.query(TerminologyAlias).filter((TerminologyAlias.project_id == project_id) | (TerminologyAlias.project_id == None)).all():
        text = re.sub(re.escape(alias.site_term), alias.planned_term, text, flags=re.I)
    return text


def find_match(db: Session, project_id: int, event: Dict[str, Any]) -> Dict[str, Any]:
    acts = db.query(ScheduleActivity).filter_by(project_id=project_id).all()
    text = _aliases(db, project_id, event["description"].lower())
    tokens = set(re.findall(r"\w+", text))
    ranked = []
    for a in acts:
        atokens = set(re.findall(r"\w+", f"{a.activity_name} {a.description or ''}".lower()))
        semantic = len(tokens & atokens) / max(1, len(tokens | atokens))
        wbs = 1.0 if event.get("wbs") and str(event["wbs"]).lower() in (a.activity_id + " " + a.wbs_code).lower() else .1
        location = 1.0 if event.get("location") and str(event["location"]).lower() in (a.location or "").lower() else .5
        discipline = 1.0 if event["discipline"] != "Unclassified" and a.discipline == event["discipline"] else (.5 if event["discipline"] == "Unclassified" else .1)
        date = 1.0 if a.start_date <= event["timestamp"].date() <= a.end_date else .5
        score = round(.35 * semantic + .2 * location + .15 * date + .15 * wbs + .15 * discipline, 4)
        ranked.append((score, a))
    ranked.sort(key=lambda x: x[0], reverse=True)
    if not ranked or ranked[0][0] < .45: return {"activity": None, "score": ranked[0][0] if ranked else 0, "mapping_type": "UNMATCHED"}
    score, activity = ranked[0]
    mapping = "DIRECT"
    if activity.parent_activity_id and event.get("wbs") and str(event["wbs"]) != activity.activity_id: mapping = "CHILD_ROLLUP"
    return {"activity": activity, "score": score, "mapping_type": mapping}


def record_event(db: Session, project_id: int, normalized: Dict[str, Any]) -> ActivityEvent:
    match = find_match(db, project_id, normalized)
    auto = bool(match["activity"] and match["score"] >= .85)
    event = ActivityEvent(project_id=project_id, activity_id=match["activity"].id if match["activity"] else None,
        event_type=normalized["event_type"], discipline=normalized["discipline"], event_timestamp=normalized["timestamp"],
        source_timestamp=normalized["timestamp"], quantity=normalized["quantity"], unit=normalized["unit"], location=normalized.get("location"),
        supervisor=normalized.get("supervisor"), remarks=normalized.get("remarks"), delay_cause=normalized.get("delay_cause"),
        wbs_or_activity_ref=str(normalized.get("wbs") or ""), raw_input=normalized["description"], source_user=normalized.get("source_user"),
        source_doc_metadata=normalized.get("source_doc_metadata"), confidence_score=match["score"], mapping_type=match["mapping_type"],
        approval_status="AUTO_APPROVED" if auto else ("UNMATCHED" if not match["activity"] else "PENDING_REVIEW"), is_inferred=True)
    db.add(event); db.flush()
    if auto: approve_event(db, event, "System Auto-Approval")
    return event


def enqueue_sync(db: Session, event: ActivityEvent, activity: ScheduleActivity, action: str, payload: Dict[str, Any]):
    key = hashlib.sha256(f"{event.id}:{activity.id}:{action}:{payload}".encode()).hexdigest()
    if not db.query(ScheduleSyncQueue).filter_by(idempotency_key=key).first():
        db.add(ScheduleSyncQueue(project_id=activity.project_id, activity_id=activity.id, event_id=event.id, sync_action=action, payload=payload, idempotency_key=key))


def approve_event(db: Session, event: ActivityEvent, approver: str, activity_id: Optional[int] = None, mapping_type="PLANNER_OVERRIDE"):
    activity = db.query(ScheduleActivity).filter_by(id=activity_id or event.activity_id).first()
    if not activity: raise ValueError("An activity is required to approve this event")
    event.activity_id, event.mapping_type, event.approval_status = activity.id, mapping_type if activity_id else event.mapping_type, "APPROVED" if approver != "System Auto-Approval" else "AUTO_APPROVED"
    event.approved_at, event.approved_by = dt.datetime.utcnow(), approver
    if event.event_type in ("START", "RESUME") and not activity.actual_start_at:
        db.add(ActualDateVersion(activity_id=activity.id, event_id=event.id, field_name="actual_start_at", previous_value=None, approved_value=event.event_timestamp, approved_by=approver, confidence_score=event.confidence_score))
        activity.actual_start_at, activity.actual_start_provenance, activity.actual_start_confidence = event.event_timestamp, event.approval_status, event.confidence_score
        enqueue_sync(db, event, activity, "UPDATE_ACTUAL_START", {"actual_start_at": event.event_timestamp.isoformat()})
    if event.event_type == "FINISH":
        db.add(ActualDateVersion(activity_id=activity.id, event_id=event.id, field_name="actual_end_at", previous_value=activity.actual_end_at, approved_value=event.event_timestamp, approved_by=approver, confidence_score=event.confidence_score))
        activity.actual_end_at, activity.actual_end_provenance, activity.actual_end_confidence, activity.status = event.event_timestamp, event.approval_status, event.confidence_score, "COMPLETED"
        enqueue_sync(db, event, activity, "UPDATE_ACTUAL_FINISH", {"actual_end_at": event.event_timestamp.isoformat(), "status": "COMPLETED"})
    if event.event_type == "HOLD": activity.status = "ON_HOLD"; enqueue_sync(db,event,activity,"UPDATE_STATUS",{"status":"ON_HOLD"})
    if event.event_type == "PROGRESS": enqueue_sync(db,event,activity,"UPDATE_PROGRESS",{"quantity":event.quantity,"unit":event.unit})
    db.add(AuditLog(event_type="EXECUTION_EVENT_DECISION", user_name=approver, description=f"{event.event_type} event {event.id} approved for {activity.activity_id}", confidence_score=event.confidence_score, confidence_level="High" if event.confidence_score >= .85 else "Medium", details={"before": {}, "after": {"activity_id": activity.id, "status": activity.status}}))


def process_local_sync(db: Session, queue: ScheduleSyncQueue):
    # Internal adapter is intentionally a local acknowledgement: values are already transactionally applied.
    queue.status, queue.synced_at, queue.error_message = "SYNCED", dt.datetime.utcnow(), None
