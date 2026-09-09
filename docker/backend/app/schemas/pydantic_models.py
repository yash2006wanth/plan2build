import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Any

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    role: str = "Site Engineer"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_date: datetime.date
    planned_end_date: datetime.date
    status: str = "ACTIVE"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Activity Dependency Schemas
class ActivityDependencyBase(BaseModel):
    predecessor_id: int
    successor_id: int
    dependency_type: str = "FS"
    lag_days: int = 0

class ActivityDependencyResponse(ActivityDependencyBase):
    id: int
    predecessor_activity_id: Optional[str] = None
    successor_activity_id: Optional[str] = None

    class Config:
        from_attributes = True


# Schedule Activity Schemas
class ScheduleActivityBase(BaseModel):
    activity_id: str
    activity_name: str
    wbs_code: str
    description: Optional[str] = None
    start_date: datetime.date
    end_date: datetime.date
    planned_quantity: float = 100.0
    unit: str = "m2"
    location: Optional[str] = None
    status: str = "NOT_STARTED"
    parent_activity_id: Optional[int] = None

class ScheduleActivityCreate(ScheduleActivityBase):
    project_id: int

class ScheduleActivityResponse(ScheduleActivityBase):
    id: int
    project_id: int
    actual_quantity: Optional[float] = 0.0
    planned_percentage: Optional[float] = 0.0
    actual_percentage: Optional[float] = 0.0
    variance_percentage: Optional[float] = 0.0
    projected_completion: Optional[datetime.date] = None
    expected_delay_days: Optional[int] = 0
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Evidence Photo Schemas
class EvidencePhotoResponse(BaseModel):
    id: int
    site_report_id: int
    file_path: str
    cv_metadata: Optional[Any] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Site Report Schemas
class SiteReportCreate(BaseModel):
    project_id: int
    submitted_by: Optional[int] = None
    report_text: str
    quantity_completed: float
    unit: str = "m2"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    remarks: Optional[str] = None
    labour_count: Optional[int] = 0
    equipment_details: Optional[str] = None
    material_consumption: Optional[str] = None

class SiteReportResponse(BaseModel):
    id: int
    project_id: int
    submitted_by: Optional[int] = None
    submitter_name: Optional[str] = "Site Engineer"
    report_text: str
    quantity_completed: float
    unit: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime.datetime
    remarks: Optional[str] = None
    labour_count: int
    equipment_details: Optional[str] = None
    material_consumption: Optional[str] = None
    photos: List[EvidencePhotoResponse] = []
    matches: List["ActivityMatchResponse"] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Activity Match Schemas
class ActivityMatchResponse(BaseModel):
    id: int
    site_report_id: int
    activity_id: int
    activity_code: Optional[str] = None
    activity_name: Optional[str] = None
    semantic_score: float
    location_score: float
    date_score: float
    keyword_score: float
    wbs_score: float
    final_score: float
    confidence: str
    matching_reason: Optional[str] = None
    approved: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class MatchApprovalRequest(BaseModel):
    approved_activity_id: int


# Progress Record Schemas
class ProgressRecordResponse(BaseModel):
    id: int
    activity_id: int
    activity_name: Optional[str] = None
    date: datetime.date
    planned_quantity: float
    actual_quantity: float
    planned_percentage: float
    actual_percentage: float
    variance_percentage: float
    earned_progress: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Alert Schemas
class AlertResponse(BaseModel):
    id: int
    project_id: int
    activity_id: Optional[int] = None
    activity_name: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    message: str
    recommended_action: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Executive Dashboard Summary Schema
class DashboardSummaryResponse(BaseModel):
    total_projects: int
    overall_planned_progress: float
    overall_actual_progress: float
    variance: float
    delayed_activities_count: int
    at_risk_activities_count: int
    on_track_activities_count: int
    forecasted_completion_date: Optional[datetime.date] = None
    overall_expected_delay_days: int = 0
    recent_alerts: List[AlertResponse] = []
    s_curve_data: List[dict] = []
    wbs_progress_data: List[dict] = []
    status_distribution: List[dict] = []
