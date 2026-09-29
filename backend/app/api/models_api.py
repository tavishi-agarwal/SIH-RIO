"""Models API router — returns model adapter status."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from ..model_adapters.sph.adapter import SPHModelAdapter
from ..model_adapters.delft3d.adapter import Delft3DModelAdapter
from ..config import settings

router = APIRouter()

_sph = SPHModelAdapter()
_d3d = Delft3DModelAdapter()


@router.get("")
async def get_models():
    return JSONResponse({
        "models": {
            "sph": _get_sph_status(),
            "delft3d": _get_d3d_status(),
        }
    })


@router.get("/sph")
async def get_sph():
    return JSONResponse(_get_sph_status())


@router.get("/delft3d")
async def get_delft3d():
    return JSONResponse(_get_d3d_status())


def _get_sph_status():
    return {
        "model_name": "SPH",
        "full_name": "Smooth Particle Hydrodynamics",
        "adapter_status": "READY",
        "execution_mode": "MOCK",
        "is_mock": True,
        "real_solver_connected": False,
        "executable_configured": bool(settings.SPH_EXECUTABLE),
        "model_version": "mock-sph-1.0",
        "capabilities": [
            "Dam-break simulation",
            "Free-surface flow",
            "Lagrangian particle tracking",
            "Flood extent generation",
            "Velocity field",
            "Arrival time computation",
        ],
        "disclaimer": "MOCK SPH — DEMONSTRATION ONLY. Not a validated SPH solver.",
        "integration_path": "models/sph/",
        "executable_env_var": "SPH_EXECUTABLE",
    }


def _get_d3d_status():
    return {
        "model_name": "DELFT3D",
        "full_name": "Delft3D-FLOW",
        "adapter_status": "READY",
        "execution_mode": "MOCK",
        "is_mock": True,
        "real_solver_connected": False,
        "executable_configured": bool(settings.DELFT3D_EXECUTABLE),
        "model_version": "mock-delft3d-1.0",
        "capabilities": [
            "Hydrodynamic flood modelling",
            "Structured curvilinear grid",
            "Sediment transport (future)",
            "Water quality (future)",
            "Dam-break simulation",
            "River blockage scenario",
        ],
        "disclaimer": "MOCK DELFT3D — DEMONSTRATION ONLY. Not a validated Delft3D solver.",
        "integration_path": "models/delft3d/",
        "executable_env_var": "DELFT3D_EXECUTABLE",
    }
