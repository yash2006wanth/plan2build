import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.migrations import run_additive_migrations
from app.services.seed_service import seed_demo_data

from app.api.endpoints.projects import router as projects_router
from app.api.endpoints.schedules import router as schedules_router
from app.api.endpoints.site_reports import router as site_reports_router
from app.api.endpoints.progress import router as progress_router
from app.api.endpoints.alerts import router as alerts_router
from app.api.endpoints.demo import router as demo_router

from app.api.endpoints.cost import router as cost_router
from app.api.endpoints.critical_path import router as critical_path_router
from app.api.endpoints.scenarios import router as scenarios_router
from app.api.endpoints.copilot import router as copilot_router
from app.api.endpoints.voice import router as voice_router
from app.api.endpoints.resources import router as resources_router
from app.api.endpoints.dpr import router as dpr_router
from app.api.endpoints.audit import router as audit_router
from app.api.endpoints.sync import router as sync_router
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.execution import router as execution_router

# Create database tables
Base.metadata.create_all(bind=engine)
run_additive_migrations(engine)

app = FastAPI(
    title="PLAN2BUILD — Enterprise Infrastructure Controls & Execution Intelligence Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="SIH26122 Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for evidence photos
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(projects_router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"])
app.include_router(schedules_router, prefix=f"{settings.API_V1_STR}/schedules", tags=["Schedules"])
app.include_router(site_reports_router, prefix=f"{settings.API_V1_STR}/site-reports", tags=["Site Reports"])
app.include_router(progress_router, prefix=settings.API_V1_STR, tags=["Progress & S-Curves"])
app.include_router(alerts_router, prefix=settings.API_V1_STR, tags=["Alerts"])
app.include_router(demo_router, prefix=f"{settings.API_V1_STR}/demo", tags=["Demo Simulation"])

app.include_router(cost_router, prefix=settings.API_V1_STR, tags=["Cost & EVM"])
app.include_router(critical_path_router, prefix=settings.API_V1_STR, tags=["Critical Path & Dependencies"])
app.include_router(scenarios_router, prefix=settings.API_V1_STR, tags=["What-If Scenarios"])
app.include_router(copilot_router, prefix=settings.API_V1_STR, tags=["AI Project Copilot"])
app.include_router(voice_router, prefix=settings.API_V1_STR, tags=["Voice Assistant"])
app.include_router(resources_router, prefix=settings.API_V1_STR, tags=["Resources & Intelligence"])
app.include_router(dpr_router, prefix=settings.API_V1_STR, tags=["Daily Progress Reports"])
app.include_router(audit_router, prefix=settings.API_V1_STR, tags=["Audit Logs"])
app.include_router(sync_router, prefix=settings.API_V1_STR, tags=["Offline Sync"])
app.include_router(auth_router, prefix=settings.API_V1_STR, tags=["Authentication"])
app.include_router(execution_router, prefix=settings.API_V1_STR, tags=["Execution Intelligence"])

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "title": "PLAN2BUILD — Project Controls Platform",
        "status": "Online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
