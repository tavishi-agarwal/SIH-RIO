"""Celery simulation worker tasks."""
from .celery_app import celery_app
from ..services.simulation.pipeline import SimulationPipeline
from ..config import settings


@celery_app.task(name="run_simulation_task", bind=True, max_retries=1)
def run_simulation_task(self, simulation_id: str, parameters: dict = None, use_demo: bool = False):
    """
    Celery task for running a simulation pipeline.
    
    Args:
        simulation_id: Unique simulation identifier
        parameters: Simulation parameters (optional)
        use_demo: Whether to use demo data
    """
    pipeline = SimulationPipeline(storage_path=settings.STORAGE_PATH)
    result = pipeline.run_pipeline(
        simulation_id=simulation_id,
        use_demo_data=use_demo,
        parameters=parameters,
    )
    return result


@celery_app.task(name="run_demo_task", bind=True)
def run_demo_task(self, simulation_id: str):
    """
    Celery task for running the full demo pipeline.
    
    Args:
        simulation_id: Unique simulation identifier
    """
    pipeline = SimulationPipeline(storage_path=settings.STORAGE_PATH)
    result = pipeline.run_demo_pipeline(simulation_id=simulation_id)
    return result
