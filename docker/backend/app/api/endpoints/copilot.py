from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.services.copilot_engine import query_project_copilot

router = APIRouter()

class CopilotQueryRequest(BaseModel):
    project_id: int
    query: str
    language: Optional[str] = "en"

@router.post("/copilot/query")
def copilot_query(req: CopilotQueryRequest, db: Session = Depends(get_db)):
    res = query_project_copilot(db, req.project_id, req.query, req.language)
    if not res:
        raise HTTPException(status_code=400, detail="Copilot query processing error")
    return res
