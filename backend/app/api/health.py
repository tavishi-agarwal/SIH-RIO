"""Health check API router."""
import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from ..config import settings

router = APIRouter()


@router.get("/health")
async def health():
    """Platform health check endpoint."""
    storage_ok = os.path.exists(settings.STORAGE_PATH)
    return JSONResponse({
        "status": "ok",
        "platform": "HADR Flood Simulation Platform",
        "version": settings.APP_VERSION,
        "storage": "ok" if storage_ok else "error",
        "models": {
            "sph": {"status": "ADAPTER_READY", "is_mock": True, "execution": "MOCK"},
            "delft3d": {"status": "ADAPTER_READY", "is_mock": True, "execution": "MOCK"},
        },
        "gee": {"status": "NOT_CONFIGURED", "is_mock": True},
        "disclaimer": (
            "This platform uses MOCK hydraulic models for demonstration. "
            "No real Delft3D or SPH solver is installed."
        ),
    })
