#!/usr/bin/env python3
"""
Generate all synthetic demo data for the HADR Flood Simulation Platform.

Run: python scripts/generate_demo_data.py

Generates:
  demo/
    dem/          - Synthetic DEM GeoTIFF (128x128)
    hillshade/    - Hillshade raster
    river/        - River GeoJSON
    dam/          - Dam metadata JSON
    reservoir/    - Reservoir GeoJSON
    hydrology/    - Hydrological time series CSV
    settlements/  - Settlements GeoJSON
    roads/        - Roads GeoJSON
    buildings/    - Buildings GeoJSON
    agriculture/  - Agriculture GeoJSON
    infrastructure/ - Infrastructure GeoJSON
    metadata/     - Dataset metadata JSON

Study area: Synthetic Himalayan Foothill style
Coordinates: ~30.2-30.4°N, 79.8-80.1°E (Uttarakhand-inspired)

IMPORTANT: This is SYNTHETIC DEMONSTRATION DATA.
Do not use as real geospatial data.
"""

import os
import sys
import json
import math
import csv
from datetime import datetime, timedelta
import numpy as np

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Output directory
DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo")

# Study area parameters
BOUNDS = {
    "min_lon": 79.80, "min_lat": 30.20,
    "max_lon": 80.10, "max_lat": 30.40
}
DAM_LON = 79.85
DAM_LAT = 30.35
GRID_ROWS = 128
GRID_COLS = 128
CRS = "EPSG:4326"

# Random seed for reproducibility
np.random.seed(42)


def makedirs(*paths):
    for p in paths:
        os.makedirs(p, exist_ok=True)


def generate_synthetic_dem() -> np.ndarray:
    """Generate a realistic Himalayan-foothill style DEM."""
    lon_arr = np.linspace(BOUNDS["min_lon"], BOUNDS["max_lon"], GRID_COLS)
    lat_arr = np.linspace(BOUNDS["max_lat"], BOUNDS["min_lat"], GRID_ROWS)
    lon_grid, lat_grid = np.meshgrid(lon_arr, lat_arr)

    # Dam position in pixel coordinates
    dam_col_f = (DAM_LON - BOUNDS["min_lon"]) / (BOUNDS["max_lon"] - BOUNDS["min_lon"]) * GRID_COLS
    dam_row_f = (BOUNDS["max_lat"] - DAM_LAT) / (BOUNDS["max_lat"] - BOUNDS["min_lat"]) * GRID_ROWS

    # Base elevation: high north (mountains), low south (floodplain)
    row_idx = np.arange(GRID_ROWS)[:, None]
    col_idx = np.arange(GRID_COLS)[None, :]
    base = 600.0 + 1600.0 * (lat_arr[:, None] - BOUNDS["min_lat"]) / (BOUNDS["max_lat"] - BOUNDS["min_lat"])

    # River valley depression centred on dam_col
    dist_col = col_idx - dam_col_f
    valley_width = GRID_COLS * 0.07
    valley = np.exp(-0.5 * (dist_col / valley_width) ** 2) * 280.0

    # Valley broadens downstream
    downstream = np.clip((row_idx - dam_row_f) / GRID_ROWS, 0, 1)
    broader_valley = np.exp(-0.5 * (dist_col / (valley_width * (1 + 3 * downstream))) ** 2) * 280.0

    # Lateral hills
    hills = (
        120.0 * np.sin(np.pi * (lon_grid - BOUNDS["min_lon"]) / (BOUNDS["max_lon"] - BOUNDS["min_lon"]) * 3)
        + 80.0 * np.cos(np.pi * (lat_grid - BOUNDS["min_lat"]) / (BOUNDS["max_lat"] - BOUNDS["min_lat"]) * 4)
    )

    # Small-scale terrain roughness (reproducible)
    rng = np.random.default_rng(42)
    roughness = rng.uniform(-30, 30, (GRID_ROWS, GRID_COLS))

    dem = base - broader_valley + hills + roughness
    dem = np.clip(dem, 550.0, 2600.0)

    # Reservoir: elevated water body upstream of dam
    upstream_mask = row_idx < (dam_row_f + 3)
    reservoir_mask = upstream_mask & (np.abs(dist_col) < GRID_COLS * 0.08)
    dem = np.where(reservoir_mask, np.maximum(dem, 1190.0), dem)

    return dem.astype(np.float32)


def generate_hillshade(dem: np.ndarray, resolution_m: float = 30.0) -> np.ndarray:
    """Generate hillshade from DEM. Sun azimuth 315°, zenith 45°."""
    az = math.radians(315.0)
    ze = math.radians(45.0)
    dy, dx = np.gradient(dem, resolution_m, resolution_m)
    slope = np.arctan(np.sqrt(dx**2 + dy**2))
    aspect = np.arctan2(-dy, dx)
    hillshade = (
        np.cos(ze) * np.cos(slope)
        + np.sin(ze) * np.sin(slope) * np.cos(az - aspect)
    )
    hillshade = np.clip(hillshade * 255, 0, 255).astype(np.uint8)
    return hillshade


def generate_slope(dem: np.ndarray, resolution_m: float = 30.0) -> np.ndarray:
    """Generate slope in degrees."""
    dy, dx = np.gradient(dem, resolution_m, resolution_m)
    slope = np.degrees(np.arctan(np.sqrt(dx**2 + dy**2)))
    return slope.astype(np.float32)


def save_raster_geotiff(array, path, transform_params, crs_str="EPSG:4326", nodata=-9999.0):
    """Save a numpy array as GeoTIFF. Falls back to NPY if rasterio unavailable."""
    try:
        import rasterio
        from rasterio.transform import from_bounds
        from rasterio.crs import CRS
        transform = from_bounds(
            BOUNDS["min_lon"], BOUNDS["min_lat"],
            BOUNDS["max_lon"], BOUNDS["max_lat"],
            array.shape[1], array.shape[0]
        )
        crs = CRS.from_string(crs_str)
        with rasterio.open(
            path, "w",
            driver="GTiff",
            height=array.shape[0],
            width=array.shape[1],
            count=1,
            dtype=array.dtype,
            crs=crs,
            transform=transform,
            nodata=nodata,
            compress="lzw",
        ) as dst:
            dst.write(array, 1)
            dst.update_tags(
                SOURCE="HADR Synthetic Demo Data",
                DISCLAIMER="Synthetic demonstration data — not real terrain",
                STUDY_AREA="Synthetic Himalayan Foothill",
                CRS=crs_str,
                GENERATED_AT=datetime.utcnow().isoformat(),
            )
        print(f"  Saved GeoTIFF: {path}")
    except ImportError:
        np_path = path.replace(".tif", ".npy")
        np.save(np_path, array)
        print(f"  rasterio unavailable — saved NPY: {np_path}")


def generate_river_geojson() -> dict:
    """Generate realistic curved river GeoJSON."""
    # Main river: flows from dam southward with curves
    river_points = []
    n = 30
    for i in range(n):
        t = i / (n - 1)
        lon = DAM_LON + t * 0.22 + 0.015 * math.sin(t * math.pi * 4)
        lat = DAM_LAT - t * 0.14
        river_points.append([round(lon, 6), round(lat, 6)])

    # River polygon (buffer the centerline)
    def offset_line(pts, offset_deg):
        out = []
        for i, p in enumerate(pts):
            if i < len(pts) - 1:
                dx = pts[i+1][0] - p[0]
                dy = pts[i+1][1] - p[1]
                length = math.sqrt(dx**2 + dy**2) or 1e-9
                nx, ny = -dy/length, dx/length
                out.append([round(p[0] + nx * offset_deg, 6), round(p[1] + ny * offset_deg, 6)])
            else:
                out.append(out[-1] if out else p)
        return out

    offset = 0.003
    left_bank = offset_line(river_points, offset)
    right_bank = offset_line(river_points, -offset)
    polygon_ring = left_bank + list(reversed(right_bank)) + [left_bank[0]]

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": river_points},
                "properties": {
                    "name": "Demo Himalayan Tributary",
                    "type": "river_centerline",
                    "length_km": 28.5,
                    "is_demo": True,
                }
            },
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [polygon_ring]},
                "properties": {
                    "name": "Demo Himalayan Tributary",
                    "type": "river_polygon",
                    "width_m_avg": 45,
                    "is_demo": True,
                }
            }
        ],
        "metadata": {
            "is_demo": True,
            "label": "Synthetic Demo River — Not real river data",
            "crs": CRS,
        }
    }


def generate_dam_json() -> dict:
    return {
        "name": "Demo Himalayan Reservoir Dam",
        "type": "Gravity Dam",
        "coordinates": [DAM_LON, DAM_LAT],
        "height_m": 85.0,
        "crest_elevation_m": 1200.0,
        "reservoir_elevation_m": 1200.0,
        "reservoir_area_km2": 4.5,
        "reservoir_volume_mcm": 150.0,
        "normal_water_level_m": 1180.0,
        "max_water_level_m": 1195.0,
        "minimum_draw_down_level_m": 1140.0,
        "downstream_river": "Demo Himalayan Tributary",
        "construction_year": 1985,
        "purpose": ["Hydropower", "Irrigation", "Flood Control"],
        "hydropower_capacity_mw": 120.0,
        "spillway_type": "Ogee Weir",
        "spillway_design_discharge_m3s": 5500.0,
        "is_demo": True,
        "label": "DEMO DATA — Synthetic demonstration dam. Not a real structure.",
    }


def generate_reservoir_geojson() -> dict:
    """Generate reservoir polygon upstream of dam."""
    # Reservoir: elliptical shape upstream of dam
    center_lon = DAM_LON - 0.02
    center_lat = DAM_LAT + 0.03
    a_lon = 0.045  # semi-axis E-W
    b_lat = 0.025  # semi-axis N-S
    n_pts = 32
    coords = []
    for i in range(n_pts + 1):
        theta = 2 * math.pi * i / n_pts
        lon = center_lon + a_lon * math.cos(theta)
        lat = center_lat + b_lat * math.sin(theta)
        coords.append([round(lon, 6), round(lat, 6)])
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": {
                    "name": "Demo Himalayan Reservoir",
                    "water_surface_elevation_m": 1195.0,
                    "area_km2": 4.5,
                    "volume_mcm": 150.0,
                    "max_depth_m": 65.0,
                    "is_demo": True,
                }
            }
        ],
        "metadata": {"is_demo": True, "label": "Synthetic Reservoir"}
    }


def generate_hydrology_csv(output_path: str):
    """Generate 72-hour hydrological time series CSV."""
    start_time = datetime(2024, 6, 15, 0, 0, 0)
    rows = []
    for hour in range(72):
        ts = start_time + timedelta(hours=hour)
        if hour < 24:
            # Normal flow
            discharge = 52.0 + np.random.uniform(-5, 5)
            water_level = 1180.0 + np.random.uniform(-0.2, 0.2)
            rainfall = 8.0 + np.random.uniform(0, 4)
            velocity = discharge / 95.0
        elif hour < 25:
            # Breach initiation
            discharge = 52.0 + (hour - 24) * 200
            water_level = 1180.0 + (hour - 24) * 3
            rainfall = 2.0
            velocity = discharge / 80.0
        elif hour < 28:
            # Rapid rise
            t = hour - 25
            discharge = 252.0 + t * 2200
            water_level = 1183.0 + t * 3.5
            rainfall = 1.0
            velocity = discharge / 60.0
        elif hour < 33:
            # Peak
            discharge = 6852.0 + np.random.uniform(-200, 200)
            water_level = 1193.5 + np.random.uniform(-0.5, 0.5)
            rainfall = 0.5
            velocity = discharge / 50.0
        else:
            # Recession
            t = hour - 33
            discharge = max(55.0, 7050.0 * np.exp(-0.12 * t))
            water_level = max(1181.0, 1194.0 - t * 0.8)
            rainfall = max(0, 3.0 - t * 0.2)
            velocity = discharge / 70.0

        rows.append({
            "timestamp": ts.isoformat(),
            "hour": hour,
            "discharge_m3s": round(float(discharge), 2),
            "water_level_m": round(float(water_level), 2),
            "rainfall_mm_hr": round(float(rainfall), 2),
            "velocity_ms": round(float(velocity), 3),
            "stage": ("NORMAL" if hour < 24 else
                      "BREACH_START" if hour < 26 else
                      "RAPID_RISE" if hour < 30 else
                      "PEAK" if hour < 35 else "RECESSION"),
            "is_demo": True,
        })
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Saved hydrology CSV: {output_path}")


def generate_settlements_geojson() -> dict:
    """Generate 8 synthetic villages in the study area."""
    villages = [
        {"name": "Dharchula Khand", "lon": 79.91, "lat": 30.31, "population": 1850, "households": 370},
        {"name": "Munsiyari Gaon",  "lon": 79.97, "lat": 30.27, "population": 1120, "households": 224},
        {"name": "Pithoragarh Nala","lon": 79.93, "lat": 30.24, "population": 650,  "households": 130},
        {"name": "Baram Tola",       "lon": 80.01, "lat": 30.22, "population": 480,  "households": 96},
        {"name": "Chilkiya",         "lon": 79.88, "lat": 30.28, "population": 920,  "households": 184},
        {"name": "Kanalichina",      "lon": 79.95, "lat": 30.30, "population": 340,  "households": 68},
        {"name": "Gorikunda",        "lon": 80.04, "lat": 30.25, "population": 760,  "households": 152},
        {"name": "Thal Bazaar",      "lon": 79.99, "lat": 30.23, "population": 2100, "households": 420},
    ]
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [v["lon"], v["lat"]]},
            "properties": {
                "name": v["name"],
                "population": v["population"],
                "households": v["households"],
                "type": "village",
                "is_demo": True,
            }
        }
        for v in villages
    ]
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {"is_demo": True, "total_population": sum(v["population"] for v in villages)}
    }


def generate_roads_geojson() -> dict:
    """Generate synthetic road network."""
    roads = [
        {
            "coords": [[79.80, 30.35], [79.85, 30.33], [79.92, 30.29], [79.99, 30.24], [80.08, 30.21]],
            "name": "NH-125 (Synthetic)", "road_type": "National Highway", "lanes": 2
        },
        {
            "coords": [[79.88, 30.35], [79.90, 30.30], [79.93, 30.27]],
            "name": "State Highway SH-1 (Demo)", "road_type": "State Highway", "lanes": 1
        },
        {
            "coords": [[79.91, 30.31], [79.95, 30.30]],
            "name": "Village Road A", "road_type": "Rural", "lanes": 1
        },
        {
            "coords": [[79.97, 30.27], [80.01, 30.26]],
            "name": "Village Road B", "road_type": "Rural", "lanes": 1
        },
        {
            "coords": [[79.93, 30.24], [79.95, 30.23], [80.01, 30.22]],
            "name": "Access Road", "road_type": "District", "lanes": 1
        },
    ]
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": r["coords"]},
            "properties": {
                "name": r["name"], "road_type": r["road_type"],
                "lanes": r["lanes"], "is_demo": True,
            }
        }
        for r in roads
    ]
    return {"type": "FeatureCollection", "features": features,
            "metadata": {"is_demo": True}}


def generate_buildings_geojson() -> dict:
    """Generate 50 synthetic building footprints near settlements."""
    rng = np.random.default_rng(42)
    village_centers = [
        (79.91, 30.31), (79.97, 30.27), (79.93, 30.24),
        (80.01, 30.22), (79.88, 30.28),
    ]
    features = []
    for center_lon, center_lat in village_centers:
        for _ in range(10):
            lon = center_lon + rng.uniform(-0.005, 0.005)
            lat = center_lat + rng.uniform(-0.003, 0.003)
            w = rng.uniform(0.0002, 0.0005)
            h = rng.uniform(0.0001, 0.0003)
            coords = [[
                [lon, lat], [lon+w, lat], [lon+w, lat+h], [lon, lat+h], [lon, lat]
            ]]
            features.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": coords},
                "properties": {
                    "building_type": rng.choice(["residential", "commercial", "school", "clinic"]),
                    "floors": int(rng.integers(1, 4)),
                    "is_demo": True,
                }
            })
    return {"type": "FeatureCollection", "features": features,
            "metadata": {"is_demo": True, "total_buildings": len(features)}}


def generate_infrastructure_geojson() -> dict:
    """Generate bridges, power lines, and critical infrastructure."""
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [79.91, 30.29]},
            "properties": {"name": "Demo Bridge 1", "type": "Bridge",
                           "span_m": 45, "capacity_tonnes": 15, "is_demo": True}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [79.98, 30.25]},
            "properties": {"name": "Demo Bridge 2", "type": "Bridge",
                           "span_m": 80, "capacity_tonnes": 25, "is_demo": True}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [79.94, 30.27]},
            "properties": {"name": "Demo Health Centre", "type": "hospital",
                           "beds": 12, "is_demo": True}
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [79.90, 30.32]},
            "properties": {"name": "Demo Substation", "type": "power_substation",
                           "capacity_kv": 33, "is_demo": True}
        },
        {
            "type": "Feature",
            "geometry": {"type": "LineString",
                         "coordinates": [[79.86, 30.33], [79.93, 30.28], [80.00, 30.23]]},
            "properties": {"name": "Demo 33kV Line", "type": "power_line",
                           "voltage_kv": 33, "is_demo": True}
        },
    ]
    return {"type": "FeatureCollection", "features": features,
            "metadata": {"is_demo": True}}


def generate_agriculture_geojson() -> dict:
    """Generate agricultural land polygons."""
    agri_zones = [
        {
            "name": "Rice Fields A",
            "coords": [[79.89, 30.29], [79.93, 30.29], [79.93, 30.27], [79.89, 30.27], [79.89, 30.29]],
            "crop": "Rice", "area_ha": 85
        },
        {
            "name": "Wheat Fields B",
            "coords": [[79.95, 30.26], [79.99, 30.26], [79.99, 30.24], [79.95, 30.24], [79.95, 30.26]],
            "crop": "Wheat", "area_ha": 120
        },
        {
            "name": "Orchard C",
            "coords": [[80.00, 30.23], [80.05, 30.23], [80.05, 30.21], [80.00, 30.21], [80.00, 30.23]],
            "crop": "Apple Orchard", "area_ha": 65
        },
    ]
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [a["coords"]]},
            "properties": {"name": a["name"], "crop_type": a["crop"],
                           "area_ha": a["area_ha"], "is_demo": True}
        }
        for a in agri_zones
    ]
    return {"type": "FeatureCollection", "features": features,
            "metadata": {"is_demo": True, "total_area_ha": sum(a["area_ha"] for a in agri_zones)}}


def generate_metadata() -> dict:
    return {
        "dataset_name": "HADR Synthetic Demonstration Dataset",
        "version": "1.0.0",
        "generated_at": datetime.utcnow().isoformat(),
        "study_area": "Synthetic Indian Himalayan Foothill (Uttarakhand-inspired)",
        "crs": CRS,
        "bounds": BOUNDS,
        "grid_rows": GRID_ROWS,
        "grid_cols": GRID_COLS,
        "resolution_m": 30.0,
        "is_demo": True,
        "is_synthetic": True,
        "disclaimer": (
            "This is SYNTHETIC DEMONSTRATION DATA generated by the HADR Platform. "
            "It does not represent any real location, river, dam, or infrastructure. "
            "Do not use for real-world engineering or emergency decisions."
        ),
        "files": {
            "dem": "dem/dem.tif",
            "hillshade": "dem/hillshade.tif",
            "slope": "dem/slope.tif",
            "river": "river/river.geojson",
            "dam": "dam/dam.json",
            "reservoir": "reservoir/reservoir.geojson",
            "hydrology": "hydrology/hydrology.csv",
            "settlements": "settlements/settlements.geojson",
            "roads": "roads/roads.geojson",
            "buildings": "buildings/buildings.geojson",
            "infrastructure": "infrastructure/infrastructure.geojson",
            "agriculture": "agriculture/agriculture.geojson",
        }
    }


def main():
    print("=" * 60)
    print("HADR Flood Simulation Platform — Demo Data Generator")
    print("=" * 60)
    print(f"Study area: {BOUNDS}")
    print(f"Grid: {GRID_ROWS}x{GRID_COLS} @ ~30m resolution")
    print(f"Output directory: {DEMO_DIR}")
    print()

    # Create directories
    makedirs(
        os.path.join(DEMO_DIR, "dem"),
        os.path.join(DEMO_DIR, "river"),
        os.path.join(DEMO_DIR, "dam"),
        os.path.join(DEMO_DIR, "reservoir"),
        os.path.join(DEMO_DIR, "hydrology"),
        os.path.join(DEMO_DIR, "settlements"),
        os.path.join(DEMO_DIR, "roads"),
        os.path.join(DEMO_DIR, "buildings"),
        os.path.join(DEMO_DIR, "agriculture"),
        os.path.join(DEMO_DIR, "infrastructure"),
        os.path.join(DEMO_DIR, "metadata"),
    )

    # DEM
    print("Generating synthetic DEM...")
    dem = generate_synthetic_dem()
    save_raster_geotiff(dem, os.path.join(DEMO_DIR, "dem", "dem.tif"), None)

    # Hillshade
    print("Generating hillshade...")
    hillshade = generate_hillshade(dem)
    save_raster_geotiff(hillshade.astype(np.float32), os.path.join(DEMO_DIR, "dem", "hillshade.tif"), None)

    # Slope
    print("Generating slope...")
    slope = generate_slope(dem)
    save_raster_geotiff(slope, os.path.join(DEMO_DIR, "dem", "slope.tif"), None)

    # DEM stats
    dem_stats = {
        "min_m": float(np.min(dem)),
        "max_m": float(np.max(dem)),
        "mean_m": float(np.mean(dem)),
        "std_m": float(np.std(dem)),
        "shape": list(dem.shape),
        "crs": CRS,
        "bounds": BOUNDS,
        "resolution_m": 30.0,
        "is_synthetic": True,
    }
    with open(os.path.join(DEMO_DIR, "dem", "dem_stats.json"), "w") as f:
        json.dump(dem_stats, f, indent=2)
    print(f"  DEM stats: min={dem_stats['min_m']:.0f}m, max={dem_stats['max_m']:.0f}m, mean={dem_stats['mean_m']:.0f}m")

    # River
    print("Generating river GeoJSON...")
    river = generate_river_geojson()
    with open(os.path.join(DEMO_DIR, "river", "river.geojson"), "w") as f:
        json.dump(river, f, indent=2)
    print(f"  Saved: {len(river['features'])} river features")

    # Dam
    print("Generating dam metadata...")
    dam = generate_dam_json()
    with open(os.path.join(DEMO_DIR, "dam", "dam.json"), "w") as f:
        json.dump(dam, f, indent=2)
    print(f"  Dam: {dam['name']} ({dam['height_m']}m)")

    # Reservoir
    print("Generating reservoir GeoJSON...")
    reservoir = generate_reservoir_geojson()
    with open(os.path.join(DEMO_DIR, "reservoir", "reservoir.geojson"), "w") as f:
        json.dump(reservoir, f, indent=2)

    # Hydrology
    print("Generating hydrological time series...")
    generate_hydrology_csv(os.path.join(DEMO_DIR, "hydrology", "hydrology.csv"))

    # Settlements
    print("Generating settlements GeoJSON...")
    settlements = generate_settlements_geojson()
    with open(os.path.join(DEMO_DIR, "settlements", "settlements.geojson"), "w") as f:
        json.dump(settlements, f, indent=2)
    total_pop = settlements["metadata"]["total_population"]
    print(f"  {len(settlements['features'])} villages, total population: {total_pop}")

    # Roads
    print("Generating roads GeoJSON...")
    roads = generate_roads_geojson()
    with open(os.path.join(DEMO_DIR, "roads", "roads.geojson"), "w") as f:
        json.dump(roads, f, indent=2)
    print(f"  {len(roads['features'])} road segments")

    # Buildings
    print("Generating buildings GeoJSON...")
    buildings = generate_buildings_geojson()
    with open(os.path.join(DEMO_DIR, "buildings", "buildings.geojson"), "w") as f:
        json.dump(buildings, f, indent=2)
    print(f"  {len(buildings['features'])} buildings")

    # Infrastructure
    print("Generating infrastructure GeoJSON...")
    infra = generate_infrastructure_geojson()
    with open(os.path.join(DEMO_DIR, "infrastructure", "infrastructure.geojson"), "w") as f:
        json.dump(infra, f, indent=2)
    print(f"  {len(infra['features'])} infrastructure features")

    # Agriculture
    print("Generating agriculture GeoJSON...")
    agri = generate_agriculture_geojson()
    with open(os.path.join(DEMO_DIR, "agriculture", "agriculture.geojson"), "w") as f:
        json.dump(agri, f, indent=2)
    print(f"  {agri['metadata']['total_area_ha']} ha agricultural land")

    # Metadata
    print("Saving dataset metadata...")
    meta = generate_metadata()
    with open(os.path.join(DEMO_DIR, "metadata", "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print()
    print("=" * 60)
    print("Demo data generation COMPLETE.")
    print(f"All files saved to: {os.path.abspath(DEMO_DIR)}")
    print()
    print("DISCLAIMER: This is SYNTHETIC DEMONSTRATION DATA.")
    print("Do not use for real-world decisions.")
    print("=" * 60)


if __name__ == "__main__":
    main()
