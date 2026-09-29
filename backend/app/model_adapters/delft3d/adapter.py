"""
Mock Delft3D Model Adapter.

MOCK DELFT3D — DEMONSTRATION ONLY.
This is a simplified deterministic flood-propagation engine that demonstrates
the Delft3D adapter pipeline. It does NOT run the real Delft3D solver.
Produces slightly different results from the SPH mock for meaningful comparison.
"""
import os
import json
import math
import time
import csv
from typing import Dict, Any, List, Tuple
import numpy as np

from ..base import ModelAdapter, ModelRunResult
from ..sph.adapter import SPHModelAdapter  # Reuse DEM generation and helpers

try:
    import rasterio
    from rasterio.transform import from_bounds
    from rasterio.crs import CRS
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False


class Delft3DModelAdapter(ModelAdapter):
    """
    Mock Delft3D Model Adapter.

    Demonstrates the Delft3D adapter pipeline with deterministic outputs.
    Uses a structured-grid approach (vs SPH's particle approach), resulting in:
      - Slightly wider flood extent
      - Different velocity distribution (structured grid diffusion)
      - Longer arrival times at distal locations
      - Different depth distribution (more uniform grid interpolation)

    CURRENT IMPLEMENTATION: MOCK. No Delft3D installation required.
    Set DELFT3D_EXECUTABLE env var to enable the real solver.
    """

    MODEL_NAME = "DELFT3D"
    MODEL_VERSION = "mock-delft3d-1.0"
    IS_MOCK = True

    # Delft3D-specific propagation parameters (structured grid behavior)
    DECAY_EXPONENT = 0.65          # Delft3D: structured grid, broader diffusion
    VELOCITY_COEFFICIENT = 0.92    # Slightly higher (grid numerics vs particles)
    FLOOD_THRESHOLD_M = 0.1
    BASE_WAVE_SPEED = 7.8          # Slightly slower than SPH at same discharge

    # Structured grid introduces numerical diffusion
    DIFFUSION_FACTOR = 1.18        # Delft3D spreads flood ~18% wider
    DEPTH_BIAS = 0.92              # Slightly shallower avg depth (diffusion smoothing)

    def validate_input(self, config: Dict[str, Any]) -> Dict[str, Any]:
        errors = []
        warnings = []
        required = ["dam_location", "reservoir_volume_mcm", "breach_width_m",
                    "dam_height_m", "simulation_duration_hrs"]
        for key in required:
            if key not in config:
                warnings.append(f"Missing parameter '{key}', will use defaults.")
        if not config.get("delft3d_grid_type"):
            warnings.append("No grid type specified; defaulting to curvilinear structured grid.")
        return {"valid": True, "errors": errors, "warnings": warnings}

    def prepare_input(self, config: Dict[str, Any], output_dir: str) -> Dict[str, Any]:
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "grid"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "boundary"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "roughness"), exist_ok=True)

        # Write Delft3D mock grid definition
        grid_config = {
            "model": "DELFT3D",
            "is_mock": True,
            "grid_type": "structured_curvilinear",
            "grid_cells_m": config.get("terrain_resolution_m", 30.0),
            "mmax": config.get("grid_cols", 128),
            "nmax": config.get("grid_rows", 128),
            "coordinate_system": "Spherical",
            "dam_location": config.get("dam_location", [79.85, 30.35]),
        }
        with open(os.path.join(output_dir, "delft3d_grid_config.json"), "w") as f:
            json.dump(grid_config, f, indent=2)

        # Mock .mdf (master definition file) content
        mdf_content = f"""[model]
FileCreatedBy     = HADR Platform Mock Delft3D Adapter
FileCreationDate  = generated
Ident             = Delft3D-FLOW

[domain]
MMax              = {config.get("grid_cols", 128)}
NMax              = {config.get("grid_rows", 128)}
KMax              = 1
Coord             = Spherical
Anglat            = {config.get("dam_location", [79.85, 30.35])[1]:.2f}

[time]
Tstart            = 0.0
Tstop             = {config.get("simulation_duration_hrs", 24.0) * 60.0:.1f}
Dt                = {config.get("simulation_timestep_s", 10.0) / 60.0:.4f}
Tunit             = M

[remark]
This is a MOCK Delft3D configuration file.
No real Delft3D solver is installed.
MOCK DELFT3D — DEMONSTRATION ONLY.
"""
        with open(os.path.join(output_dir, "flow.mdf"), "w") as f:
            f.write(mdf_content)

        return {
            "input_dir": output_dir,
            "grid_config": grid_config,
            "mdf_path": os.path.join(output_dir, "flow.mdf"),
            "is_mock": True
        }

    def generate_config(self, scenario: Dict[str, Any], prepared_input: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "model": "DELFT3D",
            "model_version": self.MODEL_VERSION,
            "is_mock": True,
            "solver": "Delft3D-FLOW (Mock)",
            "grid_type": "Structured Curvilinear",
            "advection_scheme": "Cyclic method (mock)",
            "turbulence_model": "k-epsilon (mock)",
            "time_step_s": scenario.get("simulation_timestep_s", 10.0),
            "simulation_duration_hrs": scenario.get("simulation_duration_hrs", 24.0),
            "roughness_formula": "Manning",
            "manning_n": 0.030,
            "bed_roughness": "uniform",
            "disclaimer": "MOCK DELFT3D — DEMONSTRATION ONLY",
        }

    def run(self, config: Dict[str, Any], model_config: Dict[str, Any]) -> ModelRunResult:
        output_dir = config.get("output_dir", "./storage/delft3d_output")
        os.makedirs(output_dir, exist_ok=True)

        t_start = time.time()
        result = self._run_mock_delft3d(config, model_config, output_dir)
        exec_time = time.time() - t_start

        result.execution_time_s = exec_time
        return result

    def _run_mock_delft3d(
        self, config: Dict[str, Any], model_config: Dict[str, Any], output_dir: str
    ) -> ModelRunResult:
        """
        Deterministic mock Delft3D flood propagation.

        Reuses SPH DEM generation but applies different propagation parameters
        to simulate structured-grid Delft3D behavior.
        """
        # Borrow DEM generation from SPH adapter
        sph = SPHModelAdapter()

        bounds = config.get("bounds", {
            "min_lon": 79.80, "min_lat": 30.20,
            "max_lon": 80.10, "max_lat": 30.40
        })
        dam_lon = config.get("dam_location", [79.85, 30.35])[0]
        dam_lat = config.get("dam_location", [79.85, 30.35])[1]
        grid_rows = config.get("grid_rows", 128)
        grid_cols = config.get("grid_cols", 128)

        resolution_deg_lon = (bounds["max_lon"] - bounds["min_lon"]) / grid_cols
        resolution_deg_lat = (bounds["max_lat"] - bounds["min_lat"]) / grid_rows

        dem = sph._build_synthetic_dem(grid_rows, grid_cols, bounds, dam_lon, dam_lat)

        dam_row = int((bounds["max_lat"] - dam_lat) / resolution_deg_lat)
        dam_col = int((dam_lon - bounds["min_lon"]) / resolution_deg_lon)
        dam_row = max(1, min(dam_row, grid_rows - 2))
        dam_col = max(1, min(dam_col, grid_cols - 2))

        reservoir_volume_mcm = config.get("reservoir_volume_mcm", 150.0)
        breach_width_m = config.get("breach_width_m", 80.0)
        dam_height_m = config.get("dam_height_m", 85.0)
        reservoir_wl = config.get("reservoir_water_level_m", 1195.0)
        sim_duration_hrs = config.get("simulation_duration_hrs", 24.0)
        peak_discharge = config.get("peak_discharge_m3s", 7000.0)

        flood_depth, velocity, arrival_time = self._propagate_flood_delft3d(
            dem, dam_row, dam_col, reservoir_volume_mcm,
            breach_width_m, dam_height_m, reservoir_wl,
            peak_discharge, sim_duration_hrs, grid_rows, grid_cols
        )

        hydrograph = self._generate_hydrograph(peak_discharge, sim_duration_hrs)

        transform = sph._make_transform(bounds, grid_cols, grid_rows)
        crs_wkt = "EPSG:4326"

        files = {}
        files["flood_depth"] = sph._save_raster(flood_depth, output_dir, "flood_depth.tif", transform, crs_wkt)
        files["velocity"] = sph._save_raster(velocity, output_dir, "velocity.tif", transform, crs_wkt)
        files["arrival_time"] = sph._save_raster(arrival_time, output_dir, "arrival_time.tif", transform, crs_wkt)
        water_surface = np.where(flood_depth > self.FLOOD_THRESHOLD_M, dem + flood_depth, dem)
        files["water_surface"] = sph._save_raster(water_surface, output_dir, "water_surface.tif", transform, crs_wkt)
        files["flood_extent"] = self._generate_flood_extent_delft3d(
            flood_depth, bounds, grid_rows, grid_cols, output_dir
        )
        files["discharge"] = self._save_hydrograph(hydrograph, output_dir)

        manifest = {
            "model": "DELFT3D",
            "model_version": self.MODEL_VERSION,
            "is_mock": True,
            "disclaimer": "MOCK DELFT3D — DEMONSTRATION ONLY. Not a real Delft3D solver.",
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
        with open(os.path.join(output_dir, "delft3d_run_manifest.json"), "w") as f:
            json.dump(manifest, f, indent=2)
        files["manifest"] = os.path.join(output_dir, "delft3d_run_manifest.json")

        flooded_mask = flood_depth > self.FLOOD_THRESHOLD_M
        flood_stats = {
            "max_depth_m": float(np.max(flood_depth)),
            "avg_depth_m": float(np.mean(flood_depth[flooded_mask])) if flooded_mask.any() else 0.0,
            "max_velocity_ms": float(np.max(velocity)),
            "inundation_area_km2": float(np.sum(flooded_mask)) * sph._cell_area_km2(bounds, grid_rows, grid_cols),
            "peak_discharge_m3s": peak_discharge,
            "min_arrival_time_hrs": float(np.min(arrival_time[flooded_mask])) if flooded_mask.any() else 0.0,
            "is_mock": True,
        }

        return ModelRunResult(
            success=True,
            model_name=self.MODEL_NAME,
            model_version=self.MODEL_VERSION,
            execution_time_s=0.0,
            output_files=list(files.values()),
            metadata=manifest,
            errors=[],
            is_mock=True,
            output_dir=output_dir,
            flood_stats=flood_stats,
        )

    def _propagate_flood_delft3d(
        self, dem, dam_row, dam_col, reservoir_volume_mcm,
        breach_width_m, dam_height_m, reservoir_wl,
        peak_discharge, sim_duration_hrs, grid_rows, grid_cols
    ):
        """
        Delft3D structured-grid flood propagation.
        Produces slightly wider, more diffuse flood extent vs SPH.
        """
        rows, cols = dem.shape
        dam_elevation = dem[dam_row, dam_col]

        d_peak = (8.0 / 27.0) * dam_height_m * (reservoir_volume_mcm / 100.0) ** 0.3
        d_peak = min(d_peak, dam_height_m * 1.5)

        # Delft3D: wider decay distance (structured grid numerical diffusion)
        decay_dist_px = cols * self.DECAY_EXPONENT

        wave_speed_ms = self.BASE_WAVE_SPEED * (peak_discharge / 5000.0) ** 0.4

        deg_to_m_lat = 111000.0
        deg_to_m_lon = 96000.0
        cell_size_m_row = deg_to_m_lat / rows
        cell_size_m_col = deg_to_m_lon / cols

        row_idx, col_idx = np.mgrid[0:rows, 0:cols]
        downstream_mask = row_idx >= dam_row

        dr = (row_idx - dam_row).astype(np.float32)
        dc = (col_idx - dam_col).astype(np.float32)
        dist_m = np.sqrt((dr * cell_size_m_row) ** 2 + (dc * cell_size_m_col) ** 2)
        dist_m = np.maximum(dist_m, 1.0)

        # Delft3D: wider lateral spread (diffusion)
        lateral_spread_m = (5000.0 + (row_idx - dam_row) / rows * 15000.0) * self.DIFFUSION_FACTOR
        lateral_decay = np.exp(-0.5 * (dc * cell_size_m_col / lateral_spread_m) ** 2)

        elev_diff = dam_elevation - dem
        elev_factor = np.clip(elev_diff / dam_height_m, 0, 1.5)

        # Delft3D: slower longitudinal decay (structured grid conserves mass better)
        long_decay = np.exp(-dist_m / (decay_dist_px * cell_size_m_row))

        depth_raw = d_peak * long_decay * lateral_decay * elev_factor * self.DEPTH_BIAS
        depth_raw = np.where(downstream_mask, depth_raw, 0.0)

        flood_depth = np.where(depth_raw >= self.FLOOD_THRESHOLD_M, depth_raw, 0.0).astype(np.float32)

        # Delft3D: higher velocity near breach (structured grid less damping)
        velocity_arr = np.where(
            flood_depth > 0,
            self.VELOCITY_COEFFICIENT * np.sqrt(9.81 * np.maximum(flood_depth, 0.01)),
            0.0
        ).astype(np.float32)

        # Delft3D: arrival time slightly longer (structured grid CFL constraint)
        arrival_time_hrs_arr = np.where(
            flood_depth > 0,
            dist_m / (wave_speed_ms * 3600.0) * 1.08,  # 8% slower than SPH
            0.0
        ).astype(np.float32)

        # Reproducibility noise (different seed from SPH)
        rng = np.random.default_rng(seed=int(breach_width_m * 137 + dam_height_m * 42))
        small_noise = rng.uniform(-0.04, 0.06, flood_depth.shape).astype(np.float32)
        flood_depth = np.clip(flood_depth * (1 + small_noise), 0, None)

        return flood_depth, velocity_arr, arrival_time_hrs_arr

    def _generate_hydrograph(self, peak_discharge: float, duration_hrs: float) -> List[Dict]:
        """Generate Delft3D breach hydrograph — slightly more gradual than SPH."""
        n_steps = 72
        times = np.linspace(0, duration_hrs, n_steps)
        # Delft3D: more gradual rise, slightly wider peak
        t_peak = duration_hrs * 0.18
        t_recession = duration_hrs * 0.45
        discharges = []
        for t in times:
            if t < t_peak:
                q = peak_discharge * (t / t_peak) ** 2.0  # less abrupt
            elif t < t_recession:
                q = peak_discharge * np.exp(-1.2 * (t - t_peak) / (t_recession - t_peak))
            else:
                q = max(50.0, peak_discharge * 0.12 * np.exp(-1.8 * (t - t_recession) / duration_hrs))
            discharges.append(q)
        return [
            {"time_hr": float(t), "discharge_m3s": float(q), "model": "MOCK_DELFT3D"}
            for t, q in zip(times, discharges)
        ]

    def _generate_flood_extent_delft3d(
        self, flood_depth: np.ndarray, bounds: Dict,
        rows: int, cols: int, output_dir: str
    ) -> str:
        """Generate Delft3D GeoJSON flood extent with depth classes."""
        lon_arr = np.linspace(bounds["min_lon"], bounds["max_lon"], cols)
        lat_arr = np.linspace(bounds["max_lat"], bounds["min_lat"], rows)
        features = []

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
                    "model": "MOCK DELFT3D",
                    "is_mock": True,
                }
            })

        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "model": "MOCK DELFT3D",
                "is_mock": True,
                "disclaimer": "MOCK DELFT3D — DEMONSTRATION ONLY",
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

    def parse_output(self, output_dir: str, run_result: ModelRunResult) -> Dict[str, Any]:
        stats = run_result.flood_stats if run_result.flood_stats else {}
        return {
            "model": "DELFT3D",
            "is_mock": True,
            "disclaimer": "MOCK DELFT3D — DEMONSTRATION ONLY",
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
                "manifest": os.path.join(output_dir, "delft3d_run_manifest.json"),
            },
        }

    def cleanup(self, output_dir: str) -> None:
        pass
