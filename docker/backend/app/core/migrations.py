"""Small additive schema migration helper for demo SQLite deployments.

This deliberately only adds nullable/defaulted columns and tables; it never drops
or rewrites existing demo data.  Production deployments can replace it with Alembic.
"""
from sqlalchemy import inspect, text


ADDITIVE_COLUMNS = {
    "schedule_activities": {
        "discipline": "VARCHAR(100) NOT NULL DEFAULT 'Unclassified'",
        "actual_start_at": "DATETIME", "actual_end_at": "DATETIME",
        "actual_start_provenance": "VARCHAR(100)", "actual_end_provenance": "VARCHAR(100)",
        "actual_start_confidence": "FLOAT", "actual_end_confidence": "FLOAT",
        "location": "VARCHAR(200)", "status": "VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED'",
    },
    "site_reports": {
        "event_type": "VARCHAR(50) NOT NULL DEFAULT 'PROGRESS'", "discipline": "VARCHAR(100) NOT NULL DEFAULT 'Unclassified'",
        "source_type": "VARCHAR(50) NOT NULL DEFAULT 'DIRECT_TEXT'", "source_doc_name": "VARCHAR(255)",
        "source_ref": "VARCHAR(255)", "raw_text": "TEXT", "extraction_metadata": "JSON", "remarks": "TEXT",
    },
    "activity_events": {
        "source_timestamp": "DATETIME", "raw_input": "TEXT", "source_user": "VARCHAR(100)", "location": "VARCHAR(200)",
        "wbs_or_activity_ref": "VARCHAR(100)", "delay_cause": "VARCHAR(255)", "is_inferred": "BOOLEAN DEFAULT 1",
        "approved_at": "DATETIME", "approved_by": "VARCHAR(100)",
    },
    "schedule_sync_queue": {"idempotency_key": "VARCHAR(255)"},
}


def run_additive_migrations(engine):
    inspector = inspect(engine)
    for table, columns in ADDITIVE_COLUMNS.items():
        if table not in inspector.get_table_names():
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        for name, ddl in columns.items():
            if name not in existing:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
    # This index is safe and makes queue retries idempotent on existing databases.
    with engine.begin() as conn:
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_sync_queue_idempotency ON schedule_sync_queue (idempotency_key)"))
