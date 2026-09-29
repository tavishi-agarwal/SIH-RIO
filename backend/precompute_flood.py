"""Warm the flood raster cache ahead of the first request.

Reprojecting the HEC-RAS rasters and computing full-resolution statistics is the
most expensive thing the backend does. On a host with a limited CPU quota you do
not want a web request to trigger it, so run this once at build/startup time:

    cd backend && python precompute_flood.py

Everything it produces is written to storage/flood_cache/ and is then served
byte-for-byte by the web app with no further CPU cost.

Re-run it (or delete storage/flood_cache/) whenever the rasters change.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.flood.raster_pipeline import STATES, flood_pipeline  # noqa: E402


def main() -> None:
    print(f"raster dir : {flood_pipeline.raster_dir}")
    print(f"cache dir  : {flood_pipeline.cache_dir}")

    t0 = time.time()
    inv = flood_pipeline.inventory(force=True)
    print(f"inventory  : {time.time() - t0:.1f}s")
    for f in inv["files"]:
        status = "ok" if f.get("readable") else f"UNREADABLE ({f.get('error')})"
        print(f"  - {f['file'][:50]:<50} {status}")

    for state in STATES:
        if state == "depth_max_vrt":
            continue  # known-broken VRT: source TIFF is not in resources/
        t1 = time.time()
        try:
            meta = flood_pipeline.process_state(state, force=True)
            print(
                f"{state:<14} {time.time() - t1:5.1f}s  "
                f"grid={meta['shape']}  bounds={[round(b, 4) for b in meta['bounds_lonlat']]}"
            )
        except Exception as exc:
            print(f"{state:<14} FAILED: {exc}")

    print(f"total      : {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
