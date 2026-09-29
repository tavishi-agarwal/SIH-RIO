"""Demo API router — provides all demo data endpoints."""
import uuid
import threading
from typing import Dict, Any
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse

from ..services.demo.generator import DemoDataService
from ..services.simulation.pipeline import SimulationPipeline
from ..config import settings

router = APIRouter()

# In-memory simulation store (MVP: replace with DB in Phase 3)
_simulations: Dict[str, Any] = {}
_pipeline = SimulationPipeline(storage_path=settings.STORAGE_PATH)


@router.post("/load")
async def load_demo(background_tasks: BackgroundTasks):
    """
    Load demo data and start the full demo pipeline.
    Returns simulation_id immediately; pipeline runs in background.
    """
    sim_id = str(uuid.uuid4())
    _simulations[sim_id] = {
        "simulation_id": sim_id,
        "status": "CREATED",
        "progress": 0.0,
        "current_stage": "CREATED",
        "stages": [],
        "is_demo": True,
        "is_mock": True,
    }

    def run_pipeline():
        try:
            _simulations[sim_id]["status"] = "RUNNING"
            result = _pipeline.run_demo_pipeline(sim_id)
            _simulations[sim_id].update(result)
        except Exception as e:
            _simulations[sim_id]["status"] = "FAILED"
            _simulations[sim_id]["error"] = str(e)

    thread = threading.Thread(target=run_pipeline, daemon=True)
    thread.start()

    return JSONResponse({
        "simulation_id": sim_id,
        "status": "CREATED",
        "message": "Demo pipeline started. Poll /api/simulations/{id}/status for progress.",
        "is_demo": True,
        "is_mock": True,
    })


@router.get("/status/{simulation_id}")
async def get_demo_status(simulation_id: str):
    """Get demo simulation status."""
    sim = _simulations.get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return JSONResponse(sim)


@router.get("/study-area")
async def get_study_area():
    return JSONResponse(DemoDataService.get_demo_study_area())


@router.get("/river")
async def get_river():
    return JSONResponse(DemoDataService.get_demo_river())


@router.get("/dam")
async def get_dam():
    return JSONResponse(DemoDataService.get_demo_dam())


@router.get("/reservoir")
async def get_reservoir():
    return JSONResponse(DemoDataService.get_demo_reservoir())


@router.get("/hydrology")
async def get_hydrology():
    return JSONResponse({
        "data": DemoDataService.get_demo_hydrology(),
        "is_demo": True,
        "label": "Synthetic Hydrological Data",
    })


@router.get("/settlements")
async def get_settlements():
    return JSONResponse(DemoDataService.get_demo_settlements())


@router.get("/roads")
async def get_roads():
    return JSONResponse(DemoDataService.get_demo_roads())


@router.get("/buildings")
async def get_buildings():
    return JSONResponse(DemoDataService.get_demo_buildings())


@router.get("/infrastructure")
async def get_infrastructure():
    return JSONResponse(DemoDataService.get_demo_infrastructure())


@router.get("/agriculture")
async def get_agriculture():
    return JSONResponse(DemoDataService.get_demo_agriculture())


@router.get("/dem-info")
async def get_dem_info():
    return JSONResponse({
        "bounds": {"min_lon": 79.80, "min_lat": 30.20, "max_lon": 80.10, "max_lat": 30.40},
        "crs": "EPSG:4326",
        "resolution_m": 30.0,
        "rows": 128,
        "cols": 128,
        "elevation_min_m": 600.0,
        "elevation_max_m": 2200.0,
        "elevation_mean_m": 1050.0,
        "nodata": -9999.0,
        "is_synthetic": True,
        "is_demo": True,
        "label": "Synthetic Demonstration DEM — Himalayan Foothill Style",
    })


@router.get("/full")
async def get_full_demo():
    """Return complete demo dataset in one call."""
    return JSONResponse(DemoDataService.generate_full_demo())


# Make _simulations accessible to simulations router
def get_simulations_store():
    return _simulations
