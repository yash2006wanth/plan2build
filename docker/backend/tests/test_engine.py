import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.schema import Base, Project, ScheduleActivity, SiteReport, ActivityMatch
from app.services.schedule_parser import normalize_column_name, parse_schedule_file
from app.services.progress_engine import calculate_planned_percentage, calculate_actual_percentage, classify_status, update_activity_progress
from app.ai.matcher import compute_keyword_score, compute_location_score, compute_date_score, match_site_report
from app.services.forecast_engine import forecast_activity_completion

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_column_normalization():
    assert normalize_column_name("Activity ID") == "activity_id"
    assert normalize_column_name("Task Name") == "activity_name"
    assert normalize_column_name("WBS Code") == "wbs_code"
    assert normalize_column_name("Finish Date") == "end_date"

def test_progress_calculation():
    start = datetime.date(2026, 8, 1)
    end = datetime.date(2026, 8, 11)  # 10 days
    mid = datetime.date(2026, 8, 6)    # 5 days = 50%
    
    planned = calculate_planned_percentage(start, end, mid)
    assert planned == 50.0

    actual = calculate_actual_percentage(40.0, 100.0)
    assert actual == 40.0

    status_delayed = classify_status(40.0 - 55.0)  # -15%
    assert status_delayed == "DELAYED"

    status_risk = classify_status(48.0 - 50.0)     # -2%
    assert status_risk == "AT_RISK"

    status_ontrack = classify_status(52.0 - 50.0)   # +2%
    assert status_ontrack == "ON_TRACK"

def test_ai_matching_subscores():
    # Keyword score
    kw = compute_keyword_score("Reinforcement steel rebar for pier column", "Column Rebar Assembly", "TMT steel rebar")
    assert kw > 0.2

    # Location score
    loc = compute_location_score("Column rebar at Pier P02", "", None, None, "Piers P01-P06")
    assert loc >= 0.6

    # Date score
    dt_score = compute_date_score(
        datetime.datetime(2026, 8, 10),
        datetime.date(2026, 8, 5),
        datetime.date(2026, 8, 20)
    )
    assert dt_score == 1.0

def test_full_activity_matcher(db_session):
    project = Project(
        name="Test Project",
        start_date=datetime.date(2026, 8, 1),
        planned_end_date=datetime.date(2026, 11, 30)
    )
    db_session.add(project)
    db_session.flush()

    act1 = ScheduleActivity(
        project_id=project.id,
        activity_id="WBS-01.01",
        activity_name="Foundation Excavation",
        wbs_code="1.1",
        description="Earthwork excavation for pier raft foundation",
        start_date=datetime.date(2026, 8, 5),
        end_date=datetime.date(2026, 8, 20),
        planned_quantity=1000.0,
        unit="m3",
        location="Zone A"
    )
    act2 = ScheduleActivity(
        project_id=project.id,
        activity_id="WBS-02.01",
        activity_name="Pier Column Concrete Construction",
        wbs_code="2.1",
        description="Pouring M40 concrete for circular pier columns",
        start_date=datetime.date(2026, 8, 25),
        end_date=datetime.date(2026, 9, 15),
        planned_quantity=400.0,
        unit="m3",
        location="Zone B"
    )
    db_session.add_all([act1, act2])
    db_session.commit()

    report = SiteReport(
        project_id=project.id,
        report_text="Completed 250 m3 foundation pit excavation in Zone A.",
        quantity_completed=250.0,
        unit="m3",
        timestamp=datetime.datetime(2026, 8, 10),
        remarks="Rock breaker used."
    )
    db_session.add(report)
    db_session.commit()

    matches = match_site_report(db_session, report)
    assert len(matches) == 2
    top_match = matches[0]
    assert top_match.activity_id == act1.id
    assert top_match.final_score > 0.70
