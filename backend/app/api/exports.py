"""Exports API router."""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from ..config import settings

router = APIRouter()


@router.get("")
async def list_exports():
    """List all available export files."""
    exports_base = os.path.join(settings.STORAGE_PATH, "projects")
    result = []
    if os.path.exists(exports_base):
        for sim_id in os.listdir(exports_base):
            exports_dir = os.path.join(exports_base, sim_id, "exports")
            if os.path.exists(exports_dir):
                for model in os.listdir(exports_dir):
                    model_dir = os.path.join(exports_dir, model)
                    if os.path.isdir(model_dir):
                        for fname in os.listdir(model_dir):
                            fpath = os.path.join(model_dir, fname)
                            if os.path.isfile(fpath):
                                result.append({
                                    "simulation_id": sim_id,
                                    "model": model.upper(),
                                    "filename": fname,
                                    "format": os.path.splitext(fname)[1].upper().lstrip("."),
                                    "size_bytes": os.path.getsize(fpath),
                                    "path": fpath,
                                })
    return JSONResponse({"exports": result, "total": len(result)})


@router.get("/download")
async def download_export(path: str):
    """Download an export file by path."""
    # Security: ensure path is within storage
    abs_path = os.path.abspath(path)
    storage_abs = os.path.abspath(settings.STORAGE_PATH)
    if not abs_path.startswith(storage_abs):
        raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(abs_path, filename=os.path.basename(abs_path))
