"""Google Earth Engine abstraction layer — Mock provider."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/status")
async def gee_status():
    return JSONResponse({
        "connected": False,
        "provider": "mock",
        "message": "GEE not configured. Set GEE_PROJECT_ID and GEE_SERVICE_ACCOUNT.",
        "is_mock": True,
        "capabilities": [
            "Sentinel-1 SAR flood detection",
            "Sentinel-2 optical imagery",
            "Landsat surface reflectance",
            "GPM rainfall",
            "JRC water occurrence",
        ],
    })


@router.get("/sentinel1")
async def get_sentinel1():
    return JSONResponse({
        "is_mock": True,
        "source": "Sentinel-1 SAR",
        "status": "NOT_CONFIGURED",
        "message": "Real Sentinel-1 data requires GEE credentials.",
        "mock_data": {
            "acquisition_date": "2024-06-15",
            "orbit": "ascending",
            "polarization": "VV+VH",
            "resolution_m": 10,
            "coverage_km2": 2500,
        }
    })


@router.get("/sentinel2")
async def get_sentinel2():
    return JSONResponse({
        "is_mock": True,
        "source": "Sentinel-2 MSI",
        "status": "NOT_CONFIGURED",
        "mock_data": {
            "acquisition_date": "2024-06-14",
            "cloud_cover_pct": 12.5,
            "bands": ["B2", "B3", "B4", "B8", "B11", "B12"],
        }
    })


@router.get("/rainfall")
async def get_rainfall():
    return JSONResponse({
        "is_mock": True,
        "source": "GPM IMERG",
        "status": "NOT_CONFIGURED",
        "mock_data": {
            "period": "Last 72 hours",
            "max_rainfall_mm": 245.0,
            "avg_rainfall_mm": 89.0,
            "basin_total_mm": 125.0,
        }
    })


@router.get("/water-extent")
async def get_water_extent():
    return JSONResponse({
        "is_mock": True,
        "source": "JRC Global Surface Water",
        "status": "NOT_CONFIGURED",
        "mock_data": {
            "permanent_water_km2": 12.5,
            "seasonal_water_km2": 8.3,
            "flood_extent_km2": 45.2,
            "change_pct": 261.0,
        }
    })


@router.get("/flood-change")
async def flood_change():
    return JSONResponse({
        "is_mock": True,
        "method": "SAR change detection (mock)",
        "status": "NOT_CONFIGURED",
        "mock_result": {
            "pre_flood_date": "2024-06-10",
            "post_flood_date": "2024-06-17",
            "detected_flood_km2": 43.8,
            "confidence": "MOCK",
            "change_detected": True,
        }
    })
