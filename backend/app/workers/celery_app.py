"""
Celery application configuration for HADR platform.

Workers handle long-running simulation tasks asynchronously.
"""
from celery import Celery
from ..config import settings


def create_celery_app() -> Celery:
    """Create and configure Celery application."""
    app = Celery(
        "hadr_platform",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_routes={
            "app.workers.simulation_worker.run_simulation_task": {"queue": "simulations"},
            "app.workers.simulation_worker.run_demo_task": {"queue": "demo"},
        },
        worker_prefetch_multiplier=1,  # One task at a time per worker
        task_acks_late=True,           # Ack after task completes
    )
    return app


celery_app = create_celery_app()
