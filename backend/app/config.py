"""Application configuration using pydantic-settings."""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-in-production-secret-key"

    # Database
    DATABASE_URL: str = "postgresql://hadr:hadr_password@localhost:5432/hadr_flood"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_PATH: str = "./storage"
    DEMO_DATA_PATH: str = "./demo"

    # CORS — exact origins, plus an optional regex for wildcard hosts
    # (e.g. r"https://.*\.vercel\.app" so Vercel preview deploys work too)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    CORS_ORIGIN_REGEX: str = ""

    # External Model Executables (empty = use mock)
    DELFT3D_EXECUTABLE: str = ""
    SPH_EXECUTABLE: str = ""

    # Google Earth Engine
    GEE_PROJECT_ID: str = ""
    GEE_SERVICE_ACCOUNT: str = ""

    # Application version
    APP_VERSION: str = "1.0.0-mvp"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def sph_is_mock(self) -> bool:
        return not bool(self.SPH_EXECUTABLE)

    @property
    def delft3d_is_mock(self) -> bool:
        return not bool(self.DELFT3D_EXECUTABLE)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
