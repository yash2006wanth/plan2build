import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PLAN2BUILD - Intelligent Data Capture & Schedule-Linking Layer"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./sih26122.db"
    )
    
    # Uploads directory
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # AI Embedding & Gemini API Settings
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY", os.getenv("LLM_API_KEY", None))
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "GEMINI")
    
    # Secret Key for Auth (JWT Architecture Ready)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sih26122_secret_key_change_in_production_98127391273")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
