import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.schema import ScheduleActivity, ProgressRecord, SiteReport, ActivityMatch

def calculate_planned_percentage(start_date: datetime.date, end_date: datetime.date, current_date: datetime.date) -> float:
    if current_date <= start_date:
        return 0.0
    if current_date >= end_date:
        return 100.0
    
    total_days = (end_date - start_date).days
    if total_days <= 0:
        return 100.0
        
    elapsed_days = (current_date - start_date).days
    return round((elapsed_days / total_days) * 100.0, 2)


def calculate_actual_percentage(actual_quantity: float, planned_quantity: float) -> float:
    if planned_quantity <= 0:
        return 0.0
    val = (actual_quantity / planned_quantity) * 100.0
    return round(min(100.0, max(0.0, val)), 2)


def classify_status(variance: float) -> str:
    if variance >= 0:
        return "ON_TRACK"
    elif variance >= -10.0:
        return "AT_RISK"
    else:
        return "DELAYED"


def update_activity_progress(db: Session, activity_id: int, current_date: datetime.date = None) -> ProgressRecord:
    if current_date is None:
        current_date = datetime.date.today()

    activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == activity_id).first()
    if not activity:
        raise ValueError(f"Activity with ID {activity_id} not found.")

    # Calculate actual quantity completed from approved site reports
    approved_matches = db.query(ActivityMatch).filter(
        ActivityMatch.activity_id == activity_id,
        ActivityMatch.approved == True
    ).all()

    report_ids = [m.site_report_id for m in approved_matches]
    total_actual_qty = 0.0
    if report_ids:
        reports = db.query(SiteReport).filter(SiteReport.id.in_(report_ids)).all()
        total_actual_qty = sum(r.quantity_completed for r in reports)

    planned_pct = calculate_planned_percentage(activity.start_date, activity.end_date, current_date)
    actual_pct = calculate_actual_percentage(total_actual_qty, activity.planned_quantity)
    variance_pct = round(actual_pct - planned_pct, 2)
    new_status = classify_status(variance_pct)

    if actual_pct >= 100.0:
        new_status = "COMPLETED"
    elif actual_pct > 0 and new_status == "NOT_STARTED":
        new_status = "IN_PROGRESS"

    activity.status = new_status
    
    # Simple Earned Value calculation (Earned Progress = Actual % * Weight)
    earned_val = round((actual_pct / 100.0) * activity.planned_quantity, 2)

    progress_rec = ProgressRecord(
        activity_id=activity.id,
        date=current_date,
        planned_quantity=activity.planned_quantity,
        actual_quantity=total_actual_qty,
        planned_percentage=planned_pct,
        actual_percentage=actual_pct,
        variance_percentage=variance_pct,
        earned_progress=earned_val
    )
    db.add(progress_rec)
    db.commit()
    db.refresh(progress_rec)

    return progress_rec


def compute_project_progress_summary(db: Session, project_id: int) -> Dict[str, Any]:
    """
    Computes aggregated S-Curve, EVM metrics, and status breakdown for a project.
    """
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()
    if not activities:
        return {
            "overall_planned_progress": 0.0,
            "overall_actual_progress": 0.0,
            "variance": 0.0,
            "status_counts": {"ON_TRACK": 0, "AT_RISK": 0, "DELAYED": 0, "COMPLETED": 0, "NOT_STARTED": 0},
            "s_curve": [],
            "wbs_breakdown": []
        }

    current_date = datetime.date.today()

    total_weight = sum(a.planned_quantity for a in activities) or 1.0
    weighted_planned = 0.0
    weighted_actual = 0.0

    status_counts = {"ON_TRACK": 0, "AT_RISK": 0, "DELAYED": 0, "COMPLETED": 0, "NOT_STARTED": 0}
    wbs_dict = {}

    for act in activities:
        planned_pct = calculate_planned_percentage(act.start_date, act.end_date, current_date)
        
        # Calculate actual quantity from approved matches
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
        st = classify_status(variance)
        if actual_pct >= 100.0:
            st = "COMPLETED"
        elif actual_pct == 0.0 and planned_pct == 0.0:
            st = "NOT_STARTED"

        status_counts[st] = status_counts.get(st, 0) + 1

        weight = act.planned_quantity / total_weight
        weighted_planned += planned_pct * weight
        weighted_actual += actual_pct * weight

        # WBS grouping
        wbs_prefix = act.wbs_code.split('.')[0] if act.wbs_code else "1"
        if wbs_prefix not in wbs_dict:
            wbs_dict[wbs_prefix] = {"wbs_code": wbs_prefix, "total_planned": 0.0, "total_actual": 0.0, "count": 0}
        wbs_dict[wbs_prefix]["total_planned"] += planned_pct
        wbs_dict[wbs_prefix]["total_actual"] += actual_pct
        wbs_dict[wbs_prefix]["count"] += 1

    overall_planned = round(weighted_planned, 2)
    overall_actual = round(weighted_actual, 2)
    overall_variance = round(overall_actual - overall_planned, 2)

    # Generate S-Curve points across project timeline
    min_start = min(a.start_date for a in activities)
    max_end = max(a.end_date for a in activities)

    s_curve = []
    curr = min_start
    step_days = max(1, (max_end - min_start).days // 15)

    while curr <= max_end + datetime.timedelta(days=7):
        p_acc = 0.0
        a_acc = 0.0
        for act in activities:
            p_val = calculate_planned_percentage(act.start_date, act.end_date, curr)
            
            # Actual progress up to date curr
            if curr <= current_date:
                approved_matches = db.query(ActivityMatch).filter(
                    ActivityMatch.activity_id == act.id,
                    ActivityMatch.approved == True
                ).all()
                report_ids = [m.site_report_id for m in approved_matches]
                curr_actual_qty = 0.0
                if report_ids:
                    reports = db.query(SiteReport).filter(
                        SiteReport.id.in_(report_ids),
                        SiteReport.timestamp <= datetime.datetime.combine(curr, datetime.time.max)
                    ).all()
                    curr_actual_qty = sum(r.quantity_completed for r in reports)
                a_val = calculate_actual_percentage(curr_actual_qty, act.planned_quantity)
            else:
                a_val = None  # Future projection point

            w = act.planned_quantity / total_weight
            p_acc += p_val * w
            if a_val is not None:
                a_acc += a_val * w

        s_curve.append({
            "date": curr.isoformat(),
            "planned": round(p_acc, 2),
            "actual": round(a_acc, 2) if curr <= current_date else None
        })
        curr += datetime.timedelta(days=step_days)

    wbs_breakdown = [
        {
            "wbs_prefix": k,
            "planned_percentage": round(v["total_planned"] / v["count"], 2),
            "actual_percentage": round(v["total_actual"] / v["count"], 2),
        }
        for k, v in wbs_dict.items()
    ]

    return {
        "overall_planned_progress": overall_planned,
        "overall_actual_progress": overall_actual,
        "variance": overall_variance,
        "status_counts": status_counts,
        "s_curve": s_curve,
        "wbs_breakdown": wbs_breakdown
    }
