import datetime
from sqlalchemy.orm import Session
from app.models.schema import User, Project, ScheduleActivity, ActivityDependency, SiteReport, ActivityMatch, ProgressRecord, Alert, EvidencePhoto
from app.services.progress_engine import update_activity_progress, compute_project_progress_summary
from app.services.alert_engine import generate_project_alerts

from app.core.security import hash_password

def seed_demo_data(db: Session):
    # Check if project already exists
    existing_project = db.query(Project).filter(Project.name == "Smart City Flyover – Package A").first()
    
    # Ensure demo users exist
    demo_pwd = hash_password("BuildSync@2026")
    demo_users_data = [
        {"name": "System Admin", "email": "admin@buildsync.demo", "role": "ADMIN"},
        {"name": "Project Manager", "email": "manager@buildsync.demo", "role": "PROJECT_MANAGER"},
        {"name": "Site Engineer", "email": "engineer@buildsync.demo", "role": "SITE_ENGINEER"},
        {"name": "Ramesh Kumar", "email": "worker@buildsync.demo", "role": "WORKER"},
        {"name": "Rajesh Sharma", "email": "pm@smartcity.gov.in", "role": "PROJECT_MANAGER"},
        {"name": "Vikram Patel", "email": "engineer@smartcity.gov.in", "role": "SITE_ENGINEER"}
    ]
    for udata in demo_users_data:
        existing_u = db.query(User).filter(User.email == udata["email"]).first()
        if not existing_u:
            new_u = User(
                name=udata["name"],
                email=udata["email"],
                role=udata["role"],
                password_hash=demo_pwd
            )
            db.add(new_u)
    db.commit()

    if existing_project:
        return existing_project

    # 2. Create Project
    start_d = datetime.date(2026, 8, 1)
    end_d = datetime.date(2026, 11, 30)

    project = Project(
        name="Smart City Flyover – Package A",
        description="Construction of 4-lane elevated corridor, piers, pre-stressed concrete girders, deck slab, and smart traffic lighting on Outer Ring Road.",
        location="Bengaluru Outer Ring Road, Zone 4",
        start_date=start_d,
        planned_end_date=end_d,
        status="ACTIVE"
    )
    db.add(project)
    db.flush()

    # 3. Create Schedule Activities
    activities_data = [
        {
            "activity_id": "WBS-01.01",
            "activity_name": "Site Preparation & Utility Shifting",
            "wbs_code": "1.1",
            "description": "Demolition of old barriers, shifting water/telecom utilities, site fencing",
            "start_date": datetime.date(2026, 8, 1),
            "end_date": datetime.date(2026, 8, 10),
            "planned_quantity": 500.0,
            "unit": "meters",
            "location": "Pier 01 to Pier 08 Corridor"
        },
        {
            "activity_id": "WBS-01.02",
            "activity_name": "Foundation Excavation – Pier P01 to P04",
            "wbs_code": "1.2",
            "description": "Earthwork excavation up to hard rock stratum for pier raft foundations",
            "start_date": datetime.date(2026, 8, 5),
            "end_date": datetime.date(2026, 8, 20),
            "planned_quantity": 1200.0,
            "unit": "m3",
            "location": "Zone A – Pier P01-P04"
        },
        {
            "activity_id": "WBS-01.03",
            "activity_name": "Raft Foundation Concrete Pouring – Zone A",
            "wbs_code": "1.3",
            "description": "M35 grade mass concrete pour for raft foundation P01-P04",
            "start_date": datetime.date(2026, 8, 15),
            "end_date": datetime.date(2026, 8, 28),
            "planned_quantity": 850.0,
            "unit": "m3",
            "location": "Zone A – Foundation Raft"
        },
        {
            "activity_id": "WBS-02.01",
            "activity_name": "Column Rebar & Reinforcement",
            "wbs_code": "2.1",
            "description": "TMT steel rebar cage assembly and fixing for circular piers P01-P06",
            "start_date": datetime.date(2026, 8, 22),
            "end_date": datetime.date(2026, 9, 8),
            "planned_quantity": 90.0,
            "unit": "tons",
            "location": "Piers P01-P06"
        },
        {
            "activity_id": "WBS-02.02",
            "activity_name": "Pier Column Concrete Construction",
            "wbs_code": "2.2",
            "description": "Pouring M40 self-compacting concrete for 8m vertical pier columns",
            "start_date": datetime.date(2026, 8, 28),
            "end_date": datetime.date(2026, 9, 15),
            "planned_quantity": 400.0,
            "unit": "m3",
            "location": "Pier Columns P01-P04"
        },
        {
            "activity_id": "WBS-02.03",
            "activity_name": "Pier Cap Formwork & Post-Tensioning",
            "wbs_code": "2.3",
            "description": "Erection of steel shuttering formwork and pre-stressing duct alignment",
            "start_date": datetime.date(2026, 9, 5),
            "end_date": datetime.date(2026, 9, 22),
            "planned_quantity": 16.0,
            "unit": "units",
            "location": "Pier Caps P01-P08"
        },
        {
            "activity_id": "WBS-03.01",
            "activity_name": "Pre-cast Girder Casting & Curing",
            "wbs_code": "3.1",
            "description": "Casting pre-stressed PSC I-girders at casting yard",
            "start_date": datetime.date(2026, 8, 10),
            "end_date": datetime.date(2026, 9, 25),
            "planned_quantity": 32.0,
            "unit": "girders",
            "location": "Casting Yard – Outer Ring Road"
        },
        {
            "activity_id": "WBS-03.02",
            "activity_name": "Girder Erection & Span Launching",
            "wbs_code": "3.2",
            "description": "Heavy crane lifting and positioning of girders on pier bearings",
            "start_date": datetime.date(2026, 9, 15),
            "end_date": datetime.date(2026, 10, 10),
            "planned_quantity": 32.0,
            "unit": "girders",
            "location": "Main Flyover Spans"
        },
        {
            "activity_id": "WBS-04.01",
            "activity_name": "Deck Slab Reinforcement & Shuttering",
            "wbs_code": "4.1",
            "description": "Deck mesh rebar installation and deck plate fixing",
            "start_date": datetime.date(2026, 9, 25),
            "end_date": datetime.date(2026, 10, 20),
            "planned_quantity": 2400.0,
            "unit": "m2",
            "location": "Flyover Deck Span 1-4"
        },
        {
            "activity_id": "WBS-04.02",
            "activity_name": "Deck Concrete Pouring & Curing",
            "wbs_code": "4.2",
            "description": "Monolithic concrete pouring for flyover deck slab",
            "start_date": datetime.date(2026, 10, 5),
            "end_date": datetime.date(2026, 10, 30),
            "planned_quantity": 1800.0,
            "unit": "m3",
            "location": "Flyover Deck Span 1-4"
        },
        {
            "activity_id": "WBS-05.01",
            "activity_name": "Crash Barrier Concrete Construction",
            "wbs_code": "5.1",
            "description": "Reinforced concrete parapet barrier wall along edges",
            "start_date": datetime.date(2026, 10, 15),
            "end_date": datetime.date(2026, 11, 10),
            "planned_quantity": 1200.0,
            "unit": "meters",
            "location": "Flyover Edge Parapets"
        },
        {
            "activity_id": "WBS-05.02",
            "activity_name": "Asphalt Wearing Course & Paving",
            "wbs_code": "5.2",
            "description": "Hot mix bituminous concrete overlay (40mm thickness)",
            "start_date": datetime.date(2026, 11, 1),
            "end_date": datetime.date(2026, 11, 20),
            "planned_quantity": 9600.0,
            "unit": "m2",
            "location": "Flyover Carriageway"
        },
        {
            "activity_id": "WBS-06.01",
            "activity_name": "Electrical Ducting & Smart Lighting",
            "wbs_code": "6.1",
            "description": "High-mast LED light poles, cable conduits, and sensor boxes",
            "start_date": datetime.date(2026, 10, 25),
            "end_date": datetime.date(2026, 11, 25),
            "planned_quantity": 45.0,
            "unit": "poles",
            "location": "Median & Parapet Margins"
        }
    ]

    act_db_map = {}
    for adata in activities_data:
        act = ScheduleActivity(
            project_id=project.id,
            activity_id=adata["activity_id"],
            activity_name=adata["activity_name"],
            wbs_code=adata["wbs_code"],
            description=adata["description"],
            start_date=adata["start_date"],
            end_date=adata["end_date"],
            planned_quantity=adata["planned_quantity"],
            unit=adata["unit"],
            location=adata["location"],
            status="NOT_STARTED"
        )
        db.add(act)
        db.flush()
        act_db_map[adata["activity_id"]] = act

    # 4. Add Dependencies
    deps_data = [
        ("WBS-01.01", "WBS-01.02"),
        ("WBS-01.02", "WBS-01.03"),
        ("WBS-01.03", "WBS-02.01"),
        ("WBS-02.01", "WBS-02.02"),
        ("WBS-02.02", "WBS-02.03"),
        ("WBS-03.01", "WBS-03.02"),
        ("WBS-02.03", "WBS-03.02"),
        ("WBS-03.02", "WBS-04.01"),
        ("WBS-04.01", "WBS-04.02"),
        ("WBS-04.02", "WBS-05.01"),
        ("WBS-04.02", "WBS-05.02"),
        ("WBS-05.01", "WBS-06.01")
    ]
    for pred_code, succ_code in deps_data:
        if pred_code in act_db_map and succ_code in act_db_map:
            dep = ActivityDependency(
                predecessor_id=act_db_map[pred_code].id,
                successor_id=act_db_map[succ_code].id,
                dependency_type="FS",
                lag_days=0
            )
            db.add(dep)

    db.flush()

    # 5. Add Historical Site Reports & Pre-approved Matches
    # This sets up realistic status (ON TRACK, AT RISK, DELAYED)
    reports_data = [
        # Completed Site Prep (Completed 500m)
        {
            "activity_code": "WBS-01.01",
            "report_text": "Completed full site preparation, boundary fencing and underground utility shifting for Pier P01-P08 corridor.",
            "qty": 500.0,
            "unit": "meters",
            "lat": 12.9248, "lon": 77.6821,
            "remarks": "Work completed cleanly ahead of rain schedule.",
            "labour": 24,
            "eq": "JCB 3CX Excavator, 10-Ton Tipper Truck",
            "mat": "Fencing mesh 500m, Warning tape",
            "days_ago": 26
        },
        # Excavation - Delayed progress (650 / 1200 m3)
        {
            "activity_code": "WBS-01.02",
            "report_text": "Excavation completed for Pier P01 and P02 raft foundation pits. Hard rock stratum encountered at 4m depth.",
            "qty": 350.0,
            "unit": "m3",
            "lat": 12.9252, "lon": 77.6825,
            "remarks": "Hard rock required breaker attachment slowing hourly rate.",
            "labour": 18,
            "eq": "CAT 320 Excavator with Rock Breaker",
            "mat": "Diesel 450L",
            "days_ago": 20
        },
        {
            "activity_code": "WBS-01.02",
            "report_text": "Continued foundation pit excavation for Pier P03. Total excavated quantity today 300 m3.",
            "qty": 300.0,
            "unit": "m3",
            "lat": 12.9255, "lon": 77.6829,
            "remarks": "Subsoil seepage encountered, dewatering pumps deployed.",
            "labour": 15,
            "eq": "CAT 320 Excavator, 3-inch Dewatering Pump",
            "mat": "Diesel 300L, Pump hose",
            "days_ago": 15
        },
        # Foundation Concrete - At Risk (460 / 850 m3)
        {
            "activity_code": "WBS-01.03",
            "report_text": "M35 mass concrete pour completed for Pier P01 raft footing foundation.",
            "qty": 460.0,
            "unit": "m3",
            "lat": 12.9250, "lon": 77.6823,
            "remarks": "Continuous pour carried out overnight with temperature monitoring.",
            "labour": 32,
            "eq": "Concrete Boom Pump 36m, 6 Ready-Mix Transit Mixers",
            "mat": "M35 RMC 460m3, Admixture 120L",
            "days_ago": 10
        },
        # Column Rebar - In Progress / Delayed (38 / 90 tons)
        {
            "activity_code": "WBS-02.01",
            "report_text": "Column rebar cage assembly completed for Pier P01 and P02. Steel binding in progress.",
            "qty": 38.0,
            "unit": "tons",
            "lat": 12.9258, "lon": 77.6832,
            "remarks": "Rebar steel delivery delayed by supplier by 3 days.",
            "labour": 22,
            "eq": "Hydra Crane 15-Ton, Rebar Bender/Cutter",
            "mat": "Fe550D TMT Bars 38 Tons, Binding Wire 250kg",
            "days_ago": 5
        },
        # Pier Column Concrete - In Progress (160 / 400 m3)
        {
            "activity_code": "WBS-02.02",
            "report_text": "M40 concrete pouring for 8m height Pier Column P01 complete.",
            "qty": 160.0,
            "unit": "m3",
            "lat": 12.9260, "lon": 77.6835,
            "remarks": "Verticality verified using total station laser.",
            "labour": 20,
            "eq": "Concrete Pump, Needle Vibrators 60mm",
            "mat": "M40 RMC 160m3",
            "days_ago": 2
        },
        # Girder Casting Yard - On Track (18 / 32 girders)
        {
            "activity_code": "WBS-03.01",
            "report_text": "Casting and steam curing of 4 PSC I-girders completed at yard span 2.",
            "qty": 18.0,
            "unit": "girders",
            "lat": 12.9280, "lon": 77.6850,
            "remarks": "Cube test strength achieved 45 MPa at 7 days.",
            "labour": 28,
            "eq": "Gantry Crane 50-Ton, Shuttering vibrators",
            "mat": "High Tensile Steel Strands 4.5 Tons, M50 RMC 120m3",
            "days_ago": 4
        }
    ]

    curr_now = datetime.datetime.utcnow()

    for rep in reports_data:
        rep_time = curr_now - datetime.timedelta(days=rep["days_ago"])
        sreport = SiteReport(
            project_id=project.id,
            submitted_by=site_eng.id,
            report_text=rep["report_text"],
            quantity_completed=rep["qty"],
            unit=rep["unit"],
            latitude=rep["lat"],
            longitude=rep["lon"],
            timestamp=rep_time,
            remarks=rep["remarks"],
            labour_count=rep["labour"],
            equipment_details=rep["eq"],
            material_consumption=rep["mat"]
        )
        db.add(sreport)
        db.flush()

        # Add Evidence Photo
        photo = EvidencePhoto(
            site_report_id=sreport.id,
            file_path="/uploads/demo_site_photo.jpg",
            cv_metadata={
                "processed": True,
                "quality": {"brightness": 128.5, "contrast": 45.2, "is_clear": True},
                "visual_features": ["High Structural Detail (Rebar pattern detected)", "Outdoor Site Exposure"],
                "ai_confidence_score": 0.92
            }
        )
        db.add(photo)

        # Match to activity
        act_target = act_db_map[rep["activity_code"]]
        match = ActivityMatch(
            site_report_id=sreport.id,
            activity_id=act_target.id,
            semantic_score=0.91,
            location_score=0.95,
            date_score=0.90,
            keyword_score=0.85,
            wbs_score=0.95,
            final_score=0.915,
            confidence="Auto-Approved",
            matching_reason=f"Semantic similarity: 91% • Location: '{act_target.location}' • Date in schedule window",
            approved=True
        )
        db.add(match)

    db.commit()

    # 6. Seed BOQ Items & Costs
    boq_items_seed = [
        {"item_code": "BOQ-01.01", "act_code": "WBS-01.01", "desc": "Site Prep & Utility Diversion", "unit": "meters", "qty": 500.0, "act_qty": 500.0, "rate": 8000.0, "budget": 40.0, "actual": 38.5},
        {"item_code": "BOQ-01.02", "act_code": "WBS-01.02", "desc": "Foundation Open Excavation in Hard Rock", "unit": "m3", "qty": 1200.0, "act_qty": 650.0, "rate": 1500.0, "budget": 18.0, "actual": 12.0},
        {"item_code": "BOQ-01.03", "act_code": "WBS-01.03", "desc": "M35 Mass Concrete Raft Foundation", "unit": "m3", "qty": 850.0, "act_qty": 460.0, "rate": 6500.0, "budget": 55.25, "actual": 30.5},
        {"item_code": "BOQ-02.01", "act_code": "WBS-02.01", "desc": "Fe550D TMT Reinforcement Rebar Cage", "unit": "tons", "qty": 90.0, "act_qty": 38.0, "rate": 72000.0, "budget": 64.8, "actual": 27.5},
        {"item_code": "BOQ-02.02", "act_code": "WBS-02.02", "desc": "M40 Self-Compacting Pier Column Concrete", "unit": "m3", "qty": 400.0, "act_qty": 160.0, "rate": 7500.0, "budget": 30.0, "actual": 12.2},
        {"item_code": "BOQ-02.03", "act_code": "WBS-02.03", "desc": "Pier Cap Formwork & Post-Tensioning Assembly", "unit": "units", "qty": 16.0, "act_qty": 0.0, "rate": 250000.0, "budget": 40.0, "actual": 0.0},
        {"item_code": "BOQ-03.01", "act_code": "WBS-03.01", "desc": "Pre-cast Pre-stressed PSC I-Girder Casting", "unit": "girders", "qty": 32.0, "act_qty": 18.0, "rate": 450000.0, "budget": 144.0, "actual": 81.0},
        {"item_code": "BOQ-03.02", "act_code": "WBS-03.02", "desc": "Girder Erection & Bearings Positioning", "unit": "girders", "qty": 32.0, "act_qty": 0.0, "rate": 150000.0, "budget": 48.0, "actual": 0.0},
        {"item_code": "BOQ-04.01", "act_code": "WBS-04.01", "desc": "Deck Slab Rebar Reinforcement Mesh", "unit": "m2", "qty": 2400.0, "act_qty": 0.0, "rate": 1800.0, "budget": 43.2, "actual": 0.0},
        {"item_code": "BOQ-04.02", "act_code": "WBS-04.02", "desc": "Flyover Deck Slab M40 Monolithic Concrete", "unit": "m3", "qty": 1800.0, "act_qty": 0.0, "rate": 8000.0, "budget": 144.0, "actual": 0.0},
        {"item_code": "BOQ-05.01", "act_code": "WBS-05.01", "desc": "RCC Parapet Crash Barrier Construction", "unit": "meters", "qty": 1200.0, "act_qty": 0.0, "rate": 3500.0, "budget": 42.0, "actual": 0.0},
        {"item_code": "BOQ-05.02", "act_code": "WBS-05.02", "desc": "Hot Mix Bituminous Wearing Course Paving", "unit": "m2", "qty": 9600.0, "act_qty": 0.0, "rate": 650.0, "budget": 62.4, "actual": 0.0},
        {"item_code": "BOQ-06.01", "act_code": "WBS-06.01", "desc": "High-Mast LED Street Lighting & Smart Sensors", "unit": "poles", "qty": 45.0, "act_qty": 0.0, "rate": 120000.0, "budget": 54.0, "actual": 0.0}
    ]

    from app.models.schema import BOQItem, CostRecord, LabourRecord, EquipmentRecord, MaterialRecord, ProjectRisk

    for b in boq_items_seed:
        act_ref = act_db_map.get(b["act_code"])
        boq = BOQItem(
            project_id=project.id,
            item_code=b["item_code"],
            description=b["desc"],
            unit=b["unit"],
            planned_quantity=b["qty"],
            actual_quantity=b["act_qty"],
            unit_rate=b["rate"],
            budgeted_cost=b["budget"] * 100000.0,  # Convert Lakh to INR
            actual_cost=b["actual"] * 100000.0,
            activity_id=act_ref.id if act_ref else None
        )
        db.add(boq)

    # 7. Seed Labour, Equipment, Material & Risk records
    labour_seed = [
        {"trade": "Rebar Mason Crew", "workers": 18, "hours": 144.0, "qty": 38.0, "unit": "tons"},
        {"trade": "Concrete Pouring Team", "workers": 15, "hours": 120.0, "qty": 460.0, "unit": "m3"},
        {"trade": "Earthwork Machine Operators", "workers": 12, "hours": 96.0, "qty": 650.0, "unit": "m3"}
    ]
    for l in labour_seed:
        db.add(LabourRecord(
            project_id=project.id,
            trade=l["trade"],
            workers_count=l["workers"],
            hours_worked=l["hours"],
            quantity_completed=l["qty"],
            unit=l["unit"]
        ))

    equipments_seed = [
        {"name": "CAT 320 Hydraulic Excavator #01", "cat": "Earthmoving", "avail": 10.0, "oper": 7.5, "idle": 2.5, "status": "OPERATIONAL"},
        {"name": "CAT 320 Hydraulic Excavator #02", "cat": "Earthmoving", "avail": 10.0, "oper": 6.5, "idle": 3.5, "status": "OPERATIONAL"},
        {"name": "Hydraulic Tower Crane TC-01", "cat": "Lifting", "avail": 10.0, "oper": 8.0, "idle": 2.0, "status": "OPERATIONAL"},
        {"name": "Transit Concrete Mixer TM-04", "cat": "Concreting", "avail": 10.0, "oper": 5.5, "idle": 4.5, "status": "OPERATIONAL"},
        {"name": "Crawler Crane 100T #02", "cat": "Lifting", "avail": 10.0, "oper": 7.0, "idle": 3.0, "status": "OPERATIONAL"},
        {"name": "Hydraulic Piling Rig PR-03", "cat": "Foundation", "avail": 10.0, "oper": 0.0, "idle": 10.0, "status": "MAINTENANCE"}
    ]
    for e in equipments_seed:
        db.add(EquipmentRecord(
            project_id=project.id,
            equipment_name=e["name"],
            category=e["cat"],
            available_hours=e["avail"],
            operating_hours=e["oper"],
            idle_hours=e["idle"],
            status=e["status"]
        ))

    materials_seed = [
        {"name": "Ready-Mix Concrete M35/M40", "unit": "m3", "planned": 1250.0, "consumed": 1380.0, "cost": 7000.0, "notes": "Concrete volume 10.4% above planned estimate due to site over-excavation."},
        {"name": "TMT High-Yield Rebar Steel Fe550D", "unit": "tons", "planned": 90.0, "consumed": 88.5, "cost": 72000.0, "notes": "Consumption matching design rebar schedule."},
        {"name": "Cement Bags (PPC 50kg)", "unit": "bags", "planned": 3000.0, "consumed": 3150.0, "cost": 380.0, "notes": "Utilized for site blinding and temporary works."},
        {"name": "Pre-Stressing Steel Strands (15.2mm)", "unit": "meters", "planned": 4500.0, "consumed": 4400.0, "cost": 140.0, "notes": "Staging stock available at site casting yard."}
    ]
    for m in materials_seed:
        db.add(MaterialRecord(
            project_id=project.id,
            material_name=m["name"],
            unit=m["unit"],
            planned_quantity=m["planned"],
            consumed_quantity=m["consumed"],
            unit_cost=m["cost"],
            notes=m["notes"]
        ))

    risks_seed = [
        {"title": "Pier P01-P04 Rebar Delay Threatens Deck Casting", "severity": "RED", "category": "Schedule & Critical Path", "impact": 4, "mitigation": "Deploy 8 extra rebar masons and start 2-hour evening overtime shift."},
        {"title": "M35 Concrete Overconsumption in Zone A Raft", "severity": "YELLOW", "category": "Material Variance", "impact": 0, "mitigation": "Site engineer to re-survey raft excavation shuttering boundaries before next pour."},
        {"title": "Telecom Utility Line Clearance at Pier 08 Corridor", "severity": "YELLOW", "category": "Predecessor Dependency", "impact": 2, "mitigation": "Coordinate joint inspection with city telecom authority for fast-track permit."}
    ]
    for r in risks_seed:
        db.add(ProjectRisk(
            project_id=project.id,
            risk_title=r["title"],
            severity=r["severity"],
            category=r["category"],
            impact_days=r["impact"],
            mitigation_strategy=r["mitigation"]
        ))

    db.commit()

    # Update Activity Progress & Generate Initial Alerts
    for act in act_db_map.values():
        update_activity_progress(db, act.id)

    generate_project_alerts(db, project.id)

    return project

