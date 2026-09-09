from app.services.execution_engine import infer_discipline, normalize_event
from app.models.schema import Base, Project, ScheduleActivity, ActivityEvent, ScheduleSyncQueue
from app.services.execution_engine import approve_event, enqueue_sync, process_local_sync
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime as dt

def test_discipline_inference_and_plaintext_normalization():
    event = normalize_event({"Description": "Piping spool erected", "Event Type": "start", "Date": "2026-09-01", "Quantity": "12", "Unit": "m"}, {})
    assert event["discipline"] == "Piping"
    assert event["event_type"] == "START"
    assert event["quantity"] == 12

def test_unknown_is_unclassified():
    assert infer_discipline("general activity without a trade") == "Unclassified"

def test_ocr_fallback_contract_is_non_fabricating():
    event = normalize_event({"description": "", "remarks": "Manual review required: OCR is not configured."}, {})
    assert "Manual review required" in event["description"]

def test_approved_dates_are_versioned_and_sync_is_idempotent():
    engine = create_engine("sqlite:///:memory:"); Base.metadata.create_all(engine); db = sessionmaker(bind=engine)()
    project = Project(name="Execution", start_date=dt.date(2026, 1, 1), planned_end_date=dt.date(2026, 2, 1)); db.add(project); db.flush()
    activity = ScheduleActivity(project_id=project.id, activity_id="A-1", activity_name="Pipe erection", wbs_code="1", start_date=dt.date(2026,1,1), end_date=dt.date(2026,1,10), discipline="Piping"); db.add(activity); db.flush()
    event = ActivityEvent(project_id=project.id, activity_id=activity.id, event_type="START", event_timestamp=dt.datetime(2026,1,2), confidence_score=.9); db.add(event); db.flush()
    approve_event(db,event,"Planner"); db.flush()
    assert activity.actual_start_at == dt.datetime(2026,1,2)
    assert db.query(ScheduleSyncQueue).count() == 1
    enqueue_sync(db,event,activity,"UPDATE_ACTUAL_START",{"actual_start_at": event.event_timestamp.isoformat()})
    assert db.query(ScheduleSyncQueue).count() == 1
    process_local_sync(db,db.query(ScheduleSyncQueue).first())
    assert db.query(ScheduleSyncQueue).first().status == "SYNCED"
