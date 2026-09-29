from fastapi import APIRouter

router = APIRouter()

@router.get("/sph")
def get_sph_info():
    return {
        "status": "ready",
        "version": "mock-1.0",
        "capabilities": ["dam_break", "flood_propagation"],
        "is_mock": True
    }

@router.get("/delft3d")
def get_delft3d_info():
    return {
        "status": "ready",
        "version": "mock-1.0",
        "capabilities": ["hydrodynamics", "sediment_transport"],
        "is_mock": True
    }

@router.get("")
def get_all_models():
    return {
        "sph": get_sph_info(),
        "delft3d": get_delft3d_info()
    }
