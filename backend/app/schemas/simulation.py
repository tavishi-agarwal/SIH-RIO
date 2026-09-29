from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    metadata_: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class DamBreakParameters(BaseModel):
    reservoir_water_level: float
    reservoir_volume: float
    dam_height: float
    breach_width: float
    breach_depth: float
    breach_elevation: float
    breach_formation_time: float
    initial_downstream_discharge: float
    peak_discharge: Optional[float] = None
    rainfall_intensity: Optional[float] = None
    simulation_duration: float
    simulation_timestep: float
    terrain_resolution: float

class SimulationCreate(BaseModel):
    name: str
    scenario_type: str
    study_area_params: Dict[str, Any]
    model_sph: bool = True
    model_delft3d: bool = False
    parameters: DamBreakParameters

class SimulationResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    scenario_type: str
    status: str
    model_sph: bool
    model_delft3d: bool
    parameters: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SimulationJobResponse(BaseModel):
    status: str
    progress: float
    current_stage: str
    stages: List[str]
    
    model_config = ConfigDict(from_attributes=True)

class ScenarioConfig(BaseModel):
    type: str
    parameters: Dict[str, Any]

class FloodResult(BaseModel):
    max_depth_m: float
    avg_depth_m: float
    max_velocity_ms: float
    inundation_area_km2: float
    peak_discharge_m3s: float
    arrival_time_hrs: float

    model_config = ConfigDict(from_attributes=True)

class ImpactResultResponse(BaseModel):
    affected_population: int
    affected_villages: int
    affected_buildings: int
    affected_roads_km: float
    affected_bridges: int
    affected_agriculture_ha: float
    affected_infrastructure: int
    impact_categories: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

class ModelComparisonResponse(BaseModel):
    sph: Optional[FloodResult] = None
    delft3d: Optional[FloodResult] = None
    differences: Dict[str, float]

    model_config = ConfigDict(from_attributes=True)
