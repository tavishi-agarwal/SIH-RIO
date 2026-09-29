"""Dam-break scenario engine."""
import math
from typing import Dict, Any, List, Tuple


class DamBreakEngine:
    """
    Dam-break scenario engine using simplified hydraulic formulas.
    
    The breach hydrograph is calculated using the rectangular broad-crested 
    weir equation (simplified): Q = Cd * Bw * sqrt(2g) * hw^1.5
    where Cd = 0.577 (critical flow coefficient for rectangular breach).
    
    This is a demonstration framework — not a validated operational model.
    """

    GRAVITY = 9.81          # m/s²
    Cd = 0.577             # Discharge coefficient for rectangular breach
    TIMESTEPS = 100         # Points in hydrograph

    @classmethod
    def calculate_breach_hydrograph(cls, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate breach hydrograph for a dam-break scenario.
        
        Returns dict with times (hrs) and discharges (m³/s).
        """
        breach_width = params.get("breach_width_m", 80.0)
        dam_height = params.get("dam_height_m", 85.0)
        reservoir_water_level = params.get("reservoir_water_level_m", 1195.0)
        breach_elevation = params.get("breach_elevation_m", 1110.0)
        breach_formation_time = params.get("breach_formation_time_hrs", 0.5)
        simulation_duration = params.get("simulation_duration_hrs", 24.0)
        initial_discharge = params.get("initial_downstream_discharge_m3s", 50.0)
        reservoir_volume_mcm = params.get("reservoir_volume_mcm", 150.0)

        # Initial water head at breach initiation
        h_initial = reservoir_water_level - breach_elevation
        
        # Peak discharge (simplified Ritter solution)
        # Q_peak = Cd * Bw * sqrt(2g) * h^1.5
        q_peak = cls.Cd * breach_width * math.sqrt(2 * cls.GRAVITY) * (h_initial ** 1.5)
        
        # Time array (hours)
        times = [i * simulation_duration / (cls.TIMESTEPS - 1) for i in range(cls.TIMESTEPS)]
        discharges = []
        
        # Phase 1: Breach formation (0 to breach_formation_time)
        # Phase 2: Full breach (peak)
        # Phase 3: Drawdown and recession
        
        t_peak = breach_formation_time
        t_half = simulation_duration * 0.35  # recession half-life point
        
        for t in times:
            if t < t_peak:
                # Rising limb: quadratic rise to peak
                ratio = t / t_peak
                q = initial_discharge + (q_peak - initial_discharge) * (ratio ** 2.5)
            elif t < t_half:
                # Peak and early recession: exponential decay
                q = q_peak * math.exp(-3.0 * (t - t_peak) / (t_half - t_peak))
                q = max(q, initial_discharge)
            else:
                # Late recession: slow exponential tail
                q = max(
                    initial_discharge,
                    initial_discharge + 0.05 * q_peak * math.exp(-0.5 * (t - t_half))
                )
            discharges.append(round(q, 2))
        
        # Add some realistic noise for believability
        import random
        rng = random.Random(42)
        discharges_noisy = [
            round(max(0, q * (1 + rng.gauss(0, 0.01))), 2)
            for q in discharges
        ]
        
        return {
            "times_hrs": times,
            "discharges_m3s": discharges_noisy,
            "peak_discharge_m3s": q_peak,
            "peak_time_hrs": t_peak,
            "breach_width_m": breach_width,
            "breach_elevation_m": breach_elevation,
            "initial_head_m": h_initial,
            "formula": "Q = Cd * Bw * sqrt(2g) * h^1.5 (simplified rectangular breach)",
            "is_demo": True,
            "disclaimer": "Simplified demonstration calculation — not a validated model",
        }

    @classmethod
    def generate_scenario_definition(cls, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate complete scenario definition from parameters."""
        hydrograph = cls.calculate_breach_hydrograph(params)
        initial_cond = cls.calculate_initial_conditions(params)
        boundary_cond = cls.calculate_boundary_conditions(params, hydrograph)
        
        return {
            "scenario_type": "DAM_BREAK",
            "scenario_label": "Catastrophic Dam Break",
            "is_demo": True,
            "parameters": params,
            "breach_hydrograph": hydrograph,
            "initial_conditions": initial_cond,
            "boundary_conditions": boundary_cond,
            "disclaimer": "DEMONSTRATION SCENARIO — Not a validated operational scenario",
        }

    @classmethod
    def calculate_initial_conditions(cls, params: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate initial flow conditions."""
        return {
            "initial_water_level_m": params.get("reservoir_water_level_m", 1195.0),
            "initial_discharge_m3s": params.get("initial_downstream_discharge_m3s", 50.0),
            "initial_velocity_ms": 0.5,  # quiescent
            "reservoir_volume_mcm": params.get("reservoir_volume_mcm", 150.0),
            "dry_bed_downstream": False,
            "is_demo": True,
        }

    @classmethod
    def calculate_boundary_conditions(
        cls, params: Dict[str, Any], hydrograph: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate model boundary conditions."""
        return {
            "upstream_bc": {
                "type": "discharge_hydrograph",
                "times_hrs": hydrograph["times_hrs"][:20],
                "discharges_m3s": hydrograph["discharges_m3s"][:20],
            },
            "downstream_bc": {
                "type": "open_boundary",
                "rating_curve": "None (open boundary)",
            },
            "lateral_bc": {
                "type": "closed_walls",
            },
            "is_demo": True,
        }

    @classmethod
    def generate_model_config(
        cls, scenario: Dict[str, Any], study_area: Dict[str, Any], dem_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate complete model configuration."""
        params = scenario.get("parameters", {})
        return {
            "scenario": scenario,
            "domain": {
                "bounds": study_area.get("bounds", {}),
                "crs": study_area.get("crs", "EPSG:4326"),
                "resolution_m": dem_info.get("resolution_m", 30.0),
                "rows": dem_info.get("rows", 128),
                "cols": dem_info.get("cols", 128),
            },
            "simulation": {
                "duration_hrs": params.get("simulation_duration_hrs", 24.0),
                "timestep_s": params.get("simulation_timestep_s", 10.0),
                "output_interval_s": 3600.0,
            },
            "breach_hydrograph": scenario.get("breach_hydrograph", {}),
            "initial_conditions": scenario.get("initial_conditions", {}),
            "boundary_conditions": scenario.get("boundary_conditions", {}),
            "is_demo": True,
        }
