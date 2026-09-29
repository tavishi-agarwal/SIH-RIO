"""FastAPI application entry point for HADR Flood Simulation Platform."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .config import settings
from .api import demo, simulations, models_api, gee, monitoring, exports, health, flood


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup: create required directories
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(settings.DEMO_DATA_PATH, exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_PATH, "projects"), exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_PATH, "exports"), exist_ok=True)
    print(f"HADR Platform starting — storage: {settings.STORAGE_PATH}, demo: {settings.DEMO_DATA_PATH}")
    yield
    # Shutdown
    print("HADR Platform shutting down.")


app = FastAPI(
    title="HADR Flood Simulation Platform API",
    description=(
        "API for the HADR Flood Simulation and Dam-Break Analysis Platform. "
        "Supports dam-break analysis, flood inundation simulation, "
        "hydrological data processing, and GIS visualization. "
        "Current model adapters run MOCK simulations for demonstration."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving (storage and demo data)
if os.path.exists(settings.STORAGE_PATH):
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_PATH), name="storage")

# API Routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(demo.router, prefix="/api/demo", tags=["demo"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["simulations"])
app.include_router(models_api.router, prefix="/api/models", tags=["models"])
app.include_router(gee.router, prefix="/api/gee", tags=["gee"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(exports.router, prefix="/api/exports", tags=["exports"])
app.include_router(flood.router, prefix="/api/flood", tags=["flood-real-data"])


@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "platform": "HADR Flood Simulation Platform",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "status": "operational"
    })
