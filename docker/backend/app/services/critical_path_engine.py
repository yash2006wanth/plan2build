import datetime
from typing import Dict, Any, List, Set
from sqlalchemy.orm import Session
from app.models.schema import ScheduleActivity, ActivityDependency, Project

def compute_critical_path(db: Session, project_id: int) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()
    if not activities:
        return {"critical_path": [], "graph": {"nodes": [], "edges": []}}

    act_dict = {a.id: a for a in activities}

    # Fetch all dependencies
    dependencies = db.query(ActivityDependency).join(
        ScheduleActivity, ActivityDependency.predecessor_id == ScheduleActivity.id
    ).filter(ScheduleActivity.project_id == project_id).all()

    # Build adjacency lists
    preds_map: Dict[int, List[ActivityDependency]] = {a.id: [] for a in activities}
    succs_map: Dict[int, List[ActivityDependency]] = {a.id: [] for a in activities}

    for dep in dependencies:
        if dep.successor_id in preds_map:
            preds_map[dep.successor_id].append(dep)
        if dep.predecessor_id in succs_map:
            succs_map[dep.predecessor_id].append(dep)

    # 1. Forward Pass (ES & EF)
    # Calculate duration in days for each activity
    durations = {}
    for a in activities:
        dur = max((a.end_date - a.start_date).days + 1, 1)
        durations[a.id] = dur

    es = {}
    ef = {}

    # Simple topological sorting by start date
    sorted_activities = sorted(activities, key=lambda x: x.start_date)

    proj_start_day = min(a.start_date for a in activities)

    for a in sorted_activities:
        if not preds_map[a.id]:
            es[a.id] = 0  # 0 relative to project start
        else:
            max_pred_ef = 0
            for dep in preds_map[a.id]:
                p_ef = ef.get(dep.predecessor_id, 0)
                max_pred_ef = max(max_pred_ef, p_ef + dep.lag_days)
            es[a.id] = max_pred_ef
        
        ef[a.id] = es[a.id] + durations[a.id]

    # 2. Backward Pass (LS & LF)
    max_project_duration = max(ef.values()) if ef else 0

    ls = {}
    lf = {}

    for a in reversed(sorted_activities):
        if not succs_map[a.id]:
            lf[a.id] = max_project_duration
        else:
            min_succ_ls = max_project_duration
            for dep in succs_map[a.id]:
                s_ls = ls.get(dep.successor_id, max_project_duration)
                min_succ_ls = min(min_succ_ls, s_ls - dep.lag_days)
            lf[a.id] = min_succ_ls

        ls[a.id] = lf[a.id] - durations[a.id]

    # 3. Total Float (Slack) & Critical Path
    total_float = {}
    critical_activities = []
    near_critical_activities = []

    nodes_data = []
    for a in activities:
        float_days = ls[a.id] - es[a.id]
        total_float[a.id] = float_days
        is_critical = float_days <= 1  # 0 or 1 day tolerance
        is_near_critical = 1 < float_days <= 4

        if is_critical:
            critical_activities.append(a.id)
        elif is_near_critical:
            near_critical_activities.append(a.id)

        act_es_date = proj_start_day + datetime.timedelta(days=es[a.id])
        act_ef_date = proj_start_day + datetime.timedelta(days=ef[a.id])

        nodes_data.append({
            "id": a.id,
            "activity_id": a.activity_id,
            "activity_name": a.activity_name,
            "wbs_code": a.wbs_code,
            "status": a.status,
            "duration_days": durations[a.id],
            "early_start": act_es_date.isoformat(),
            "early_finish": act_ef_date.isoformat(),
            "total_float": float_days,
            "is_critical": is_critical,
            "is_near_critical": is_near_critical,
            "planned_quantity": a.planned_quantity,
            "unit": a.unit
        })

    edges_data = []
    for dep in dependencies:
        edges_data.append({
            "id": dep.id,
            "source": dep.predecessor_id,
            "target": dep.successor_id,
            "type": dep.dependency_type,
            "lag_days": dep.lag_days,
            "is_critical_link": (dep.predecessor_id in critical_activities) and (dep.successor_id in critical_activities)
        })

    critical_chain = [act_dict[aid].activity_name for aid in critical_activities if aid in act_dict]

    return {
        "project_id": project_id,
        "project_duration_days": max_project_duration,
        "critical_activities_count": len(critical_activities),
        "near_critical_activities_count": len(near_critical_activities),
        "critical_path_activities": critical_activities,
        "critical_chain_names": critical_chain,
        "nodes": nodes_data,
        "edges": edges_data
    }


def calculate_downstream_impact(db: Session, activity_id: int, delay_days: int) -> Dict[str, Any]:
    act = db.query(ScheduleActivity).filter(ScheduleActivity.id == activity_id).first()
    if not act:
        return {}

    cp_info = compute_critical_path(db, act.project_id)
    nodes = {n["id"]: n for n in cp_info.get("nodes", [])}
    target_node = nodes.get(activity_id)

    if not target_node:
        return {}

    is_critical = target_node["is_critical"]
    total_float = target_node["total_float"]

    # Calculate net project delay
    # If delay_days exceeds total_float, excess delay directly pushes project end date!
    project_delay_impact = max(0, delay_days - total_float)
    threatens_completion = is_critical or (delay_days > total_float)

    # Find downstream successors
    dependencies = db.query(ActivityDependency).filter(ActivityDependency.predecessor_id == activity_id).all()
    affected_successors = []

    for dep in dependencies:
        succ = db.query(ScheduleActivity).filter(ScheduleActivity.id == dep.successor_id).first()
        if succ:
            succ_node = nodes.get(succ.id, {})
            succ_float = succ_node.get("total_float", 0)
            affected_successors.append({
                "id": succ.id,
                "activity_id": succ.activity_id,
                "activity_name": succ.activity_name,
                "total_float": succ_float,
                "predicted_delay_days": delay_days,
                "is_critical": succ_node.get("is_critical", False)
            })

    return {
        "activity_id": activity_id,
        "activity_name": act.activity_name,
        "delay_days": delay_days,
        "total_float": total_float,
        "is_critical": is_critical,
        "threatens_completion": threatens_completion,
        "project_delay_impact_days": project_delay_impact,
        "affected_successors_count": len(affected_successors),
        "affected_successors": affected_successors,
        "assessment": f"Activity is delayed by {delay_days} days AND threatens project completion by {project_delay_impact} days." if threatens_completion else f"Activity is delayed by {delay_days} days, but float of {total_float} days absorbs the impact without delaying final project completion."
    }
