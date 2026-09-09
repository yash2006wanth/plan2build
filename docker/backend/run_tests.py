import sys
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.schema import Base, Project, ScheduleActivity, SiteReport
from app.services.schedule_parser import normalize_column_name, parse_schedule_file
from app.services.progress_engine import calculate_planned_percentage, calculate_actual_percentage, classify_status, compute_project_progress_summary
from app.ai.matcher import compute_keyword_score, compute_location_score, compute_date_score, match_site_report
from app.services.forecast_engine import forecast_activity_completion

def run_all_tests():
    print("=== Running SIH26122 Backend Validation Tests ===")

    # Test 1: Column Normalization
    print("[1/5] Testing Schedule Column Normalization...")
    assert normalize_column_name("Activity ID") == "activity_id"
    assert normalize_column_name("Task Name") == "activity_name"
    assert normalize_column_name("WBS Code") == "wbs_code"
    assert normalize_column_name("Finish Date") == "end_date"
    print("  [PASS] Column normalization passed!")

    # Test 2: Progress Engine Calculations
    print("[2/5] Testing Planned & Actual Progress Engine...")
    start = datetime.date(2026, 8, 1)
    end = datetime.date(2026, 8, 11)
    mid = datetime.date(2026, 8, 6)
    
    planned = calculate_planned_percentage(start, end, mid)
    assert planned == 50.0, f"Expected 50.0, got {planned}"

    actual = calculate_actual_percentage(40.0, 100.0)
    assert actual == 40.0, f"Expected 40.0, got {actual}"

    assert classify_status(-15.0) == "DELAYED"
    assert classify_status(-5.0) == "AT_RISK"
    assert classify_status(5.0) == "ON_TRACK"
    print("  [PASS] Progress calculations passed!")

    # Test 3: AI Matching Subscores
    print("[3/5] Testing AI Matcher Subscores...")
    kw = compute_keyword_score("Reinforcement steel rebar for pier column", "Column Rebar Assembly", "TMT steel rebar")
    assert kw > 0.15, f"Expected > 0.15 keyword score, got {kw}"

    loc = compute_location_score("Column rebar at Pier P02", "", None, None, "Piers P01-P06")
    assert loc >= 0.6, f"Expected location score >= 0.6, got {loc}"

    dt_score = compute_date_score(
        datetime.datetime(2026, 8, 10),
        datetime.date(2026, 8, 5),
        datetime.date(2026, 8, 20)
    )
    assert dt_score == 1.0, f"Expected date score 1.0, got {dt_score}"
    print("  [PASS] AI matching subscores passed!")

    # Test 4: Database & Multi-Signal AI Matcher End-to-End
    print("[4/5] Testing Full Multi-Signal AI Activity Matcher...")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    project = Project(
        name="Test Infrastructure Project",
        start_date=datetime.date(2026, 8, 1),
        planned_end_date=datetime.date(2026, 11, 30)
    )
    session.add(project)
    session.flush()

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
    session.add_all([act1, act2])
    session.commit()

    report = SiteReport(
        project_id=project.id,
        report_text="Completed 250 m3 foundation pit excavation in Zone A.",
        quantity_completed=250.0,
        unit="m3",
        timestamp=datetime.datetime(2026, 8, 10),
        remarks="Rock breaker used."
    )
    session.add(report)
    session.commit()

    matches = match_site_report(session, report)
    assert len(matches) == 2, f"Expected 2 matches, got {len(matches)}"
    top_match = matches[0]
    assert top_match.activity_id == act1.id, f"Expected act1 matched, got act_id {top_match.activity_id}"
    assert top_match.final_score > matches[1].final_score, f"Expected top match score higher than second, got {top_match.final_score} vs {matches[1].final_score}"
    assert top_match.final_score > 0.50, f"Expected final score > 0.50, got {top_match.final_score}"
    print("  [PASS] Full AI Activity Matcher passed!")

    # Test 5: Forecast Engine
    print("[5/5] Testing Productivity-Based Delay Forecaster...")
    fc = forecast_activity_completion(session, act1.id, datetime.date(2026, 8, 10))
    assert "projected_completion_date" in fc
    assert "explanation" in fc
    print("  [PASS] Delay forecaster passed!")

    # Test 6: EVM Engine
    print("[6/10] Testing EVM Cost & Earned Value Engine...")
    from app.services.evm_engine import compute_project_evm
    evm = compute_project_evm(session, project.id)
    assert "cpi" in evm
    assert "spi" in evm
    assert "bac" in evm
    assert "eac" in evm
    print("  [PASS] EVM Cost Engine passed!")

    # Test 7: Critical Path Engine & Downstream Impact
    print("[7/10] Testing Critical Path Network Analysis...")
    from app.services.critical_path_engine import compute_critical_path, calculate_downstream_impact
    from app.models.schema import ActivityDependency
    dep = ActivityDependency(predecessor_id=act1.id, successor_id=act2.id)
    session.add(dep)
    session.commit()

    cp = compute_critical_path(session, project.id)
    assert cp["critical_activities_count"] >= 1
    assert "nodes" in cp

    impact = calculate_downstream_impact(session, act1.id, 5)
    assert impact["threatens_completion"] is True
    print("  [PASS] Critical Path & Downstream Impact passed!")

    # Test 8: Scenario Simulation Engine
    print("[8/10] Testing What-If Scenario Simulator...")
    from app.services.scenario_engine import run_scenario_simulation
    sc_res = run_scenario_simulation(
        session, project.id, "Add Manpower", "Add 8 workers", {"workers_change": 8, "working_hours_change": 2}
    )
    assert "schedule_impact_days" in sc_res
    assert sc_res["impact_direction"] in ["IMPROVEMENT", "NEUTRAL", "DELAY"]
    print("  [PASS] Scenario Simulator passed!")

    # Test 9: Resource Intelligence
    print("[9/10] Testing Labour & Equipment Resource Engine...")
    from app.services.resource_engine import compute_labour_productivity, compute_equipment_utilization
    lab = compute_labour_productivity(session, project.id)
    eq = compute_equipment_utilization(session, project.id)
    assert "avg_actual_productivity" in lab
    assert "overall_utilization_pct" in eq
    print("  [PASS] Resource Intelligence passed!")

    # Test 10: Copilot & Voice Engine
    print("[10/10] Testing Project Copilot & Voice Processing...")
    from app.services.copilot_engine import query_project_copilot
    from app.services.voice_engine import process_voice_input
    copilot_res = query_project_copilot(session, project.id, "Which activities are delayed?", "en")
    assert "answer" in copilot_res
    assert "evidence" in copilot_res

    voice_res = process_voice_input(session, project.id, "Today we completed 120 square meters of foundation reinforcement in Block B", "WORKER", "en")
    assert voice_res["requires_confirmation"] is True
    assert voice_res["extracted_entities"]["quantity"] == 120.0
    print("  [PASS] Copilot & Voice Processing passed!")

    session.close()
    print("\nALL 10 BACKEND TEST SUITES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_all_tests()

