"""Simulations API router."""
import uuid
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import threading

from ..services.simulation.pipeline import SimulationPipeline
from ..config import settings
from .demo import get_simulations_store

router = APIRouter()
_pipeline = SimulationPipeline(storage_path=settings.STORAGE_PATH)


def _simulations():
    return get_simulations_store()


@router.get("")
async def list_simulations():
    """List all simulations."""
    sims = _simulations()
    return JSONResponse({
        "simulations": [
            {
                "simulation_id": v.get("simulation_id", k),
                "status": v.get("status", "UNKNOWN"),
                "progress": v.get("progress", 0),
                "current_stage": v.get("current_stage", ""),
                "is_demo": v.get("is_demo", False),
                "is_mock": v.get("is_mock", True),
            }
            for k, v in sims.items()
        ],
        "total": len(sims),
    })


@router.post("")
async def create_simulation(params: Dict[str, Any], background_tasks: BackgroundTasks):
    """Create and optionally run a new simulation."""
    sim_id = str(uuid.uuid4())
    _simulations()[sim_id] = {
        "simulation_id": sim_id,
        "status": "CREATED",
        "progress": 0.0,
        "current_stage": "CREATED",
        "stages": [],
        "parameters": params,
        "is_demo": params.get("is_demo", False),
        "is_mock": True,
    }
    return JSONResponse({
        "simulation_id": sim_id,
        "status": "CREATED",
        "is_mock": True,
    })


@router.get("/{simulation_id}")
async def get_simulation(simulation_id: str):
    """Get simulation by ID."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return JSONResponse(sim)


@router.post("/{simulation_id}/run")
async def run_simulation(simulation_id: str, background_tasks: BackgroundTasks):
    """Trigger pipeline for existing simulation."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    def run():
        try:
            _simulations()[simulation_id]["status"] = "RUNNING"
            params = _simulations()[simulation_id].get("parameters", {})
            is_demo = _simulations()[simulation_id].get("is_demo", True)
            result = _pipeline.run_pipeline(simulation_id, use_demo_data=is_demo, parameters=params)
            _simulations()[simulation_id].update(result)
        except Exception as e:
            _simulations()[simulation_id]["status"] = "FAILED"
            _simulations()[simulation_id]["error"] = str(e)

    t = threading.Thread(target=run, daemon=True)
    t.start()

    return JSONResponse({"message": "Pipeline started", "simulation_id": simulation_id})


@router.get("/{simulation_id}/status")
async def get_status(simulation_id: str):
    """Get simulation pipeline status."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return JSONResponse({
        "simulation_id": simulation_id,
        "status": sim.get("status", "UNKNOWN"),
        "progress": sim.get("progress", 0),
        "current_stage": sim.get("current_stage", ""),
        "stages": sim.get("stages", []),
        "error": sim.get("error"),
        "is_mock": True,
    })


@router.get("/{simulation_id}/results")
async def get_results(simulation_id: str):
    """Get flood simulation results."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.get("status") not in ("COMPLETED",):
        return JSONResponse({"status": sim.get("status"), "message": "Simulation not yet complete"})
    return JSONResponse({
        "simulation_id": simulation_id,
        "status": sim.get("status"),
        "sph_result": sim.get("sph_result"),
        "delft3d_result": sim.get("delft3d_result"),
        "is_mock": True,
        "disclaimer": "MOCK SPH and MOCK DELFT3D — DEMONSTRATION ONLY",
    })


@router.get("/{simulation_id}/comparison")
async def get_comparison(simulation_id: str):
    """Get SPH vs Delft3D comparison."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    comparison = sim.get("comparison")
    if not comparison:
        return JSONResponse({"status": sim.get("status"), "message": "Results not ready"})
    return JSONResponse(comparison)


@router.get("/{simulation_id}/impact")
async def get_impact(simulation_id: str):
    """Get impact analysis results."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return JSONResponse({
        "simulation_id": simulation_id,
        "sph_impact": sim.get("impact_sph"),
        "delft3d_impact": sim.get("impact_delft3d"),
        "is_preliminary": True,
        "disclaimer": "PRELIMINARY DEMONSTRATION ESTIMATE — NOT for real emergency decisions.",
    })


@router.get("/{simulation_id}/exports")
async def get_exports(simulation_id: str):
    """List exports for a simulation."""
    sim = _simulations().get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    exports = sim.get("exports", {})
    return JSONResponse({"simulation_id": simulation_id, "exports": exports})
