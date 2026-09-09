from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.models.schema import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user:
        # Fallback check for demo users if not present in DB yet
        demo_roles = {
            "admin@buildsync.demo": ("System Admin", "ADMIN"),
            "manager@buildsync.demo": ("Project Manager", "PROJECT_MANAGER"),
            "engineer@buildsync.demo": ("Site Engineer", "SITE_ENGINEER"),
            "worker@buildsync.demo": ("Ramesh Kumar (Worker)", "WORKER")
        }
        if email_clean in demo_roles and req.password == "BuildSync@2026":
            name, role = demo_roles[email_clean]
            pwd_h = hash_password("BuildSync@2026")
            user = User(
                name=name,
                email=email_clean,
                role=role,
                password_hash=pwd_h
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }

@router.get("/auth/me", response_model=UserResponse)
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid format.")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }
