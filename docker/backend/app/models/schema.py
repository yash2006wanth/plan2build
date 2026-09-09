import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Boolean, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(50), nullable=False, default="Site Engineer")  # Project Manager, Site Engineer, Admin
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    site_reports = relationship("SiteReport", back_populates="submitter")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    start_date = Column(Date, nullable=False)
    planned_end_date = Column(Date, nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, COMPLETED, ON_HOLD
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    activities = relationship("ScheduleActivity", back_populates="project", cascade="all, delete-orphan")
    site_reports = relationship("SiteReport", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")


class ScheduleActivity(Base):
    __tablename__ = "schedule_activities"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(String(50), nullable=False, index=True)  # e.g. WBS-01.01
    activity_name = Column(String(200), nullable=False)
    wbs_code = Column(String(50), nullable=False, index=True)      # e.g. 1.1.2
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    planned_quantity = Column(Float, nullable=False, default=100.0)
    unit = Column(String(50), nullable=False, default="m2")
    location = Column(String(200), nullable=True)
    status = Column(String(50), nullable=False, default="NOT_STARTED")
    discipline = Column(String(100), default="Unclassified", nullable=False)  # Civil, Piping, Static Equipment, Rotating Equipment, Electrical, Instrumentation, HSE, Unclassified
    actual_start_at = Column(DateTime, nullable=True)
    actual_end_at = Column(DateTime, nullable=True)
    actual_start_provenance = Column(String(100), nullable=True)  # e.g., AUTO_CONFIRMED, PLANNER_APPROVED, VOICE_REPORT
    actual_end_provenance = Column(String(100), nullable=True)
    actual_start_confidence = Column(Float, nullable=True)
    actual_end_confidence = Column(Float, nullable=True)
    last_updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    parent_activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="activities")
    parent = relationship("ScheduleActivity", remote_side=[id], backref="children")
    
    matches = relationship("ActivityMatch", back_populates="activity")
    progress_records = relationship("ProgressRecord", back_populates="activity", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="activity", cascade="all, delete-orphan")

    predecessors = relationship(
        "ActivityDependency",
        foreign_keys="ActivityDependency.successor_id",
        back_populates="successor"
    )
    successors = relationship(
        "ActivityDependency",
        foreign_keys="ActivityDependency.predecessor_id",
        back_populates="predecessor"
    )


class ActivityDependency(Base):
    __tablename__ = "activity_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    predecessor_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=False)
    successor_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=False)
    dependency_type = Column(String(10), default="FS")  # FS (Finish-to-Start), SS, FF, SF
    lag_days = Column(Integer, default=0)

    predecessor = relationship("ScheduleActivity", foreign_keys=[predecessor_id], back_populates="successors")
    successor = relationship("ScheduleActivity", foreign_keys=[successor_id], back_populates="predecessors")


class SiteReport(Base):
    __tablename__ = "site_reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    report_text = Column(Text, nullable=False)
    quantity_completed = Column(Float, nullable=False, default=0.0)
    unit = Column(String(50), nullable=False, default="m2")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_type = Column(String(50), default="PROGRESS", nullable=False)  # START, FINISH, PROGRESS, HOLD, RESUME
    discipline = Column(String(100), default="Unclassified", nullable=False)  # Civil, Piping, Static Equipment, Rotating Equipment, Electrical, Instrumentation, HSE, Unclassified
    source_type = Column(String(50), default="DIRECT_TEXT", nullable=False)  # DIRECT_TEXT, VOICE, CSV_IMPORT, EXCEL_IMPORT, PLAINTEXT_REPORT, SCANNED_DIARY
    source_doc_name = Column(String(255), nullable=True)
    source_ref = Column(String(255), nullable=True)  # e.g., Page 1, Row 5
    raw_text = Column(Text, nullable=True)
    extraction_metadata = Column(JSON, nullable=True)
    remarks = Column(Text, nullable=True)
    labour_count = Column(Integer, default=0)
    equipment_details = Column(String(255), nullable=True)
    material_consumption = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="site_reports")
    submitter = relationship("User", back_populates="site_reports")
    photos = relationship("EvidencePhoto", back_populates="site_report", cascade="all, delete-orphan")
    matches = relationship("ActivityMatch", back_populates="site_report", cascade="all, delete-orphan")


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    site_report_id = Column(Integer, ForeignKey("site_reports.id"), nullable=True)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    event_type = Column(String(50), default="PROGRESS", nullable=False)  # START, FINISH, PROGRESS, HOLD, RESUME
    discipline = Column(String(100), default="Unclassified", nullable=False)
    event_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="m2")
    confidence_score = Column(Float, default=0.0)
    approval_status = Column(String(50), default="PENDING_REVIEW")  # AUTO_APPROVED, PENDING_REVIEW, APPROVED, REJECTED, UNMATCHED, NEW_UNPLANNED
    mapping_type = Column(String(50), default="DIRECT")  # DIRECT, CHILD_ROLLUP, PLANNER_OVERRIDE, UNMATCHED
    supervisor = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    source_doc_metadata = Column(JSON, nullable=True)
    source_timestamp = Column(DateTime, nullable=True)
    raw_input = Column(Text, nullable=True)
    source_user = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)
    wbs_or_activity_ref = Column(String(100), nullable=True)
    delay_cause = Column(String(255), nullable=True)
    is_inferred = Column(Boolean, default=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project")
    site_report = relationship("SiteReport")
    activity = relationship("ScheduleActivity")


class TerminologyAlias(Base):
    __tablename__ = "terminology_aliases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    site_term = Column(String(150), nullable=False, index=True)
    planned_term = Column(String(150), nullable=False)
    discipline = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ScheduleSyncQueue(Base):
    __tablename__ = "schedule_sync_queue"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("activity_events.id"), nullable=True)
    sync_action = Column(String(100), nullable=False)  # UPDATE_ACTUAL_START, UPDATE_ACTUAL_FINISH, UPDATE_PROGRESS, UPDATE_STATUS
    status = Column(String(50), default="QUEUED")  # QUEUED, SYNCED, FAILED, RETRYING, MANUAL_ACTION_REQUIRED
    adapter_type = Column(String(50), default="LOCAL_INTERNAL")  # LOCAL_INTERNAL, PRIMAVERA_P6, MS_PROJECT
    payload = Column(JSON, nullable=True)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    synced_at = Column(DateTime, nullable=True)
    idempotency_key = Column(String(255), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project")
    activity = relationship("ScheduleActivity")


class ExecutionHistory(Base):
    __tablename__ = "execution_histories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    wbs_code = Column(String(50), nullable=True)
    discipline = Column(String(100), default="Unclassified")
    activity_type = Column(String(150), nullable=True)
    location = Column(String(200), nullable=True)
    supervisor = Column(String(100), nullable=True)
    planned_duration_days = Column(Float, default=0.0)
    actual_duration_days = Column(Float, nullable=True)
    productivity_rate = Column(Float, nullable=True)
    delay_cause = Column(String(255), nullable=True)
    match_quality = Column(Float, nullable=True)
    is_confirmed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project")
    activity = relationship("ScheduleActivity")


class EvidencePhoto(Base):
    __tablename__ = "evidence_photos"

    id = Column(Integer, primary_key=True, index=True)
    site_report_id = Column(Integer, ForeignKey("site_reports.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    cv_metadata = Column(JSON, nullable=True)  # OpenCV/CV analysis findings
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    site_report = relationship("SiteReport", back_populates="photos")


class ActivityMatch(Base):
    __tablename__ = "activity_matches"

    id = Column(Integer, primary_key=True, index=True)
    site_report_id = Column(Integer, ForeignKey("site_reports.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=False)
    semantic_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    date_score = Column(Float, default=0.0)
    keyword_score = Column(Float, default=0.0)
    wbs_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    confidence = Column(String(50), default="Low Confidence")  # Auto-Approved, Needs Confirmation, Low Confidence
    matching_reason = Column(Text, nullable=True)
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    site_report = relationship("SiteReport", back_populates="matches")
    activity = relationship("ScheduleActivity", back_populates="matches")


class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=False)
    date = Column(Date, nullable=False, default=datetime.date.today)
    planned_quantity = Column(Float, nullable=False, default=0.0)
    actual_quantity = Column(Float, nullable=False, default=0.0)
    planned_percentage = Column(Float, nullable=False, default=0.0)
    actual_percentage = Column(Float, nullable=False, default=0.0)
    variance_percentage = Column(Float, nullable=False, default=0.0)
    earned_progress = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    activity = relationship("ScheduleActivity", back_populates="progress_records")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    alert_type = Column(String(50), nullable=False)  # DELAYED, AT_RISK, FORECAST_DELAY, MISSING_UPDATE, LOW_PRODUCTIVITY
    severity = Column(String(20), nullable=False, default="RED")  # RED, YELLOW, BLUE
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="alerts")
    activity = relationship("ScheduleActivity", back_populates="alerts")


class BOQItem(Base):
    __tablename__ = "boq_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    item_code = Column(String(50), nullable=False, index=True)  # e.g., BOQ-1.1
    description = Column(Text, nullable=False)
    unit = Column(String(50), nullable=False, default="m2")
    planned_quantity = Column(Float, nullable=False, default=0.0)
    actual_quantity = Column(Float, nullable=False, default=0.0)
    unit_rate = Column(Float, nullable=False, default=0.0)
    budgeted_cost = Column(Float, nullable=False, default=0.0)
    actual_cost = Column(Float, nullable=False, default=0.0)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="boq_items")
    activity = relationship("ScheduleActivity", backref="boq_items")


class CostRecord(Base):
    __tablename__ = "cost_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    date = Column(Date, nullable=False, default=datetime.date.today)
    planned_cost = Column(Float, nullable=False, default=0.0)
    actual_cost = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="cost_records")
    activity = relationship("ScheduleActivity", backref="cost_records")


class LabourRecord(Base):
    __tablename__ = "labour_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    date = Column(Date, nullable=False, default=datetime.date.today)
    trade = Column(String(100), default="General Worker")  # Rebar Mason, Excavator Operator, Concrete Crew, etc.
    workers_count = Column(Integer, nullable=False, default=0)
    hours_worked = Column(Float, nullable=False, default=0.0)
    quantity_completed = Column(Float, nullable=False, default=0.0)
    unit = Column(String(50), default="m2")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="labour_records")
    activity = relationship("ScheduleActivity", backref="labour_records")


class EquipmentRecord(Base):
    __tablename__ = "equipment_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    equipment_name = Column(String(100), nullable=False)  # Excavator #02, Tower Crane #01, Concrete Batch Mixer
    category = Column(String(50), default="Heavy Machinery")
    available_hours = Column(Float, nullable=False, default=8.0)
    operating_hours = Column(Float, nullable=False, default=0.0)
    idle_hours = Column(Float, nullable=False, default=0.0)
    date = Column(Date, nullable=False, default=datetime.date.today)
    status = Column(String(50), default="OPERATIONAL")  # OPERATIONAL, MAINTENANCE, IDLE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="equipment_records")
    activity = relationship("ScheduleActivity", backref="equipment_records")


class MaterialRecord(Base):
    __tablename__ = "material_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    material_name = Column(String(100), nullable=False)  # TMT Steel Bars, Ready-Mix Concrete M35, Cement Bag
    unit = Column(String(50), nullable=False, default="m3")
    planned_quantity = Column(Float, nullable=False, default=0.0)
    consumed_quantity = Column(Float, nullable=False, default=0.0)
    unit_cost = Column(Float, default=0.0)
    date = Column(Date, nullable=False, default=datetime.date.today)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="material_records")
    activity = relationship("ScheduleActivity", backref="material_records")


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=False)  # { workers_change: +8, working_hours_change: +2, material_delay_days: 0, productivity_multiplier: 1.2 }
    predicted_completion = Column(Date, nullable=True)
    schedule_impact_days = Column(Integer, default=0)
    cost_impact = Column(Float, default=0.0)
    affected_activities = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="scenarios")


class VoiceInteraction(Base):
    __tablename__ = "voice_interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    mode = Column(String(50), nullable=False, default="WORKER")  # WORKER, PROJECT_MANAGER
    language = Column(String(20), nullable=False, default="en")  # en, te, hi
    transcript = Column(Text, nullable=False)
    intent = Column(String(100), nullable=True)
    entities = Column(JSON, nullable=True)
    action_taken = Column(String(200), nullable=True)
    confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)  # ACTIVITY_MATCH, PROGRESS_UPDATE, VOICE_ACTION, SCENARIO_RUN
    user_name = Column(String(100), default="System")
    description = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    confidence_level = Column(String(20), default="High")  # High, Medium, Low
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ActualDateVersion(Base):
    """Immutable approved actual-date history; never overwrite prior evidence."""
    __tablename__ = "actual_date_versions"
    id = Column(Integer, primary_key=True)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("activity_events.id"), nullable=True)
    field_name = Column(String(50), nullable=False)
    previous_value = Column(DateTime, nullable=True)
    approved_value = Column(DateTime, nullable=False)
    approved_by = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    category = Column(String(50), nullable=False, default="Schedule")  # Schedule, Cost, Progress, Material, Labour, Equipment, AI, System
    severity = Column(String(20), nullable=False, default="YELLOW")  # RED, YELLOW, GREEN, BLUE
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="notifications")


class ProjectRisk(Base):
    __tablename__ = "project_risks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("schedule_activities.id"), nullable=True)
    risk_title = Column(String(200), nullable=False)
    severity = Column(String(20), nullable=False, default="YELLOW")  # RED, YELLOW, GREEN
    category = Column(String(50), default="Schedule Risk")  # Schedule Risk, Productivity Risk, Material Risk, Predecessor Delay
    impact_days = Column(Integer, default=0)
    mitigation_strategy = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", backref="project_risks")
    activity = relationship("ScheduleActivity", backref="project_risks")
