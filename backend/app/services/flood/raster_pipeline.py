"""
FloodRasterPipeline — parses the REAL HEC-RAS 2D simulation outputs found in
the project's `resources/` directory and converts them into WebGL-ready
artifacts (reprojected grids + color-mapped PNGs + stats).

NO synthetic data is generated anywhere in this module. Every value served to
the frontend is read from the supplied rasters (unit-converted and/or
reprojected, never invented).

Source data (verified 2026-09-29):
  CRS:      EPSG:2271  NAD83 / Pennsylvania North (ftUS), Lambert Conformal Conic
  Units:    US survey feet (horizontal AND vertical)
  Cell:     10 ft x 10 ft
  NoData:   -9999
  Domain:   ~117,760 ft x 84,480 ft  (~35.9 km x 25.7 km)
  Lon/Lat:  W -77.7808  S 40.9488  E -77.3064  N 41.1956
            (West Branch Susquehanna River area, north-central Pennsylvania, USA)
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

try:
    import rasterio
    from rasterio.crs import CRS
    from rasterio.warp import calculate_default_transform, reproject, Resampling
    from rasterio.warp import transform_bounds as rio_transform_bounds
    RASTERIO_OK = True
except Exception:  # pragma: no cover
    RASTERIO_OK = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
FT_TO_M = 0.304800609601219  # US survey foot -> metre (EPSG:9003)

# The four supplied files. `file` is matched case-sensitively against the
# resources directory. `kind` drives unit handling and colour mapping.
STATES: Dict[str, Dict[str, Any]] = {
    "depth_t26": {
        "file": "Depth (01JAN2222 00 26 00)vrt.Terrain.BEC.tif",
        "label": "Flood depth @ t = 00:26:00",
        "kind": "depth",
        "description": "Instantaneous water depth snapshot 26 minutes into the "
                       "simulation (HEC-RAS 'Depth (01JAN2222 00 26 00)' output).",
    },
    "depth_max": {
        "file": "Depth (Max).Terrain.BEC.tif",
        "label": "Maximum flood depth (envelope)",
        "kind": "depth",
        "description": "Maximum water depth reached at every cell over the whole "
                       "simulation (HEC-RAS 'Depth (Max)' output).",
    },
    "wse_min": {
        "file": "WSE (Min)wse.Terrain.BEC.tif",
        "label": "Minimum water surface elevation",
        "kind": "wse",
        "description": "Minimum water surface elevation per cell (HEC-RAS "
                       "'WSE (Min)' output). Approximates channel/floodplain "
                       "ground elevation inside the wetted domain.",
    },
    # The fourth file. A GDAL VRT whose underlying source TIFF
    # ("Depth (Max) (2)twoesep.Terrain.BEC.tif") is NOT present in resources/,
    # so the VRT itself cannot be read. Its embedded metadata is still parsed
    # and reported so the user can see exactly what it contains.
    "depth_max_vrt": {
        "file": "Depth (Max) (2)twoesep.vrt",
        "label": "Maximum depth (VRT, source missing)",
        "kind": "depth",
        "description": "GDAL virtual raster pointing at a Depth (Max) GeoTIFF "
                       "that is missing from resources/ — flagged as unreadable.",
    },
}

CACHE_DIR_NAME = "flood_cache"
MAX_IMG_EDGE = 1024  # px, longest edge of the reprojected display grid


# ---------------------------------------------------------------------------
# Colour maps (display only — the underlying values stay numeric)
# ---------------------------------------------------------------------------
def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _piecewise(stops, v: float):
    """stops: [(value, (r,g,b,a)), ...] sorted by value."""
    if v <= stops[0][0]:
        return stops[0][1]
    for (v0, c0), (v1, c1) in zip(stops, stops[1:]):
        if v <= v1:
            t = (v - v0) / (v1 - v0) if v1 > v0 else 0.0
            return tuple(int(round(_lerp(c0[i], c1[i], t))) for i in range(4))
    return stops[-1][1]


# Depth ramp in METRES (fixed scale so all depth states share one legend)
DEPTH_STOPS = [
    (0.0, (186, 225, 255, 60)),
    (0.5, (115, 198, 255, 110)),
    (1.0, (65, 165, 245, 150)),
    (2.0, (33, 120, 220, 185)),
    (4.0, (18, 78, 180, 215)),
    (8.0, (10, 45, 140, 235)),
    (12.0, (6, 25, 105, 245)),
    (17.5, (4, 12, 70, 250)),
]

# WSE ramp in METRES (elevation-style, for the WSE (Min) layer)
WSE_STOPS = [
    (160.0, (44, 160, 44, 180)),
    (170.0, (120, 198, 121, 190)),
    (180.0, (230, 220, 120, 200)),
    (190.0, (200, 140, 60, 210)),
    (200.0, (170, 80, 40, 220)),
    (220.0, (245, 245, 245, 230)),
]


def _depth_rgba(grid_m: np.ndarray) -> np.ndarray:
    """Vectorised depth (metres) -> RGBA uint8."""
    h, w = grid_m.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    valid = np.isfinite(grid_m) & (grid_m > 0.0)
    v = np.clip(np.nan_to_num(grid_m, nan=0.0), 0.0, 17.5)
    vals = np.array([s[0] for s in DEPTH_STOPS], dtype=np.float32)
    cols = np.array([s[1] for s in DEPTH_STOPS], dtype=np.float32)
    idx = np.searchsorted(vals, v, side="right") - 1
    idx = np.clip(idx, 0, len(vals) - 2)
    v0, v1 = vals[idx], vals[idx + 1]
    t = np.where(v1 > v0, (v - v0) / np.where(v1 > v0, v1 - v0, 1.0), 0.0)[..., None]
    c = cols[idx] * (1 - t) + cols[idx + 1] * t
    out[..., :] = np.clip(c, 0, 255).astype(np.uint8)
    out[~valid] = (0, 0, 0, 0)
    return out


def _wse_rgba(grid_m: np.ndarray) -> np.ndarray:
    h, w = grid_m.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    valid = np.isfinite(grid_m)
    v = np.clip(np.nan_to_num(grid_m, nan=160.0), 160.0, 220.0)
    vals = np.array([s[0] for s in WSE_STOPS], dtype=np.float32)
    cols = np.array([s[1] for s in WSE_STOPS], dtype=np.float32)
    idx = np.searchsorted(vals, v, side="right") - 1
    idx = np.clip(idx, 0, len(vals) - 2)
    v0, v1 = vals[idx], vals[idx + 1]
    t = np.where(v1 > v0, (v - v0) / np.where(v1 > v0, v1 - v0, 1.0), 0.0)[..., None]
    c = cols[idx] * (1 - t) + cols[idx + 1] * t
    out[..., :] = np.clip(c, 0, 255).astype(np.uint8)
    out[~valid] = (0, 0, 0, 0)
    return out


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
class FloodRasterPipeline:
    def __init__(self, raster_dir: Optional[str] = None, cache_dir: Optional[str] = None):
        self.raster_dir = self._resolve_raster_dir(raster_dir)
        base = Path(__file__).resolve().parents[3]  # .../backend
        self.cache_dir = Path(cache_dir) if cache_dir else base / "storage" / CACHE_DIR_NAME
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._inventory_cache: Optional[Dict[str, Any]] = None

    # -- location -----------------------------------------------------------
    @staticmethod
    def _resolve_raster_dir(raster_dir: Optional[str]) -> Optional[Path]:
        """Env var wins; otherwise walk up from this file looking for a
        `resources/` folder that contains at least one known raster."""
        env = raster_dir or os.environ.get("FLOOD_RASTER_DIR")
        if env and Path(env).is_dir():
            return Path(env)
        known = [s["file"] for s in STATES.values()]
        for parent in Path(__file__).resolve().parents:
            cand = parent / "resources"
            if cand.is_dir() and any((cand / k).exists() for k in known):
                return cand
        return Path(env) if env else None

    # -- inventory ----------------------------------------------------------
    def inventory(self, force: bool = False) -> Dict[str, Any]:
        """Inventory of the source rasters.

        The full-resolution block-wise stats are expensive (tens of CPU
        seconds on the ~100M-cell rasters), so the result is cached BOTH in
        memory and on disk (`storage/flood_cache/inventory.json`). On a host
        with a CPU quota, run `precompute_flood.py` once from a console and
        then just serve the cached JSON.
        """
        if os.environ.get("FLOOD_REFRESH_INVENTORY") == "1":
            force = True
        if not force and self._inventory_cache is not None:
            return self._inventory_cache
        cache_file = self.cache_dir / "inventory.json"
        current_dir = str(self.raster_dir) if self.raster_dir else None
        if not force and cache_file.exists():
            try:
                cached = json.loads(cache_file.read_text())
                if cached.get("raster_dir") == current_dir:
                    self._inventory_cache = cached
                    return cached
            except Exception:
                pass  # stale/corrupt cache -> recompute
        files: List[Dict[str, Any]] = []
        for key, spec in STATES.items():
            entry: Dict[str, Any] = {"state": key, "file": spec["file"],
                                     "label": spec["label"], "kind": spec["kind"],
                                     "description": spec["description"]}
            path = (self.raster_dir / spec["file"]) if self.raster_dir else None
            entry["exists"] = bool(path and path.exists())
            if not entry["exists"]:
                entry["readable"] = False
                entry["error"] = "file not found in resources/"
                files.append(entry)
                continue
            if not RASTERIO_OK:
                entry["readable"] = False
                entry["error"] = "rasterio not installed"
                files.append(entry)
                continue
            try:
                with rasterio.open(str(path)) as ds:
                    b = ds.bounds
                    stats = self._band_stats(ds)
                    entry.update({
                        "readable": True,
                        "crs": ds.crs.to_string() if ds.crs else None,
                        "epsg": ds.crs.to_epsg() if ds.crs else None,
                        "width": ds.width, "height": ds.height,
                        "res_ft": [ds.res[0], ds.res[1]],
                        "nodata": ds.nodata,
                        "bounds_epsg2271_ft": [b.left, b.bottom, b.right, b.top],
                        "bounds_lonlat": list(rio_transform_bounds(ds.crs, "EPSG:4326", *b)),
                        "stats_native_ft": stats["native"],
                        "stats_m": stats["m"],
                        "valid_fraction": stats["valid_fraction"],
                        "flooded_area_km2": stats["flooded_area_km2"],
                    })
            except Exception as e:  # e.g. the broken VRT
                entry["readable"] = False
                entry["error"] = str(e).strip() or "unreadable"
                # For the VRT we can still surface its embedded XML metadata
                if spec["file"].lower().endswith(".vrt"):
                    entry["vrt_metadata"] = self._parse_vrt(path)
            files.append(entry)
        self._inventory_cache = {"raster_dir": current_dir, "files": files}
        try:
            cache_file.write_text(json.dumps(self._inventory_cache))
        except Exception:
            pass  # read-only cache dir — in-memory cache still works
        return self._inventory_cache

    @staticmethod
    def _parse_vrt(path: Path) -> Dict[str, Any]:
        import xml.etree.ElementTree as ET
        try:
            root = ET.parse(str(path)).getroot()
            band = root.find("VRTRasterBand")
            md = band.find("Metadata") if band is not None else None
            stats = {m.get("key"): float(m.text) for m in (md.findall("MDI") if md is not None else [])}
            src = band.find("ComplexSource/SourceFilename") if band is not None else None
            return {
                "raster_size": [int(root.get("rasterXSize")), int(root.get("rasterYSize"))],
                "srs": (root.findtext("SRS") or "")[:80] + "...",
                "geotransform": root.findtext("GeoTransform"),
                "source_filename": src.text if src is not None else None,
                "statistics_ft": stats,
            }
        except Exception as e:
            return {"parse_error": str(e)}

    @staticmethod
    def _band_stats(ds) -> Dict[str, Any]:
        """Block-wise full-resolution stats — memory safe on the 400 MB rasters."""
        nodata = ds.nodata
        n = 0
        s = 0.0
        s_min = np.inf
        s_max = -np.inf
        for _, window in ds.block_windows(1):
            arr = ds.read(1, window=window)
            if nodata is not None:
                arr = arr[arr != nodata]
            arr = arr[np.isfinite(arr)]
            if arr.size:
                n += arr.size
                s += float(arr.sum())
                s_min = min(s_min, float(arr.min()))
                s_max = max(s_max, float(arr.max()))
        total = ds.width * ds.height
        cell_m2 = abs(ds.res[0] * ds.res[1]) * FT_TO_M * FT_TO_M
        native = {
            "min": float(s_min) if n else None,
            "max": float(s_max) if n else None,
            "mean": (s / n) if n else None,
        }
        conv = FT_TO_M  # both depth and wse are in feet here
        stats_m = {k: (v * conv if v is not None else None) for k, v in native.items()}
        return {
            "native": native, "m": stats_m,
            "valid_fraction": (n / total) if total else 0.0,
            "flooded_area_km2": round(n * cell_m2 / 1e6, 3),
        }

    # -- processing ---------------------------------------------------------
    def process_state(self, state: str, force: bool = False) -> Dict[str, Any]:
        """Reproject + downsample + colour-map one state. Cached on disk."""
        if state not in STATES:
            raise KeyError(f"unknown state '{state}'")
        png_path = self.cache_dir / f"{state}.png"
        meta_path = self.cache_dir / f"{state}.json"
        grid_path = self.cache_dir / f"{state}.f32"
        if not force and png_path.exists() and meta_path.exists() and grid_path.exists():
            return json.loads(meta_path.read_text())

        if not RASTERIO_OK:
            raise RuntimeError("rasterio not installed")
        spec = STATES[state]
        src_path = self.raster_dir / spec["file"] if self.raster_dir else None
        if not src_path or not src_path.exists():
            raise FileNotFoundError(spec["file"])

        with rasterio.open(str(src_path)) as ds:
            decim = max(1, int(np.ceil(max(ds.width, ds.height) / MAX_IMG_EDGE)))
            out_h, out_w = ds.height // decim, ds.width // decim
            small = ds.read(1, out_shape=(out_h, out_w), resampling=Resampling.bilinear).astype("float32")
            nodata = ds.nodata
            if nodata is not None:
                small[small == nodata] = np.nan
            small *= FT_TO_M  # feet -> metres

            dst_crs = CRS.from_epsg(4326)
            transform, width, height = calculate_default_transform(
                ds.crs, dst_crs, ds.width, ds.height, *ds.bounds,
                dst_width=out_w, dst_height=out_h,
            )
            grid = np.full((height, width), np.nan, dtype="float32")
            reproject(small, grid,
                      src_transform=ds.transform * ds.transform.scale(ds.width / out_w, ds.height / out_h),
                      src_crs=ds.crs, src_nodata=np.nan,
                      dst_transform=transform, dst_crs=dst_crs, dst_nodata=np.nan,
                      resampling=Resampling.bilinear)

        left, top = transform.c, transform.f
        right = left + width * transform.a
        bottom = top + height * transform.e
        bounds = [left, bottom, right, top]
        coords = [[left, top], [right, top], [right, bottom], [left, bottom]]

        rgba = _depth_rgba(grid) if spec["kind"] == "depth" else _wse_rgba(grid)
        self._write_png(rgba, png_path)
        grid.tofile(str(grid_path))

        valid = np.isfinite(grid)
        positive = valid & (grid > 0)
        meta = {
            "state": state,
            "label": spec["label"],
            "kind": spec["kind"],
            "source_file": spec["file"],
            "units": "metres (converted from US survey feet)",
            "shape": [int(height), int(width)],
            "bounds_lonlat": bounds,
            "maplibre_coordinates": coords,  # tl, tr, br, bl
            "stats_m": {
                "min": float(np.nanmin(grid)) if valid.any() else None,
                "max": float(np.nanmax(grid)) if valid.any() else None,
                "mean": float(np.nanmean(grid)) if valid.any() else None,
            },
            "valid_cells": int(valid.sum()),
            "wet_cells": int(positive.sum()) if spec["kind"] == "depth" else int(valid.sum()),
            "image_url": f"/api/flood/state/{state}/image.png",
            "grid_url": f"/api/flood/state/{state}/grid",
        }
        meta_path.write_text(json.dumps(meta))
        return meta

    @staticmethod
    def _write_png(rgba: np.ndarray, path: Path) -> None:
        from PIL import Image
        Image.fromarray(rgba, mode="RGBA").save(str(path), optimize=True)

    # -- cached artefact accessors -----------------------------------------
    def png_path(self, state: str) -> Path:
        self.process_state(state)
        return self.cache_dir / f"{state}.png"

    def grid_summary(self, state: str, max_rows: int = 96) -> Dict[str, Any]:
        """Small decimated grid (metres) + stats for frontend validation."""
        meta = self.process_state(state)
        h, w = meta["shape"]
        grid = np.fromfile(str(self.cache_dir / f"{state}.f32"), dtype="float32").reshape(h, w)
        step = max(1, h // max_rows)
        small = grid[::step, ::step]
        small = np.where(np.isfinite(small), np.round(small, 3), None)
        return {"meta": meta, "sample_grid": small.tolist(),
                "sample_note": f"every {step}-th cell, metres, null = NoData"}


# Singleton used by the API layer
flood_pipeline = FloodRasterPipeline()
