import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.schema import ScheduleActivity, ActivityMatch, SiteReport

def forecast_activity_completion(db: Session, activity_id: int, current_date: datetime.date = None) -> Dict[str, Any]:
    if current_date is None:
        current_date = datetime.date.today()

    activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == activity_id).first()
    if not activity:
        return {}

    total_days = max(1, (activity.end_date - activity.start_date).days)
    planned_daily_rate = round(activity.planned_quantity / total_days, 2)

    # Get actual quantity from approved matches
    approved_matches = db.query(ActivityMatch).filter(
        ActivityMatch.activity_id == activity_id,
        ActivityMatch.approved == True
    ).all()

    report_ids = [m.site_report_id for m in approved_matches]
    total_actual_qty = 0.0
    earliest_report_date = None

    if report_ids:
        reports = db.query(SiteReport).filter(SiteReport.id.in_(report_ids)).all()
        total_actual_qty = sum(r.quantity_completed for r in reports)
        if reports:
            earliest_report_date = min(r.timestamp for r in reports).date()

    remaining_qty = max(0.0, activity.planned_quantity - total_actual_qty)

    # Calculate elapsed days since work started or schedule start
    start_ref = earliest_report_date or activity.start_date
    elapsed_days = max(1, (current_date - start_ref).days)

    if total_actual_qty > 0:
        actual_daily_rate = round(total_actual_qty / elapsed_days, 2)
    else:
        # Fallback to planned rate if work hasn't reported yet
        actual_daily_rate = planned_daily_rate

    # Protect against division by zero
    effective_rate = max(0.01, actual_daily_rate)
    remaining_days_needed = int(remaining_qty / effective_rate)

    projected_finish = current_date + datetime.timedelta(days=remaining_days_needed)
    expected_delay_days = max(0, (projected_finish - activity.end_date).days)

    trending_late = (expected_delay_days > 0) or (actual_daily_rate < planned_daily_rate * 0.8)

    explanation = (
        f"Required productivity: {planned_daily_rate} {activity.unit}/day. "
        f"Actual productivity: {actual_daily_rate} {activity.unit}/day. "
    )
    if expected_delay_days > 0:
        explanation += f"At current pace, completion is projected for {projected_finish.strftime('%b %d, %Y')} ({expected_delay_days} days past planned target of {activity.end_date.strftime('%b %d, %Y')})."
    else:
        explanation += f"Work is progressing on schedule for target completion on {activity.end_date.strftime('%b %d, %Y')}."

    return {
        "activity_id": activity.id,
        "activity_code": activity.activity_id,
        "activity_name": activity.activity_name,
        "planned_quantity": activity.planned_quantity,
        "actual_quantity": total_actual_qty,
        "unit": activity.unit,
        "planned_daily_rate": planned_daily_rate,
        "actual_daily_rate": actual_daily_rate,
        "projected_completion_date": projected_finish,
        "planned_end_date": activity.end_date,
        "expected_delay_days": expected_delay_days,
        "trending_late": trending_late,
        "explanation": explanation
    }
