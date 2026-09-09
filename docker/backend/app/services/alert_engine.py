import datetime
from typing import List
from sqlalchemy.orm import Session
from app.models.schema import ScheduleActivity, Alert, SiteReport, ActivityMatch
from app.services.progress_engine import calculate_planned_percentage, calculate_actual_percentage, classify_status
from app.services.forecast_engine import forecast_activity_completion

def generate_project_alerts(db: Session, project_id: int) -> List[Alert]:
    """
    Evaluates project activities and generates actionable alerts for delays, risks, and missing updates.
    """
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()
    current_date = datetime.date.today()
    new_alerts = []

    for act in activities:
        planned_pct = calculate_planned_percentage(act.start_date, act.end_date, current_date)

        # Actual quantity
        approved_matches = db.query(ActivityMatch).filter(
            ActivityMatch.activity_id == act.id,
            ActivityMatch.approved == True
        ).all()
        report_ids = [m.site_report_id for m in approved_matches]
        total_actual_qty = 0.0
        latest_report_date = None

        if report_ids:
            reports = db.query(SiteReport).filter(SiteReport.id.in_(report_ids)).all()
            total_actual_qty = sum(r.quantity_completed for r in reports)
            if reports:
                latest_report_date = max(r.timestamp for r in reports).date()

        actual_pct = calculate_actual_percentage(total_actual_qty, act.planned_quantity)
        variance = round(actual_pct - planned_pct, 2)
        forecast = forecast_activity_completion(db, act.id, current_date)

        # 1. Delayed Activity (RED)
        if variance < -10.0 and actual_pct < 100.0:
            existing = db.query(Alert).filter(
                Alert.project_id == project_id,
                Alert.activity_id == act.id,
                Alert.alert_type == "DELAYED",
                Alert.is_read == False
            ).first()
            if not existing:
                alert = Alert(
                    project_id=project_id,
                    activity_id=act.id,
                    alert_type="DELAYED",
                    severity="RED",
                    title=f"Critical Delay: {act.activity_name}",
                    message=f"Activity '{act.activity_name}' ({act.activity_id}) is {abs(variance)}% behind planned schedule. Planned: {planned_pct}%, Actual: {actual_pct}%.",
                    recommended_action="Reallocate site resources or request overtime shift to restore progress."
                )
                db.add(alert)
                new_alerts.append(alert)

        # 2. At-Risk Activity (YELLOW)
        elif -10.0 <= variance < 0.0 and actual_pct < 100.0:
            existing = db.query(Alert).filter(
                Alert.project_id == project_id,
                Alert.activity_id == act.id,
                Alert.alert_type == "AT_RISK",
                Alert.is_read == False
            ).first()
            if not existing:
                alert = Alert(
                    project_id=project_id,
                    activity_id=act.id,
                    alert_type="AT_RISK",
                    severity="YELLOW",
                    title=f"At-Risk: {act.activity_name}",
                    message=f"Activity '{act.activity_name}' is trending {abs(variance)}% behind planned targets.",
                    recommended_action="Inspect material supply chain and equipment availability."
                )
                db.add(alert)
                new_alerts.append(alert)

        # 3. Forecasted Delay (RED/YELLOW)
        if forecast.get("expected_delay_days", 0) > 0 and actual_pct < 100.0:
            existing = db.query(Alert).filter(
                Alert.project_id == project_id,
                Alert.activity_id == act.id,
                Alert.alert_type == "FORECAST_DELAY",
                Alert.is_read == False
            ).first()
            if not existing:
                delay_days = forecast['expected_delay_days']
                sev = "RED" if delay_days > 5 else "YELLOW"
                alert = Alert(
                    project_id=project_id,
                    activity_id=act.id,
                    alert_type="FORECAST_DELAY",
                    severity=sev,
                    title=f"Forecasted Delay ({delay_days} days): {act.activity_name}",
                    message=forecast['explanation'],
                    recommended_action=f"Increase daily target from {forecast['actual_daily_rate']} to {forecast['planned_daily_rate']} {act.unit}/day."
                )
                db.add(alert)
                new_alerts.append(alert)

        # 4. Missing Progress Update (> 3 days) (BLUE)
        if act.start_date <= current_date <= act.end_date and actual_pct < 100.0:
            days_since_update = (current_date - latest_report_date).days if latest_report_date else (current_date - act.start_date).days
            if days_since_update >= 3:
                existing = db.query(Alert).filter(
                    Alert.project_id == project_id,
                    Alert.activity_id == act.id,
                    Alert.alert_type == "MISSING_UPDATE",
                    Alert.is_read == False
                ).first()
                if not existing:
                    alert = Alert(
                        project_id=project_id,
                        activity_id=act.id,
                        alert_type="MISSING_UPDATE",
                        severity="BLUE",
                        title=f"No Field Update Received ({days_since_update} days)",
                        message=f"No site report submitted for active task '{act.activity_name}' ({act.activity_id}) in the last {days_since_update} days.",
                        recommended_action="Contact site engineer responsible for daily field updates."
                    )
                    db.add(alert)
                    new_alerts.append(alert)

    db.commit()
    return new_alerts
