import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.schema import Project, ScheduleActivity, Scenario
from app.services.critical_path_engine import compute_critical_path

def run_scenario_simulation(db: Session, project_id: int, name: str, description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()
    if not activities:
        return {}

    # 1. Baseline analysis
    cp_info = compute_critical_path(db, project_id)
    baseline_critical_ids = set(cp_info.get("critical_path_activities", []))

    baseline_end = max(a.end_date for a in activities) if activities else project.planned_end_date

    # 2. Extract parameters
    workers_change = int(parameters.get("workers_change", 0))          # e.g., +8
    working_hours_change = int(parameters.get("working_hours_change", 0))  # e.g., +2
    material_delay_days = int(parameters.get("material_delay_days", 0)) # e.g., +3
    productivity_mult = float(parameters.get("productivity_multiplier", 1.0)) # e.g., 1.2
    target_activity_id = parameters.get("activity_id")                 # Optional specific activity

    # Productivity acceleration factor
    # Adding workers & hours speeds up critical path activities
    labour_boost = (workers_change * 0.035) + (working_hours_change * 0.07) + (productivity_mult - 1.0)
    speedup_factor = max(0.5, 1.0 / (1.0 + max(-0.5, labour_boost)))

    affected_activities = []
    total_days_saved = 0
    total_days_delayed = material_delay_days

    for act in activities:
        orig_duration = max((act.end_date - act.start_date).days + 1, 1)
        is_target = (target_activity_id is None) or (act.id == target_activity_id or act.activity_id == str(target_activity_id))

        if act.id in baseline_critical_ids and is_target:
            if speedup_factor < 1.0:
                new_duration = max(2, int(round(orig_duration * speedup_factor)))
                saved = orig_duration - new_duration
                total_days_saved += saved
            elif speedup_factor > 1.0:
                new_duration = int(round(orig_duration * speedup_factor))
                total_days_delayed += (new_duration - orig_duration)
            else:
                new_duration = orig_duration
            
            if material_delay_days > 0 and act.wbs_code in ["1.3", "2.1"]:
                new_duration += material_delay_days

            affected_activities.append({
                "activity_id": act.activity_id,
                "activity_name": act.activity_name,
                "is_critical": True,
                "baseline_duration_days": orig_duration,
                "scenario_duration_days": new_duration,
                "duration_delta_days": new_duration - orig_duration
            })

    # Overall schedule impact in days
    net_schedule_impact = total_days_delayed - total_days_saved
    predicted_completion = baseline_end + datetime.timedelta(days=net_schedule_impact)

    # Cost impact estimation (Labor rate ~ ₹900/day per worker)
    labor_cost_per_day = 900.0
    remaining_days = max(30, (baseline_end - datetime.date.today()).days)
    additional_labor_cost = (workers_change * labor_cost_per_day * remaining_days) + (working_hours_change * 150.0 * 20 * remaining_days)
    delay_penalty = max(0, net_schedule_impact) * 25000.0  # ₹25k/day overhead penalty for delays
    net_cost_impact = round(additional_labor_cost + delay_penalty, 2)

    # Store scenario record in DB
    scenario = Scenario(
        project_id=project_id,
        name=name,
        description=description,
        parameters=parameters,
        predicted_completion=predicted_completion,
        schedule_impact_days=net_schedule_impact,
        cost_impact=net_cost_impact,
        affected_activities=affected_activities
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return {
        "scenario_id": scenario.id,
        "name": scenario.name,
        "parameters": parameters,
        "baseline_completion": baseline_end.isoformat(),
        "predicted_completion": predicted_completion.isoformat(),
        "schedule_impact_days": net_schedule_impact,
        "impact_direction": "IMPROVEMENT" if net_schedule_impact < 0 else ("DELAY" if net_schedule_impact > 0 else "NEUTRAL"),
        "days_saved": abs(net_schedule_impact) if net_schedule_impact < 0 else 0,
        "days_delayed": net_schedule_impact if net_schedule_impact > 0 else 0,
        "cost_impact_inr": net_cost_impact,
        "affected_activities": affected_activities,
        "summary": f"Adding {workers_change} workers & +{working_hours_change}h overtime reduces critical path timeline by {abs(net_schedule_impact)} days. Predicted completion pulls in from {baseline_end.strftime('%b %d')} to {predicted_completion.strftime('%b %d')}." if net_schedule_impact < 0 else f"Scenario results in a net schedule delay of {net_schedule_impact} days with predicted completion on {predicted_completion.strftime('%b %d')}."
    }
