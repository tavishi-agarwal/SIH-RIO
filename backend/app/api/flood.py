"""Flood API — serves REAL HEC-RAS raster outputs to the 3D viewer.

All values originate from the four files in resources/ (EPSG:2271, US survey
feet). Depths/WSE are converted to metres and reprojected to EPSG:4326 for
map alignment. Nothing here is synthetic.

Also serves the user's real HEC-RAS screen recordings from recordings/ as an
alternative video view of the same simulation.
"""
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse

from ..services.flood import flood_pipeline

router = APIRouter()

VIDEO_EXTS = {".mp4", ".webm", ".mov", ".mkv", ".m4v"}
VIDEO_MIME = {
    ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm",
    ".mov": "video/quicktime", ".mkv": "video/x-matroska",
}


def _recordings_dir() -> Optional[Path]:
    """Env var wins; otherwise the `recordings/` folder next to `resources/`."""
    env = os.environ.get("FLOOD_RECORDINGS_DIR")
    if env and Path(env).is_dir():
        return Path(env)
    rd = flood_pipeline.raster_dir
    if rd:
        cand = rd.parent / "recordings"
        if cand.is_dir():
            return cand
    return None


@router.get("/videos")
async def list_videos():
    """Auto-discover video files in recordings/ — new files appear on reload."""
    d = _recordings_dir()
    videos = []
    if d:
        for p in sorted(d.iterdir(), key=lambda x: x.stat().st_mtime):
            if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
                videos.append({
                    "name": p.name,
                    "size_mb": round(p.stat().st_size / 1e6, 1),
                    "url": f"/api/flood/videos/file/{p.name}",
                })
    return {
        "recordings_dir": str(d) if d else None,
        "videos": videos,
        "note": "Drop .mp4/.webm files into this folder — they appear here automatically.",
    }


@router.get("/videos/file/{filename:path}")
async def stream_video(filename: str, request: Request):
    d = _recordings_dir()
    if not d:
        raise HTTPException(status_code=404, detail="recordings/ folder not found")
    path = (d / filename).resolve()
    base = d.resolve()
    if path != base and base not in path.parents:
        raise HTTPException(status_code=403, detail="path outside recordings/")
    if not path.is_file() or path.suffix.lower() not in VIDEO_EXTS:
        raise HTTPException(status_code=404, detail="video not found")

    media_type = VIDEO_MIME[path.suffix.lower()]
    file_size = path.stat().st_size

    # Starlette <0.39 FileResponse has no Range support, which breaks seeking in
    # the player. Handle `Range: bytes=start-end` ourselves and return 206.
    range_header = request.headers.get("range")
    if range_header and range_header.lower().startswith("bytes="):
        try:
            start_s, _, end_s = range_header[6:].partition("-")
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else file_size - 1
            end = min(end, file_size - 1)
            if start > end or start >= file_size:
                return Response(
                    status_code=416,
                    headers={"Content-Range": f"bytes */{file_size}"},
                )
            length = end - start + 1

            def _iter():
                with open(path, "rb") as f:
                    f.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk = f.read(min(1024 * 1024, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk

            return StreamingResponse(
                _iter(),
                status_code=206,
                media_type=media_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(length),
                },
            )
        except ValueError:
            pass  # malformed Range -> fall back to a full response

    return FileResponse(
        str(path), media_type=media_type, headers={"Accept-Ranges": "bytes"}
    )


@router.get("/meta")
async def flood_meta():
    """Inventory of the four source files + processing state for each.

    This is the single entry point the 3D viewer uses to discover what data
    actually exists on disk (including the broken VRT, which is reported as
    unreadable rather than silently replaced).
    """
    inv = flood_pipeline.inventory()
    states = {}
    for f in inv["files"]:
        name = f["state"]
        if not f.get("readable"):
            states[name] = {
                "label": f["label"], "kind": f["kind"], "available": False,
                "error": f.get("error"), "vrt_metadata": f.get("vrt_metadata"),
            }
            continue
        try:
            states[name] = {**flood_pipeline.process_state(name), "available": True}
        except Exception as e:
            states[name] = {"label": f["label"], "kind": f["kind"],
                            "available": False, "error": str(e)}
    return {
        "data_source": "HEC-RAS 2D model outputs (resources/*.tif, *.vrt)",
        "crs_native": "EPSG:2271 — NAD83 / Pennsylvania North (ftUS), Lambert Conformal Conic",
        "units_native": "US survey feet (horizontal + vertical)",
        "units_served": "metres; geographic coordinates EPSG:4326",
        "raster_dir": inv["raster_dir"],
        "files": inv["files"],
        "states": states,
        "terrain_source": {
            "type": "external DEM (real)",
            "provider": "Terrain Tiles (Terrarium encoding) — AWS Open Data, "
                        "USGS 3DEP / NED + other national DEM sources",
            "url_template": "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            "note": "The four files only cover the ~1% wetted domain. Full-domain "
                    "terrain is draped from this real DEM; in-channel elevations "
                    "are additionally available from the WSE (Min) file.",
        },
    }


@router.get("/state/{state}/image.png")
async def flood_state_image(state: str):
    try:
        path = flood_pipeline.png_path(state)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"unknown state '{state}'")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"source file missing: {e}")
    return FileResponse(str(path), media_type="image/png")


@router.get("/state/{state}/grid")
async def flood_state_grid(state: str):
    try:
        return flood_pipeline.grid_summary(state)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"unknown state '{state}'")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"source file missing: {e}")
