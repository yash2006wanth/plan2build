from sqlalchemy import inspect, text
import logging

logger = logging.getLogger("migration")

def run_db_migrations(engine):
    """
    Safely inspect existing tables and add any new missing columns
    for SQLite / PostgreSQL backwards compatibility.
    """
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    with engine.connect() as conn:
        # 1. schedule_activities
        if "schedule_activities" in tables:
            cols = [c["name"] for c in inspector.get_columns("schedule_activities")]
            new_cols = {
                "discipline": "VARCHAR(100) DEFAULT 'Unclassified'",
                "actual_start_at": "TIMESTAMP NULL",
                "actual_end_at": "TIMESTAMP NULL",
                "actual_start_provenance": "VARCHAR(100) NULL",
                "actual_end_provenance": "VARCHAR(100) NULL",
                "actual_start_confidence": "FLOAT NULL",
                "actual_end_confidence": "FLOAT NULL",
                "last_updated_at": "TIMESTAMP NULL",
            }
            for col_name, col_type in new_cols.items():
                if col_name not in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE schedule_activities ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"Added column {col_name} to schedule_activities")
                    except Exception as e:
                        logger.warning(f"Could not add column {col_name}: {e}")

        # 2. site_reports
        if "site_reports" in tables:
            cols = [c["name"] for c in inspector.get_columns("site_reports")]
            new_cols = {
                "event_type": "VARCHAR(50) DEFAULT 'PROGRESS'",
                "discipline": "VARCHAR(100) DEFAULT 'Unclassified'",
                "source_type": "VARCHAR(50) DEFAULT 'DIRECT_TEXT'",
                "source_doc_name": "VARCHAR(255) NULL",
                "source_ref": "VARCHAR(255) NULL",
                "raw_text": "TEXT NULL",
                "extraction_metadata": "JSON NULL",
            }
            for col_name, col_type in new_cols.items():
                if col_name not in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE site_reports ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"Added column {col_name} to site_reports")
                    except Exception as e:
                        logger.warning(f"Could not add column {col_name}: {e}")
