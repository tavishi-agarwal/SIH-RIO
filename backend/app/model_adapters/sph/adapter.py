"""
Mock SPH (Smooth Particle Hydrodynamics) Model Adapter.

MOCK SPH — DEMONSTRATION ONLY.
This is a simplified deterministic flood-propagation engine that demonstrates
the software pipeline. It does NOT implement real SPH physics.
Inputs influence outputs deterministically. All outputs are labeled as mock.
"""
import os
import json
import math
import time
import csv
from typing import Dict, Any, List, Tuple
import numpy as np

from ..base import ModelAdapter, ModelRunResult

# Try rasterio import; fail gracefully for environments without it
try:
    import rasterio
    from rasterio.transform import from_bounds
    from rasterio.crs import CRS
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False


class SPHModelAdapter(ModelAdapter):
    """
    Mock SPH Model Adapter.

    Demonstrates the full SPH adapter pipeline with deterministic outputs
    derived from input DEM, dam parameters, and hydrograph.

    Propagation model:
      - Flood originates at dam location
      - Propagates following DEM gradient (downhill)
      - Depth decreases with distance, modified by DEM elevation
      - Velocity computed from depth (simplified kinematic wave)
      - Arrival time computed from wave speed and distance
    """

    MODEL_NAME = "SPH"
    MODEL_VERSION = "mock-sph-1.0"
    IS_MOCK = True

    # SPH-specific propagation parameters (differ from Delft3D)
    DECAY_EXPONENT = 0.55          # SPH: Lagrangian particle decay
    VELOCITY_COEFFICIENT = 0.85    # SPH kinematic wave coefficient
    FLOOD_THRESHOLD_M = 0.1        # Minimum depth for flood extent
    BASE_WAVE_SPEED = 8.5          # m/s at peak discharge

    def validate_input(self, config: Dict[str, Any]) -> Dict[str, Any]:
        errors = []
        warnings = []
        required = ["dam_location", "reservoir_volume_mcm", "breach_width_m",
                    "dam_height_m", "simulation_duration_hrs"]
        for key in required:
            if key not in config:
                warnings.append(f"Missing parameter '{key}', will use defaults.")
        return {"valid": True, "errors": errors, "warnings": warnings}

    def prepare_input(self, config: Dict[str, Any], output_dir: str) -> Dict[str, Any]:
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "particles"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "boundary"), exist_ok=True)

        # Write SPH particle definition file (mock)
        particle_config = {
            "model": "SPH",
            "is_mock": True,
            "particle_spacing_m": config.get("terrain_resolution_m", 30.0),
            "smoothing_length_m": config.get("terrain_resolution_m", 30.0) * 2.0,
            "dam_location": config.get("dam_location", [79.85, 30.35]),
            "reservoir_volume_mcm": config.get("reservoir_volume_mcm", 150.0),
            "breach_width_m": config.get("breach_width_m", 80.0),
        }
        with open(os.path.join(output_dir, "sph_particle_config.json"), "w") as f:
            json.dump(particle_config, f, indent=2)

        return {
            "input_dir": output_dir,
            "particle_config": particle_config,
            "is_mock": True
        }

    def generate_config(self, scenario: Dict[str, Any], prepared_input: Dict[str, Any]) -> Dict[str, Any]:
        """Generate SPH model configuration."""
        return {
            "model": "SPH",
            "model_version": self.MODEL_VERSION,
            "is_mock": True,
            "particle_method": "Smoothed Particle Hydrodynamics (Mock)",
            "kernel": "Cubic Spline",
            "particle_spacing_m": scenario.get("terrain_resolution_m", 30.0),
            "smoothing_length_m": scenario.get("terrain_resolution_m", 30.0) * 2.0,
            "time_step_s": scenario.get("simulation_timestep_s", 10.0),
            "gravity_ms2": 9.81,
            "kinematic_viscosity_m2s": 1.0e-6,
            "boundary_type": "open_downstream",
            "simulation_duration_hrs": scenario.get("simulation_duration_hrs", 24.0),
            "output_interval_s": 3600.0,
            "disclaimer": "MOCK SPH — DEMONSTRATION ONLY",
        }

    def run(self, config: Dict[str, Any], model_config: Dict[str, Any]) -> ModelRunResult:
        """Execute mock SPH flood propagation."""
        output_dir = config.get("output_dir", "./storage/sph_output")
        os.makedirs(output_dir, exist_ok=True)

        t_start = time.time()
        result = self._run_mock_sph(config, model_config, output_dir)
        exec_time = time.time() - t_start

        result.execution_time_s = exec_time
        return result

    def _run_mock_sph(
        self, config: Dict[str, Any], model_config: Dict[str, Any], output_dir: str
    ) -> ModelRunResult:
        """
        Deterministic mock SPH flood propagation.

        Uses DEM data and dam-break parameters to generate spatially
        coherent flood depth, velocity, and arrival time grids.
        """
        # --- Study area and grid setup ---
        bounds = config.get("bounds", {
            "min_lon": 79.80, "min_lat": 30.20,
            "max_lon": 80.10, "max_lat": 30.40
        })
        dam_lon = config.get("dam_location", [79.85, 30.35])[0]
        dam_lat = config.get("dam_location", [79.85, 30.35])[1]

        # Grid: 128x128 (fast on laptop)
        grid_rows = config.get("grid_rows", 128)
        grid_cols = config.get("grid_cols", 128)

        resolution_deg_lon = (bounds["max_lon"] - bounds["min_lon"]) / grid_cols
        resolution_deg_lat = (bounds["max_lat"] - bounds["min_lat"]) / grid_rows

        # --- Build synthetic DEM ---
        dem = self._build_synthetic_dem(
            grid_rows, grid_cols, bounds, dam_lon, dam_lat
        )

        # --- Dam-break parameters ---
        reservoir_volume_mcm = config.get("reservoir_volume_mcm", 150.0)
        breach_width_m = config.get("breach_width_m", 80.0)
        dam_height_m = config.get("dam_height_m", 85.0)
        reservoir_wl = config.get("reservoir_water_level_m", 1195.0)
        sim_duration_hrs = config.get("simulation_duration_hrs", 24.0)
        peak_discharge = config.get("peak_discharge_m3s", 7000.0)

        # --- Dam pixel location ---
        dam_row = int((bounds["max_lat"] - dam_lat) / resolution_deg_lat)
        dam_col = int((dam_lon - bounds["min_lon"]) / resolution_deg_lon)
        dam_row = max(1, min(dam_row, grid_rows - 2))
        dam_col = max(1, min(dam_col, grid_cols - 2))

        # --- Flood propagation (deterministic) ---
        flood_depth, velocity, arrival_time = self._propagate_flood(
            dem, dam_row, dam_col, reservoir_volume_mcm,
            breach_width_m, dam_height_m, reservoir_wl,
            peak_discharge, sim_duration_hrs, grid_rows, grid_cols
        )

        # --- Generate hydrograph ---
        hydrograph = self._generate_hydrograph(peak_discharge, sim_duration_hrs)

        # --- Save outputs ---
        transform = self._make_transform(bounds, grid_cols, grid_rows)
        crs_wkt = "EPSG:4326"

        files = {}
        files["flood_depth"] = self._save_raster(
            flood_depth, output_dir, "flood_depth.tif", transform, crs_wkt
        )
        files["velocity"] = self._save_raster(
            velocity, output_dir, "velocity.tif", transform, crs_wkt
        )
        files["arrival_time"] = self._save_raster(
            arrival_time, output_dir, "arrival_time.tif", transform, crs_wkt
        )

        # Water surface = DEM + flood depth
        water_surface = np.where(flood_depth > self.FLOOD_THRESHOLD_M, dem + flood_depth, dem)
        files["water_surface"] = self._save_raster(
            water_surface, output_dir, "water_surface.tif", transform, crs_wkt
        )

        files["flood_extent"] = self._generate_flood_extent(
            flood_depth, bounds, grid_rows, grid_cols, output_dir,
            {"model": "MOCK SPH", "is_mock": True}
        )
        files["discharge"] = self._save_hydrograph(hydrograph, output_dir)

        # --- Save manifest ---
        manifest = {
            "model": "SPH",
            "model_version": self.MODEL_VERSION,
            "is_mock": True,
            "disclaimer": "MOCK SPH — DEMONSTRATION ONLY. Not a real SPH solver.",
            "dam_location": config.get("dam_location", [dam_lon, dam_lat]),
            "grid_shape": [grid_rows, grid_cols],
            "bounds": bounds,
            "parameters": {
                "reservoir_volume_mcm": reservoir_volume_mcm,
                "breach_width_m": breach_width_m,
                "dam_height_m": dam_height_m,
                "peak_discharge_m3s": peak_discharge,
                "simulation_duration_hrs": sim_duration_hrs,
            },
        }
        with open(os.path.join(output_dir, "sph_run_manifest.json"), "w") as f:
            json.dump(manifest, f, indent=2)
        files["manifest"] = os.path.join(output_dir, "sph_run_manifest.json")

        # Stats
        flooded_mask = flood_depth > self.FLOOD_THRESHOLD_M
        flood_stats = {
            "max_depth_m": float(np.max(flood_depth)),
            "avg_depth_m": float(np.mean(flood_depth[flooded_mask])) if flooded_mask.any() else 0.0,
            "max_velocity_ms": float(np.max(velocity)),
            "inundation_area_km2": float(np.sum(flooded_mask)) * self._cell_area_km2(bounds, grid_rows, grid_cols),
            "peak_discharge_m3s": peak_discharge,
            "min_arrival_time_hrs": float(np.min(arrival_time[flooded_mask])) if flooded_mask.any() else 0.0,
            "is_mock": True,
        }

        return ModelRunResult(
            success=True,
            model_name=self.MODEL_NAME,
            model_version=self.MODEL_VERSION,
            execution_time_s=0.0,  # filled by caller
            output_files=list(files.values()),
            metadata=manifest,
            errors=[],
            is_mock=True,
            output_dir=output_dir,
            flood_stats=flood_stats,
        )

    # ------------------------------------------------------------------
    # DEM generation
    # ------------------------------------------------------------------

    def _build_synthetic_dem(
        self, rows: int, cols: int, bounds: Dict, dam_lon: float, dam_lat: float
    ) -> np.ndarray:
        """Build a realistic synthetic DEM (Himalayan foothill style)."""
        lon_arr = np.linspace(bounds["min_lon"], bounds["max_lon"], cols)
        lat_arr = np.linspace(bounds["max_lat"], bounds["min_lat"], rows)
        lon_grid, lat_grid = np.meshgrid(lon_arr, lat_arr)

        # Dam pixel position
        dam_col_f = (dam_lon - bounds["min_lon"]) / (bounds["max_lon"] - bounds["min_lon"]) * cols
        dam_row_f = (bounds["max_lat"] - dam_lat) / (bounds["max_lat"] - bounds["min_lat"]) * rows

        # Base elevation: mountain ridge in north, valley flowing south
        # Elevation range: 600m (floodplain) to 2200m (ridge tops)
        base_elevation = 600.0 + 1600.0 * (lat_arr[:, None] - bounds["min_lat"]) / (bounds["max_lat"] - bounds["min_lat"])

        # River valley: low-elevation channel following dam
        # Valley runs roughly S-SE from dam
        dist_from_dam_col = np.abs(np.arange(cols)[None, :] - dam_col_f)
        valley_depression = np.exp(-0.5 * (dist_from_dam_col / (cols * 0.06)) ** 2) * 250.0

        # Downstream floodplain broadens
        row_arr = np.arange(rows)[:, None]
        downstream_factor = np.clip((row_arr - dam_row_f) / rows, 0, 1)
        valley_width_factor = 1.0 + downstream_factor * 3.0
        valley_depression_broad = (
            np.exp(-0.5 * (dist_from_dam_col / (cols * 0.06 * (1 + 3 * downstream_factor))) ** 2) * 250.0
        )

        # Hills on both sides of valley
        hill_left = 150 * np.sin(np.pi * (lon_grid - bounds["min_lon"]) / (bounds["max_lon"] - bounds["min_lon"]) * 3)
        hill_right = 100 * np.cos(np.pi * (lat_grid - bounds["min_lat"]) / (bounds["max_lat"] - bounds["min_lat"]) * 4)

        dem = base_elevation - valley_depression_broad + hill_left + hill_right
        dem = np.clip(dem, 550.0, 2500.0)

        # Reservoir area (upstream of dam) at high elevation
        upstream_mask = row_arr < dam_row_f
        dem = np.where(upstream_mask & (dist_from_dam_col < cols * 0.08), dem + 50.0, dem)

        return dem.astype(np.float32)

    # ------------------------------------------------------------------
    # Flood propagation (deterministic mock)
    # ------------------------------------------------------------------

    def _propagate_flood(
        self,
        dem: np.ndarray,
        dam_row: int,
        dam_col: int,
        reservoir_volume_mcm: float,
        breach_width_m: float,
        dam_height_m: float,
        reservoir_wl: float,
        peak_discharge: float,
        sim_duration_hrs: float,
        grid_rows: int,
        grid_cols: int,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Simplified flood propagation.

        Depth at cell (i,j) downstream of dam:
          depth = D0 * exp(-alpha * dist/width) * flow_factor
        where D0 is determined by peak discharge and dam height,
        dist is Euclidean distance from dam pixel,
        width is characteristic flood width,
        flow_factor accounts for DEM slope.
        """
        rows, cols = dem.shape
        flood_depth = np.zeros((rows, cols), dtype=np.float32)
        velocity_arr = np.zeros((rows, cols), dtype=np.float32)
        arrival_time_arr = np.full((rows, cols), np.inf, dtype=np.float32)
        arrival_time_arr[dam_row, dam_col] = 0.1  # hrs

        # Peak depth at breach (simplified Ritter solution approximation)
        # D_peak ~ (8/27) * dam_height at breach
        d_peak = (8.0 / 27.0) * dam_height_m * (reservoir_volume_mcm / 100.0) ** 0.3
        d_peak = min(d_peak, dam_height_m * 1.5)  # cap

        # Characteristic decay distance (SPH: shorter decay, sharper leading edge)
        decay_dist_px = cols * self.DECAY_EXPONENT * 0.8

        # Wave speed based on peak discharge
        wave_speed_ms = self.BASE_WAVE_SPEED * (peak_discharge / 5000.0) ** 0.4  # m/s

        # Approx: 1 degree latitude ~ 111 km, longitude ~ 96 km at 30N
        deg_to_m_lat = 111000.0
        deg_to_m_lon = 96000.0
        cell_size_m_row = deg_to_m_lat / rows
        cell_size_m_col = deg_to_m_lon / cols

        row_idx, col_idx = np.mgrid[0:rows, 0:cols]

        # Distance from dam in pixels
        dr = (row_idx - dam_row).astype(np.float32)
        dc = (col_idx - dam_col).astype(np.float32)

        # Only propagate downstream (larger row index = further south)
        downstream_mask = row_idx >= dam_row

        # Physical distance in meters
        dist_m = np.sqrt((dr * cell_size_m_row) ** 2 + (dc * cell_size_m_col) ** 2)
        dist_m = np.maximum(dist_m, 1.0)

        # Lateral spread: flood follows valley (concentrates near dam_col)
        lateral_spread_m = 5000.0 + (row_idx - dam_row) / rows * 15000.0  # broadens downstream
        lateral_decay = np.exp(-0.5 * (dc * cell_size_m_col / lateral_spread_m) ** 2)

        # DEM-based factor: flood goes lower elevations
        dam_elevation = dem[dam_row, dam_col]
        elev_diff = dam_elevation - dem  # positive = lower than dam
        elev_factor = np.clip(elev_diff / dam_height_m, 0, 1.5)

        # Longitudinal decay along flow path
        long_decay = np.exp(-dist_m / (decay_dist_px * cell_size_m_row))

        # Flood depth: combined model
        depth_raw = d_peak * long_decay * lateral_decay * elev_factor
        depth_raw = np.where(downstream_mask, depth_raw, 0.0)

        # Apply minimum threshold
        flood_depth = np.where(depth_raw >= self.FLOOD_THRESHOLD_M, depth_raw, 0.0).astype(np.float32)

        # Velocity: simplified kinematic wave v = C * sqrt(g * d)
        # SPH gives slightly lower velocities than Delft3D near breach
        velocity_arr = np.where(
            flood_depth > 0,
            self.VELOCITY_COEFFICIENT * np.sqrt(9.81 * np.maximum(flood_depth, 0.01)),
            0.0
        ).astype(np.float32)

        # Arrival time: distance / wave_speed (hours)
        arrival_time_hrs_arr = np.where(
            flood_depth > 0,
            dist_m / (wave_speed_ms * 3600.0),  # convert m/s to m/hr, dist in m
            0.0
        ).astype(np.float32)

        # Add noise seed from dam parameters for reproducibility differentiation
        rng = np.random.default_rng(seed=int(breach_width_m * 100 + dam_height_m))
        small_noise = rng.uniform(-0.05, 0.05, flood_depth.shape).astype(np.float32)
        flood_depth = np.clip(flood_depth * (1 + small_noise), 0, None)

        arrival_time_arr = np.where(flood_depth > 0, arrival_time_hrs_arr, 0.0)

        return flood_depth, velocity_arr, arrival_time_arr

    def _generate_hydrograph(self, peak_discharge: float, duration_hrs: float) -> List[Dict]:
        """Generate SPH breach hydrograph (72 time steps)."""
        n_steps = 72
        times = np.linspace(0, duration_hrs, n_steps)
        # SPH: more abrupt rise, sharper peak
        t_peak = duration_hrs * 0.15
        t_recession = duration_hrs * 0.40
        discharges = []
        for t in times:
            if t < t_peak:
                q = peak_discharge * (t / t_peak) ** 2.5
            elif t < t_recession:
                q = peak_discharge * np.exp(-1.5 * (t - t_peak) / (t_recession - t_peak))
            else:
                q = max(50.0, peak_discharge * 0.1 * np.exp(-2.0 * (t - t_recession) / duration_hrs))
            discharges.append(q)
        return [
            {"time_hr": float(t), "discharge_m3s": float(q), "model": "MOCK_SPH"}
            for t, q in zip(times, discharges)
        ]

    # ------------------------------------------------------------------
    # Output helpers
    # ------------------------------------------------------------------

    def _make_transform(self, bounds: Dict, cols: int, rows: int):
        """Create rasterio affine transform."""
        if RASTERIO_AVAILABLE:
            return from_bounds(
                bounds["min_lon"], bounds["min_lat"],
                bounds["max_lon"], bounds["max_lat"],
                cols, rows
            )
        # Fallback: return a list [west, xres, 0, north, 0, -yres]
        xres = (bounds["max_lon"] - bounds["min_lon"]) / cols
        yres = (bounds["max_lat"] - bounds["min_lat"]) / rows
        return [bounds["min_lon"], xres, 0, bounds["max_lat"], 0, -yres]

    def _save_raster(
        self, array: np.ndarray, output_dir: str, filename: str,
        transform, crs_str: str
    ) -> str:
        path = os.path.join(output_dir, filename)
        if RASTERIO_AVAILABLE:
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
                nodata=-9999.0,
                compress="lzw",
            ) as dst:
                dst.write(array, 1)
                dst.update_tags(
                    MODEL="MOCK SPH",
                    DISCLAIMER="MOCK SPH — DEMONSTRATION ONLY",
                    IS_MOCK="TRUE",
                )
        else:
            # Save as numpy binary if rasterio unavailable
            np.save(path.replace(".tif", ".npy"), array)
            path = path.replace(".tif", ".npy")
        return path

    def _generate_flood_extent(
        self, flood_depth: np.ndarray, bounds: Dict,
        rows: int, cols: int, output_dir: str, properties: Dict
    ) -> str:
        """Generate GeoJSON flood extent polygon from depth raster."""
        flooded = flood_depth > self.FLOOD_THRESHOLD_M
        # Simplified: create bounding polygon of flooded cells
        features = []

        lon_arr = np.linspace(bounds["min_lon"], bounds["max_lon"], cols)
        lat_arr = np.linspace(bounds["max_lat"], bounds["min_lat"], rows)

        # Group contiguous flooded rows/cols into a simplified polygon
        # For MVP: create depth-class polygons
        depth_classes = [
            (0.1, 0.5, "0–0.5m", "#FFF176"),
            (0.5, 1.0, "0.5–1m", "#FFB300"),
            (1.0, 2.0, "1–2m", "#F57C00"),
            (2.0, 5.0, "2–5m", "#D32F2F"),
            (5.0, 999.0, ">5m", "#7B1FA2"),
        ]

        for d_min, d_max, label, color in depth_classes:
            mask = (flood_depth >= d_min) & (flood_depth < d_max)
            if not mask.any():
                continue
            # Get bounding box of this depth class
            rows_with_flood = np.where(mask.any(axis=1))[0]
            cols_with_flood = np.where(mask.any(axis=0))[0]
            if len(rows_with_flood) == 0 or len(cols_with_flood) == 0:
                continue
            r_min, r_max = rows_with_flood[0], rows_with_flood[-1]
            c_min, c_max = cols_with_flood[0], cols_with_flood[-1]
            w = lon_arr[c_min]
            e = lon_arr[min(c_max + 1, cols - 1)]
            n = lat_arr[r_min]
            s = lat_arr[min(r_max + 1, rows - 1)]
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[w, n], [e, n], [e, s], [w, s], [w, n]]]
                },
                "properties": {
                    "depth_class": label,
                    "depth_min_m": d_min,
                    "depth_max_m": d_max,
                    "color": color,
                    "model": "MOCK SPH",
                    "is_mock": True,
                    **properties,
                }
            })

        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "model": "MOCK SPH",
                "is_mock": True,
                "disclaimer": "MOCK SPH — DEMONSTRATION ONLY",
                "flood_threshold_m": self.FLOOD_THRESHOLD_M,
            }
        }
        path = os.path.join(output_dir, "flood_extent.geojson")
        with open(path, "w") as f:
            json.dump(geojson, f, indent=2)
        return path

    def _save_hydrograph(self, hydrograph: List[Dict], output_dir: str) -> str:
        path = os.path.join(output_dir, "discharge.csv")
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["time_hr", "discharge_m3s", "model"])
            writer.writeheader()
            writer.writerows(hydrograph)
        return path

    def _cell_area_km2(self, bounds: Dict, rows: int, cols: int) -> float:
        """Approximate cell area in km²."""
        dlat = (bounds["max_lat"] - bounds["min_lat"]) / rows
        dlon = (bounds["max_lon"] - bounds["min_lon"]) / cols
        return dlat * 111.0 * dlon * 96.0  # degrees → km at ~30°N

    def parse_output(self, output_dir: str, run_result: ModelRunResult) -> Dict[str, Any]:
        stats = run_result.flood_stats if run_result.flood_stats else {}
        return {
            "model": "SPH",
            "is_mock": True,
            "disclaimer": "MOCK SPH — DEMONSTRATION ONLY",
            "max_depth_m": stats.get("max_depth_m", 0.0),
            "avg_depth_m": stats.get("avg_depth_m", 0.0),
            "max_velocity_ms": stats.get("max_velocity_ms", 0.0),
            "inundation_area_km2": stats.get("inundation_area_km2", 0.0),
            "peak_discharge_m3s": stats.get("peak_discharge_m3s", 0.0),
            "arrival_time_hrs": stats.get("min_arrival_time_hrs", 0.0),
            "output_dir": output_dir,
            "file_paths": {
                "flood_depth": os.path.join(output_dir, "flood_depth.tif"),
                "velocity": os.path.join(output_dir, "velocity.tif"),
                "arrival_time": os.path.join(output_dir, "arrival_time.tif"),
                "water_surface": os.path.join(output_dir, "water_surface.tif"),
                "flood_extent": os.path.join(output_dir, "flood_extent.geojson"),
                "discharge": os.path.join(output_dir, "discharge.csv"),
                "manifest": os.path.join(output_dir, "sph_run_manifest.json"),
            },
        }

    def cleanup(self, output_dir: str) -> None:
        """No cleanup needed for mock."""
        pass
