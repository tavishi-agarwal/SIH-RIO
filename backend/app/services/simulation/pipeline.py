"""
Complete simulation pipeline for HADR Flood Simulation Platform.

Orchestrates the full end-to-end workflow:
  CREATED → VALIDATING → PREPROCESSING → GENERATING_INPUT →
  SPH_RUNNING → DELFT3D_RUNNING → POSTPROCESSING →
  IMPACT_ANALYSIS → EXPORTING → COMPLETED
"""
import os
import json
import time
import uuid
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

from ...model_adapters.sph.adapter import SPHModelAdapter
from ...model_adapters.delft3d.adapter import Delft3DModelAdapter
from ...services.demo.generator import DemoDataService
from ...services.impact.analyzer import ImpactAnalyzer
from ...services.exports.exporter import GISExporter


class SimulationPipeline:
    """
    Orchestrates the complete flood simulation pipeline.

    Each stage updates progress and logs. On failure, sets status to FAILED
    and records the error. The pipeline is synchronous for simplicity
    (can be called from Celery worker).
    """

    STAGES = [
        ("VALIDATING",        "Data Validation",           0.05),
        ("PREPROCESSING",     "GIS Preprocessing",         0.15),
        ("GENERATING_INPUT",  "Model Input Generation",    0.25),
        ("SPH_RUNNING",       "SPH Simulation",            0.45),
        ("DELFT3D_RUNNING",   "Delft3D Simulation",        0.65),
        ("POSTPROCESSING",    "Post-Processing",           0.80),
        ("IMPACT_ANALYSIS",   "Impact Analysis",           0.90),
        ("EXPORTING",         "GIS Export",                0.97),
        ("COMPLETED",         "Completed",                 1.00),
    ]

    def __init__(self, storage_path: str = "./storage"):
        self.storage_path = storage_path
        self.sph_adapter = SPHModelAdapter()
        self.delft3d_adapter = Delft3DModelAdapter()
        self.demo_service = DemoDataService()
        self.impact_analyzer = ImpactAnalyzer()
        self.exporter = GISExporter()

    def run_demo_pipeline(self, simulation_id: str) -> Dict[str, Any]:
        """Run the full demo pipeline and return results."""
        return self.run_pipeline(simulation_id, use_demo_data=True)

    def run_pipeline(
        self, simulation_id: str, use_demo_data: bool = True,
        parameters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Execute the full simulation pipeline.
        Returns complete result dict with all outputs.
        """
        result = {
            "simulation_id": simulation_id,
            "status": "RUNNING",
            "stages": [],
            "sph_result": None,
            "delft3d_result": None,
            "impact_sph": None,
            "impact_delft3d": None,
            "comparison": None,
            "exports": {},
            "error": None,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
        }

        # Project directory
        project_dir = os.path.join(self.storage_path, "projects", simulation_id)
        os.makedirs(project_dir, exist_ok=True)

        try:
            # --- Stage 1: VALIDATING ---
            self._log_stage(result, "VALIDATING", "Data Validation", 0.05)
            config = self._build_config(simulation_id, project_dir, use_demo_data, parameters)
            validation = self.sph_adapter.validate_input(config)
            self._log_stage(result, "VALIDATING", "Data Validation — OK", 0.09, done=True)

            # --- Stage 2: PREPROCESSING ---
            self._log_stage(result, "PREPROCESSING", "GIS Preprocessing", 0.10)
            dem_info = self._preprocess_dem(config, project_dir)
            config.update(dem_info)
            self._log_stage(result, "PREPROCESSING", "GIS Preprocessing — OK", 0.24, done=True)

            # --- Stage 3: GENERATING_INPUT ---
            self._log_stage(result, "GENERATING_INPUT", "Model Input Generation", 0.25)
            sph_input_dir = os.path.join(project_dir, "model_inputs", "sph")
            d3d_input_dir = os.path.join(project_dir, "model_inputs", "delft3d")
            sph_prep = self.sph_adapter.prepare_input(config, sph_input_dir)
            d3d_prep = self.delft3d_adapter.prepare_input(config, d3d_input_dir)
            sph_model_config = self.sph_adapter.generate_config(config, sph_prep)
            d3d_model_config = self.delft3d_adapter.generate_config(config, d3d_prep)
            self._save_json(sph_model_config, os.path.join(sph_input_dir, "sph_config.json"))
            self._save_json(d3d_model_config, os.path.join(d3d_input_dir, "d3d_config.json"))
            self._log_stage(result, "GENERATING_INPUT", "Inputs generated — OK", 0.44, done=True)

            # --- Stage 4: SPH_RUNNING ---
            self._log_stage(result, "SPH_RUNNING", "Running Mock SPH", 0.45)
            sph_output_dir = os.path.join(project_dir, "outputs", "sph")
            os.makedirs(sph_output_dir, exist_ok=True)
            config["output_dir"] = sph_output_dir
            sph_run = self.sph_adapter.run(config, sph_model_config)
            sph_parsed = self.sph_adapter.parse_output(sph_output_dir, sph_run)
            result["sph_result"] = sph_parsed
            self._log_stage(result, "SPH_RUNNING", f"Mock SPH complete — {sph_parsed['max_depth_m']:.1f}m max depth", 0.64, done=True)

            # --- Stage 5: DELFT3D_RUNNING ---
            self._log_stage(result, "DELFT3D_RUNNING", "Running Mock Delft3D", 0.65)
            d3d_output_dir = os.path.join(project_dir, "outputs", "delft3d")
            os.makedirs(d3d_output_dir, exist_ok=True)
            config["output_dir"] = d3d_output_dir
            d3d_run = self.delft3d_adapter.run(config, d3d_model_config)
            d3d_parsed = self.delft3d_adapter.parse_output(d3d_output_dir, d3d_run)
            result["delft3d_result"] = d3d_parsed
            self._log_stage(result, "DELFT3D_RUNNING", f"Mock Delft3D complete — {d3d_parsed['max_depth_m']:.1f}m max depth", 0.79, done=True)

            # --- Stage 6: POSTPROCESSING ---
            self._log_stage(result, "POSTPROCESSING", "Post-Processing", 0.80)
            flood_extent_sph = self._load_geojson(sph_parsed["file_paths"]["flood_extent"])
            flood_extent_d3d = self._load_geojson(d3d_parsed["file_paths"]["flood_extent"])
            self._log_stage(result, "POSTPROCESSING", "Post-Processing — OK", 0.89, done=True)

            # --- Stage 7: IMPACT_ANALYSIS ---
            self._log_stage(result, "IMPACT_ANALYSIS", "Impact Analysis", 0.90)
            demo_data = self.demo_service.generate_full_demo()
            impact_sph = self.impact_analyzer.analyze_impact(
                flood_extent_sph, demo_data, sph_parsed, "SPH"
            )
            impact_d3d = self.impact_analyzer.analyze_impact(
                flood_extent_d3d, demo_data, d3d_parsed, "DELFT3D"
            )
            result["impact_sph"] = impact_sph
            result["impact_delft3d"] = impact_d3d
            self._log_stage(result, "IMPACT_ANALYSIS", "Impact Analysis — OK", 0.96, done=True)

            # --- Stage 8: EXPORTING ---
            self._log_stage(result, "EXPORTING", "GIS Export", 0.97)
            exports_dir = os.path.join(project_dir, "exports")
            exports = self.exporter.export_all_formats(
                simulation_id=simulation_id,
                sph_result=sph_parsed,
                d3d_result=d3d_parsed,
                output_base_dir=exports_dir,
            )
            result["exports"] = exports
            self._log_stage(result, "EXPORTING", "GIS Export — OK", 0.99, done=True)

            # --- Comparison ---
            result["comparison"] = self._generate_comparison(sph_parsed, d3d_parsed, impact_sph, impact_d3d)

            # --- Stage 9: COMPLETED ---
            self._log_stage(result, "COMPLETED", "Pipeline Complete", 1.00, done=True)
            result["status"] = "COMPLETED"
            result["completed_at"] = datetime.utcnow().isoformat()

            # Save manifest
            manifest = {
                "simulation_id": simulation_id,
                "scenario": "DAM_BREAK",
                "is_demo": use_demo_data,
                "is_mock": True,
                "software_version": "1.0.0-mvp",
                "created_at": result["started_at"],
                "completed_at": result["completed_at"],
                "parameters": config,
                "sph_result": sph_parsed,
                "delft3d_result": d3d_parsed,
                "exports": exports,
            }
            self._save_json(manifest, os.path.join(project_dir, "simulation_manifest.json"))

        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)
            result["traceback"] = traceback.format_exc()
            result["completed_at"] = datetime.utcnow().isoformat()

        return result

    # ------------------------------------------------------------------
    # Configuration builder
    # ------------------------------------------------------------------

    def _build_config(
        self, simulation_id: str, project_dir: str,
        use_demo_data: bool, parameters: Optional[Dict]
    ) -> Dict[str, Any]:
        """Build simulation configuration from demo or user parameters."""
        demo = DemoDataService()

        if use_demo_data:
            dam = demo.get_demo_dam()
            study_area = demo.get_demo_study_area()
            params = {
                "simulation_id": simulation_id,
                "project_dir": project_dir,
                "is_demo": True,
                "is_mock": True,
                # Study area
                "bounds": study_area["bounds"],
                "crs": "EPSG:4326",
                # Dam
                "dam_location": dam["coordinates"],
                "dam_height_m": dam["height_m"],
                "reservoir_elevation_m": dam["reservoir_elevation_m"],
                "reservoir_area_km2": dam["reservoir_area_km2"],
                "reservoir_volume_mcm": dam["reservoir_volume_mcm"],
                "reservoir_water_level_m": dam["max_water_level_m"],
                # Scenario: Catastrophic dam break
                "scenario_type": "DAM_BREAK",
                "breach_type": "CATASTROPHIC",
                "breach_width_m": 80.0,
                "breach_depth_m": 85.0,
                "breach_elevation_m": 1110.0,
                "breach_formation_time_hrs": 0.5,
                # Hydrology
                "initial_downstream_discharge_m3s": 50.0,
                "peak_discharge_m3s": 7050.0,
                "rainfall_intensity_mmhr": 10.0,
                # Simulation
                "simulation_duration_hrs": 24.0,
                "simulation_timestep_s": 10.0,
                "terrain_resolution_m": 30.0,
                "grid_rows": 128,
                "grid_cols": 128,
            }
        else:
            params = parameters or {}
            params["simulation_id"] = simulation_id
            params["project_dir"] = project_dir

        return params

    # ------------------------------------------------------------------
    # DEM preprocessing
    # ------------------------------------------------------------------

    def _preprocess_dem(self, config: Dict, project_dir: str) -> Dict:
        """Validate/generate DEM and extract metadata."""
        dem_dir = os.path.join(project_dir, "input", "dem")
        os.makedirs(dem_dir, exist_ok=True)
        bounds = config.get("bounds", {"min_lon": 79.80, "min_lat": 30.20,
                                       "max_lon": 80.10, "max_lat": 30.40})
        return {
            "dem_dir": dem_dir,
            "dem_info": {
                "bounds": bounds,
                "crs": config.get("crs", "EPSG:4326"),
                "resolution_m": config.get("terrain_resolution_m", 30.0),
                "rows": config.get("grid_rows", 128),
                "cols": config.get("grid_cols", 128),
                "elevation_min_m": 600.0,
                "elevation_max_m": 2200.0,
                "elevation_mean_m": 1050.0,
                "nodata": -9999.0,
                "is_synthetic": True,
            }
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _generate_comparison(
        self, sph: Dict, d3d: Dict, impact_sph: Dict, impact_d3d: Dict
    ) -> Dict:
        def pct_diff(a, b):
            if b == 0:
                return 0.0
            return round((a - b) / b * 100, 1)

        return {
            "is_mock": True,
            "disclaimer": "Comparison of MOCK SPH vs MOCK DELFT3D — for demonstration only.",
            "metrics": {
                "inundation_area_km2": {
                    "sph": sph.get("inundation_area_km2", 0),
                    "delft3d": d3d.get("inundation_area_km2", 0),
                    "difference": round(sph.get("inundation_area_km2", 0) - d3d.get("inundation_area_km2", 0), 2),
                    "pct_difference": pct_diff(sph.get("inundation_area_km2", 0), d3d.get("inundation_area_km2", 0)),
                },
                "max_depth_m": {
                    "sph": sph.get("max_depth_m", 0),
                    "delft3d": d3d.get("max_depth_m", 0),
                    "difference": round(sph.get("max_depth_m", 0) - d3d.get("max_depth_m", 0), 2),
                    "pct_difference": pct_diff(sph.get("max_depth_m", 0), d3d.get("max_depth_m", 0)),
                },
                "avg_depth_m": {
                    "sph": sph.get("avg_depth_m", 0),
                    "delft3d": d3d.get("avg_depth_m", 0),
                    "difference": round(sph.get("avg_depth_m", 0) - d3d.get("avg_depth_m", 0), 2),
                    "pct_difference": pct_diff(sph.get("avg_depth_m", 0), d3d.get("avg_depth_m", 0)),
                },
                "max_velocity_ms": {
                    "sph": sph.get("max_velocity_ms", 0),
                    "delft3d": d3d.get("max_velocity_ms", 0),
                    "difference": round(sph.get("max_velocity_ms", 0) - d3d.get("max_velocity_ms", 0), 2),
                    "pct_difference": pct_diff(sph.get("max_velocity_ms", 0), d3d.get("max_velocity_ms", 0)),
                },
                "peak_discharge_m3s": {
                    "sph": sph.get("peak_discharge_m3s", 0),
                    "delft3d": d3d.get("peak_discharge_m3s", 0),
                    "difference": round(sph.get("peak_discharge_m3s", 0) - d3d.get("peak_discharge_m3s", 0), 2),
                    "pct_difference": pct_diff(sph.get("peak_discharge_m3s", 0), d3d.get("peak_discharge_m3s", 0)),
                },
                "arrival_time_hrs": {
                    "sph": sph.get("arrival_time_hrs", 0),
                    "delft3d": d3d.get("arrival_time_hrs", 0),
                    "difference": round(sph.get("arrival_time_hrs", 0) - d3d.get("arrival_time_hrs", 0), 2),
                    "pct_difference": pct_diff(sph.get("arrival_time_hrs", 0), d3d.get("arrival_time_hrs", 0)),
                },
                "affected_population": {
                    "sph": impact_sph.get("affected_population", 0),
                    "delft3d": impact_d3d.get("affected_population", 0),
                    "difference": impact_sph.get("affected_population", 0) - impact_d3d.get("affected_population", 0),
                    "pct_difference": pct_diff(impact_sph.get("affected_population", 0), impact_d3d.get("affected_population", 0)),
                },
            }
        }

    def _log_stage(
        self, result: Dict, stage_id: str, message: str,
        progress: float, done: bool = False
    ):
        entry = {
            "stage_id": stage_id,
            "message": message,
            "progress": progress,
            "done": done,
            "timestamp": datetime.utcnow().isoformat(),
        }
        result["stages"].append(entry)
        result["current_stage"] = stage_id
        result["progress"] = progress

    def _save_json(self, data: Dict, path: str):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)

    def _load_geojson(self, path: str) -> Dict:
        if path and os.path.exists(path):
            with open(path) as f:
                return json.load(f)
        return {"type": "FeatureCollection", "features": []}
