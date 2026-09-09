import pandas as pd
import io
import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.schema import ScheduleActivity, ActivityDependency
from app.services.execution_engine import infer_discipline

COLUMN_MAPPINGS = {
    "activity_id": ["activity id", "activity_id", "activityid", "act id", "id", "wbs id"],
    "activity_name": ["activity name", "activity_name", "activityname", "task name", "name", "activity", "task"],
    "wbs_code": ["wbs", "wbs code", "wbs_code", "wbscode", "code"],
    "start_date": ["start date", "start_date", "start", "planned start", "startdate"],
    "end_date": ["end date", "end_date", "finish date", "planned end", "enddate", "finish"],
    "planned_quantity": ["quantity", "planned_quantity", "planned quantity", "qty", "target quantity"],
    "unit": ["unit", "uom", "unit of measure"],
    "location": ["location", "zone", "site location", "area"],
    "predecessor": ["predecessor", "dependency", "dependencies", "predecessors", "predecessor_id"],
    "description": ["description", "remarks", "notes", "scope"]
}

def normalize_column_name(col: str) -> str:
    cleaned = str(col).strip().lower()
    for standard_name, synonyms in COLUMN_MAPPINGS.items():
        if cleaned in synonyms:
            return standard_name
    return cleaned

def parse_schedule_file(file_contents: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses a CSV or XLSX file and returns (valid_rows, invalid_rows).
    """
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_contents))
    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(file_contents))
    else:
        raise ValueError("Unsupported file format. Please upload CSV or XLSX.")

    # Normalize column names
    df.columns = [normalize_column_name(c) for c in df.columns]

    valid_rows = []
    invalid_rows = []

    required_fields = ["activity_id", "activity_name", "start_date", "end_date"]

    for index, row in df.iterrows():
        row_num = index + 2  # 1-indexed header + 1
        row_dict = row.to_dict()
        errors = []

        # Check required fields
        for rf in required_fields:
            if rf not in row_dict or pd.isna(row_dict[rf]) or str(row_dict[rf]).strip() == "":
                errors.append(f"Missing required column/value '{rf}'")

        # Parse dates
        start_date = None
        end_date = None
        if "start_date" in row_dict and not pd.isna(row_dict["start_date"]):
            try:
                start_date = pd.to_datetime(row_dict["start_date"]).date()
            except Exception:
                errors.append(f"Invalid start date: {row_dict['start_date']}")

        if "end_date" in row_dict and not pd.isna(row_dict["end_date"]):
            try:
                end_date = pd.to_datetime(row_dict["end_date"]).date()
            except Exception:
                errors.append(f"Invalid end date: {row_dict['end_date']}")

        if start_date and end_date and start_date > end_date:
            errors.append("Start date cannot be after end date")

        # Parse quantity
        planned_quantity = 100.0
        if "planned_quantity" in row_dict and not pd.isna(row_dict["planned_quantity"]):
            try:
                planned_quantity = float(row_dict["planned_quantity"])
                if planned_quantity <= 0:
                    planned_quantity = 100.0
            except ValueError:
                errors.append(f"Invalid planned quantity: {row_dict['planned_quantity']}")

        parsed_data = {
            "row_number": row_num,
            "activity_id": str(row_dict.get("activity_id", f"ACT-{row_num}")).strip(),
            "activity_name": str(row_dict.get("activity_name", "")).strip(),
            "wbs_code": str(row_dict.get("wbs_code", f"1.{row_num}")).strip(),
            "description": str(row_dict.get("description", "")).strip() if not pd.isna(row_dict.get("description")) else "",
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "planned_quantity": planned_quantity,
            "unit": str(row_dict.get("unit", "m2")).strip() if not pd.isna(row_dict.get("unit")) else "m2",
            "location": str(row_dict.get("location", "Main Site")).strip() if not pd.isna(row_dict.get("location")) else "Main Site",
            "discipline": infer_discipline(f"{row_dict.get('activity_name', '')} {row_dict.get('description', '')}", str(row_dict.get("discipline", "Unclassified")).strip()),
            "predecessor": str(row_dict.get("predecessor", "")).strip() if not pd.isna(row_dict.get("predecessor")) else "",
            "errors": errors
        }

        if errors:
            invalid_rows.append(parsed_data)
        else:
            valid_rows.append(parsed_data)

    return valid_rows, invalid_rows


def import_schedule_to_db(db: Session, project_id: int, valid_activities: List[Dict[str, Any]]) -> int:
    """
    Inserts valid activities into database and creates dependency relationships.
    """
    activity_map = {}
    predecessor_pairs = []

    for act in valid_activities:
        start_d = datetime.date.fromisoformat(act["start_date"])
        end_d = datetime.date.fromisoformat(act["end_date"])

        db_activity = ScheduleActivity(
            project_id=project_id,
            activity_id=act["activity_id"],
            activity_name=act["activity_name"],
            wbs_code=act["wbs_code"],
            description=act.get("description", ""),
            start_date=start_d,
            end_date=end_d,
            planned_quantity=act["planned_quantity"],
            unit=act.get("unit", "m2"),
            location=act.get("location", "Main Site"),
            discipline=act.get("discipline", "Unclassified"),
            status="NOT_STARTED"
        )
        db.add(db_activity)
        db.flush()
        activity_map[act["activity_id"]] = db_activity.id

        if act.get("predecessor"):
            predecessor_pairs.append((db_activity.id, act["predecessor"]))

    # Link dependencies
    for succ_id, pred_code in predecessor_pairs:
        if pred_code in activity_map:
            pred_id = activity_map[pred_code]
            dep = ActivityDependency(
                predecessor_id=pred_id,
                successor_id=succ_id,
                dependency_type="FS",
                lag_days=0
            )
            db.add(dep)

    db.commit()
    return len(valid_activities)
