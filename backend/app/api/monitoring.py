"""Near-real-time flood monitoring API."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/status")
async def monitoring_status():
    return JSONResponse({
        "is_mock": True,
        "monitoring_active": True,
        "last_updated": datetime.utcnow().isoformat(),
        "data_sources": {
            "sentinel1": {"status": "NOT_CONFIGURED", "is_mock": True},
            "rainfall": {"status": "NOT_CONFIGURED", "is_mock": True},
            "river_gauges": {"status": "DEMO", "is_mock": True},
        },
        "alert_level": "ORANGE",
        "river_level_status": "RISING",
    })


@router.get("/alerts")
async def get_alerts():
    now = datetime.utcnow()
    return JSONResponse({
        "is_mock": True,
        "alerts": [
            {
                "id": "alert-001",
                "type": "FLOOD_WATCH",
                "severity": "HIGH",
                "message": "DEMO: River level rising rapidly near Demo Dam.",
                "timestamp": (now - timedelta(hours=2)).isoformat(),
                "is_demo": True,
            },
            {
                "id": "alert-002",
                "type": "RAINFALL_ALERT",
                "severity": "MODERATE",
                "message": "DEMO: Heavy rainfall forecast in upper catchment.",
                "timestamp": (now - timedelta(hours=5)).isoformat(),
                "is_demo": True,
            },
        ],
        "disclaimer": "DEMO ALERTS — Not real emergency information.",
    })


@router.get("/satellite")
async def get_satellite():
    return JSONResponse({
        "is_mock": True,
        "latest_acquisition": {
            "source": "Sentinel-1 (Mock)",
            "date": "2024-06-15",
            "status": "NOT_CONFIGURED",
            "is_mock": True,
        }
    })
