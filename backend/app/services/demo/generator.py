"""
Comprehensive demo data service for HADR platform.
All data is SYNTHETIC DEMONSTRATION DATA.
"""
import json
import math
from typing import Dict, Any, List


class DemoDataService:
    """Provides all synthetic demonstration data for the HADR platform."""

    # Study area: Synthetic Himalayan Foothill near Uttarakhand
    BOUNDS = {"min_lon": 79.80, "min_lat": 30.20, "max_lon": 80.10, "max_lat": 30.40}
    DAM_LON = 79.85
    DAM_LAT = 30.35
    DISCLAIMER = (
        "SYNTHETIC DEMONSTRATION DATA — "
        "Does not represent any real location, river, dam, or infrastructure."
    )

    @staticmethod
    def generate_full_demo() -> Dict[str, Any]:
        d = DemoDataService
        return {
            "project": d.get_demo_project(),
            "study_area": d.get_demo_study_area(),
            "river": d.get_demo_river(),
            "dam": d.get_demo_dam(),
            "reservoir": d.get_demo_reservoir(),
            "hydrology": d.get_demo_hydrology(),
            "settlements": d.get_demo_settlements(),
            "roads": d.get_demo_roads(),
            "buildings": d.get_demo_buildings(),
            "infrastructure": d.get_demo_infrastructure(),
            "agriculture": d.get_demo_agriculture(),
            "dem_info": d.get_demo_dem_info(),
            "is_demo": True,
            "disclaimer": DemoDataService.DISCLAIMER,
        }

    @staticmethod
    def get_demo_project() -> Dict[str, Any]:
        return {
            "id": "demo-project-uttarakhand-001",
            "name": "Demo Project — Synthetic Himalayan Tributary",
            "description": (
                "Synthetic demonstration of catastrophic dam-break scenario "
                "in a Himalayan-foothill river system. "
                "Study area is entirely synthetic."
            ),
            "scenario": "DAM_BREAK",
            "scenario_label": "Catastrophic Dam Break",
            "region": "Synthetic Northern India / Himalayan Foothills",
            "is_demo": True,
            "disclaimer": DemoDataService.DISCLAIMER,
        }

    @staticmethod
    def get_demo_study_area() -> Dict[str, Any]:
        bounds = DemoDataService.BOUNDS
        return {
            "name": "Synthetic Demonstration Study Area",
            "bounds": bounds,
            "center": {
                "lon": (bounds["min_lon"] + bounds["max_lon"]) / 2,
                "lat": (bounds["min_lat"] + bounds["max_lat"]) / 2,
            },
            "area_km2": 760.0,
            "crs": "EPSG:4326",
            "region_type": "Himalayan Foothill Valley",
            "is_demo": True,
            "disclaimer": DemoDataService.DISCLAIMER,
        }

    @staticmethod
    def get_demo_river() -> Dict[str, Any]:
        # Curved river from dam southward
        points = []
        n = 40
        for i in range(n):
            t = i / (n - 1)
            lon = DemoDataService.DAM_LON + t * 0.22 + 0.012 * math.sin(t * math.pi * 4)
            lat = DemoDataService.DAM_LAT - t * 0.14
            points.append([round(lon, 6), round(lat, 6)])

        # Buffer to create river polygon
        def perp_offset(pts, d):
            result = []
            for i in range(len(pts)):
                if i < len(pts) - 1:
                    dx = pts[i+1][0] - pts[i][0]
                    dy = pts[i+1][1] - pts[i][1]
                    l = math.sqrt(dx**2 + dy**2) or 1e-9
                    result.append([pts[i][0] - dy/l*d, pts[i][1] + dx/l*d])
                else:
                    result.append(result[-1] if result else pts[i])
            return result

        off = 0.0025
        left = perp_offset(points, off)
        right = perp_offset(points, -off)
        poly_ring = left + list(reversed(right)) + [left[0]]

        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": points},
                    "properties": {
                        "name": "Demo Himalayan Tributary",
                        "type": "river_centerline",
                        "length_km": 28.5,
                        "avg_width_m": 45,
                        "is_demo": True,
                        "label": "DEMO RIVER",
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [poly_ring]},
                    "properties": {
                        "name": "Demo Himalayan Tributary",
                        "type": "river_polygon",
                        "is_demo": True,
                    }
                }
            ],
            "is_demo": True,
            "disclaimer": DemoDataService.DISCLAIMER,
        }

    @staticmethod
    def get_demo_dam() -> Dict[str, Any]:
        return {
            "name": "Demo Himalayan Reservoir Dam",
            "type": "Gravity Dam",
            "coordinates": [DemoDataService.DAM_LON, DemoDataService.DAM_LAT],
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
            "label": "DEMO DATA",
            "disclaimer": "DEMO DATA — Synthetic demonstration dam. Not a real structure.",
        }

    @staticmethod
    def get_demo_reservoir() -> Dict[str, Any]:
        # Elliptical reservoir polygon
        cx = DemoDataService.DAM_LON - 0.025
        cy = DemoDataService.DAM_LAT + 0.030
        a, b = 0.040, 0.022
        n = 36
        coords = []
        for i in range(n + 1):
            theta = 2 * math.pi * i / n
            coords.append([round(cx + a * math.cos(theta), 6), round(cy + b * math.sin(theta), 6)])

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
                        "perimeter_km": 12.8,
                        "is_demo": True,
                        "label": "DEMO RESERVOIR",
                    }
                }
            ],
            "is_demo": True,
        }

    @staticmethod
    def get_demo_hydrology() -> List[Dict[str, Any]]:
        """72-hour hydrograph: normal → breach → rapid rise → peak → recession."""
        import random
        rng = __import__("random").Random(42)
        obs = []
        for hour in range(72):
            if hour < 24:
                # Normal flow
                q = 52.0 + rng.gauss(0, 4)
                wl = 1180.0 + rng.gauss(0, 0.15)
                rain = 8.0 + rng.uniform(0, 3)
                stage = "NORMAL"
            elif hour < 25:
                # Breach initiation (rapid)
                t = hour - 24
                q = 52.0 + t * 250.0
                wl = 1180.0 + t * 4
                rain = 2.0
                stage = "BREACH_START"
            elif hour < 28:
                # Rapid rise
                t = hour - 25
                q = 302.0 + t * 2250.0
                wl = 1184.0 + t * 3.2
                rain = 1.0
                stage = "RAPID_RISE"
            elif hour < 34:
                # Peak
                q = 7052.0 + rng.gauss(0, 120)
                wl = 1193.6 + rng.gauss(0, 0.3)
                rain = 0.5
                stage = "PEAK"
            else:
                # Recession
                t = hour - 34
                q = max(55.0, 7052.0 * __import__("math").exp(-0.12 * t))
                wl = max(1181.0, 1193.6 - t * 0.75)
                rain = max(0.0, 3.0 - t * 0.2)
                stage = "RECESSION"

            obs.append({
                "timestamp": f"2024-06-15T{hour:02d}:00:00Z",
                "hour": hour,
                "discharge_m3s": round(float(q), 2),
                "water_level_m": round(float(wl), 2),
                "rainfall_mm_hr": round(float(rain), 2),
                "velocity_ms": round(float(q) / 85.0, 3),
                "stage": stage,
                "is_demo": True,
            })
        return obs

    @staticmethod
    def get_demo_settlements() -> Dict[str, Any]:
        villages = [
            {"name": "Dharchula Khand",  "lon": 79.91, "lat": 30.31, "population": 1850, "households": 370},
            {"name": "Munsiyari Gaon",   "lon": 79.97, "lat": 30.27, "population": 1120, "households": 224},
            {"name": "Pithoragarh Nala", "lon": 79.93, "lat": 30.24, "population": 650,  "households": 130},
            {"name": "Baram Tola",        "lon": 80.01, "lat": 30.22, "population": 480,  "households": 96},
            {"name": "Chilkiya",          "lon": 79.88, "lat": 30.28, "population": 920,  "households": 184},
            {"name": "Kanalichina",       "lon": 79.95, "lat": 30.30, "population": 340,  "households": 68},
            {"name": "Gorikunda",         "lon": 80.04, "lat": 30.25, "population": 760,  "households": 152},
            {"name": "Thal Bazaar",       "lon": 79.99, "lat": 30.23, "population": 2100, "households": 420},
        ]
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [v["lon"], v["lat"]]},
                    "properties": {**v, "type": "village", "is_demo": True},
                }
                for v in villages
            ],
            "metadata": {
                "is_demo": True,
                "total_villages": len(villages),
                "total_population": sum(v["population"] for v in villages),
            },
            "is_demo": True,
        }

    @staticmethod
    def get_demo_roads() -> Dict[str, Any]:
        roads = [
            {
                "coords": [[79.80, 30.35], [79.85, 30.33], [79.92, 30.29],
                           [79.99, 30.24], [80.08, 30.21]],
                "name": "NH-125 (Synthetic)", "road_type": "National Highway", "lanes": 2, "length_km": 32.5,
            },
            {
                "coords": [[79.88, 30.35], [79.90, 30.30], [79.93, 30.27]],
                "name": "State Highway SH-1 (Demo)", "road_type": "State Highway", "lanes": 1, "length_km": 11.2,
            },
            {
                "coords": [[79.91, 30.31], [79.95, 30.30]],
                "name": "Village Road A", "road_type": "Rural", "lanes": 1, "length_km": 5.8,
            },
            {
                "coords": [[79.97, 30.27], [80.01, 30.26]],
                "name": "Village Road B", "road_type": "Rural", "lanes": 1, "length_km": 4.5,
            },
            {
                "coords": [[79.93, 30.24], [79.95, 30.23], [80.01, 30.22]],
                "name": "Access Road", "road_type": "District", "lanes": 1, "length_km": 9.1,
            },
        ]
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": r["coords"]},
                    "properties": {k: v for k, v in r.items() if k != "coords"} | {"is_demo": True},
                }
                for r in roads
            ],
            "is_demo": True,
        }

    @staticmethod
    def get_demo_buildings() -> Dict[str, Any]:
        """50 synthetic building footprints."""
        import random
        rng = random.Random(42)
        centers = [
            (79.91, 30.31), (79.97, 30.27), (79.93, 30.24),
            (80.01, 30.22), (79.88, 30.28),
        ]
        btype = ["residential", "commercial", "school", "clinic", "government"]
        features = []
        for cx, cy in centers:
            for _ in range(10):
                lon = cx + rng.uniform(-0.004, 0.004)
                lat = cy + rng.uniform(-0.003, 0.003)
                w = rng.uniform(0.0002, 0.0004)
                h = rng.uniform(0.0001, 0.0003)
                coords = [[[lon, lat], [lon+w, lat], [lon+w, lat+h], [lon, lat+h], [lon, lat]]]
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": coords},
                    "properties": {
                        "building_type": rng.choice(btype),
                        "floors": rng.randint(1, 3),
                        "is_demo": True,
                    }
                })
        return {"type": "FeatureCollection", "features": features,
                "metadata": {"is_demo": True, "total_buildings": len(features)}}

    @staticmethod
    def get_demo_infrastructure() -> Dict[str, Any]:
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [79.91, 30.29]},
                    "properties": {"name": "Demo Bridge 1", "type": "Bridge",
                                   "span_m": 45, "capacity_tonnes": 15, "is_demo": True},
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [79.98, 30.25]},
                    "properties": {"name": "Demo Bridge 2", "type": "Bridge",
                                   "span_m": 80, "capacity_tonnes": 25, "is_demo": True},
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [79.94, 30.27]},
                    "properties": {"name": "Demo Health Centre", "type": "hospital",
                                   "beds": 12, "is_demo": True},
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [79.90, 30.32]},
                    "properties": {"name": "Demo 33kV Substation", "type": "power_substation",
                                   "capacity_kv": 33, "is_demo": True},
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[79.86, 30.33], [79.93, 30.28], [80.00, 30.23]]
                    },
                    "properties": {"name": "Demo 33kV Power Line", "type": "power_line",
                                   "voltage_kv": 33, "is_demo": True},
                },
            ],
            "is_demo": True,
        }

    @staticmethod
    def get_demo_agriculture() -> Dict[str, Any]:
        zones = [
            {
                "name": "Rice Fields A", "crop": "Rice", "area_ha": 85,
                "coords": [[79.89, 30.29], [79.93, 30.29], [79.93, 30.27],
                           [79.89, 30.27], [79.89, 30.29]],
            },
            {
                "name": "Wheat Fields B", "crop": "Wheat", "area_ha": 120,
                "coords": [[79.95, 30.26], [79.99, 30.26], [79.99, 30.24],
                           [79.95, 30.24], [79.95, 30.26]],
            },
            {
                "name": "Apple Orchard C", "crop": "Apple Orchard", "area_ha": 65,
                "coords": [[80.00, 30.23], [80.05, 30.23], [80.05, 30.21],
                           [80.00, 30.21], [80.00, 30.23]],
            },
        ]
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [z["coords"]]},
                    "properties": {"name": z["name"], "crop_type": z["crop"],
                                   "area_ha": z["area_ha"], "is_demo": True},
                }
                for z in zones
            ],
            "metadata": {"is_demo": True, "total_area_ha": sum(z["area_ha"] for z in zones)},
        }

    @staticmethod
    def get_demo_dem_info() -> Dict[str, Any]:
        return {
            "bounds": DemoDataService.BOUNDS,
            "crs": "EPSG:4326",
            "resolution_m": 30.0,
            "rows": 128,
            "cols": 128,
            "elevation_min_m": 600.0,
            "elevation_max_m": 2200.0,
            "elevation_mean_m": 1050.0,
            "elevation_std_m": 380.0,
            "nodata": -9999.0,
            "is_synthetic": True,
            "is_demo": True,
            "label": "Synthetic Demonstration DEM — Himalayan Foothill Style",
            "disclaimer": DemoDataService.DISCLAIMER,
        }
