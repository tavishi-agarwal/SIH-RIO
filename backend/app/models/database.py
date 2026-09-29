"""SQLAlchemy database models for HADR Flood Simulation Platform."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Float, Boolean, Integer, DateTime, Text,
    ForeignKey, JSON, create_engine
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_demo = Column(Boolean, default=False)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    simulations = relationship("Simulation", back_populates="project")
    datasets = relationship("Dataset", back_populates="project")


class StudyArea(Base):
    __tablename__ = "study_areas"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255))
    bounds = Column(JSON)  # {min_lon, min_lat, max_lon, max_lat}
    crs = Column(String(50), default="EPSG:4326")
    center_lon = Column(Float)
    center_lat = Column(Float)
    area_km2 = Column(Float)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class River(Base):
    __tablename__ = "rivers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    study_area_id = Column(UUID(as_uuid=False), ForeignKey("study_areas.id"))
    name = Column(String(255))
    length_km = Column(Float)
    geojson = Column(JSON)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Dam(Base):
    __tablename__ = "dams"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    study_area_id = Column(UUID(as_uuid=False), ForeignKey("study_areas.id"))
    name = Column(String(255))
    coordinates = Column(JSON)  # [lon, lat]
    height_m = Column(Float)
    reservoir_elevation_m = Column(Float)
    reservoir_area_km2 = Column(Float)
    reservoir_volume_mcm = Column(Float)
    normal_water_level_m = Column(Float)
    max_water_level_m = Column(Float)
    downstream_river = Column(String(255))
    is_demo = Column(Boolean, default=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"))
    name = Column(String(255))
    category = Column(String(50))  # DEM, HYDROLOGY, RIVER, DAM, SATELLITE, INFRASTRUCTURE, POPULATION
    format = Column(String(50))    # GeoTIFF, CSV, GeoJSON, SHP, KML
    crs = Column(String(50))
    resolution_m = Column(Float)
    file_path = Column(String(1024))
    file_size_bytes = Column(Integer)
    processing_status = Column(String(50), default="PENDING")
    validation_status = Column(String(50), default="PENDING")
    is_demo = Column(Boolean, default=False)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="datasets")


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"))
    name = Column(String(255))
    scenario_type = Column(String(50))  # DAM_BREAK, RIVER_BLOCKAGE, FLASH_FLOOD, NATURAL_LAKE_OUTBURST
    status = Column(String(50), default="CREATED")
    model_sph = Column(Boolean, default=True)
    model_delft3d = Column(Boolean, default=True)
    parameters = Column(JSON, default=dict)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(Text)

    project = relationship("Project", back_populates="simulations")
    job = relationship("SimulationJob", back_populates="simulation", uselist=False)
    outputs = relationship("SimulationOutput", back_populates="simulation")
    impact_results = relationship("ImpactResult", back_populates="simulation")
    exports = relationship("ExportJob", back_populates="simulation")


class SimulationJob(Base):
    __tablename__ = "simulation_jobs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    simulation_id = Column(UUID(as_uuid=False), ForeignKey("simulations.id"), unique=True)
    status = Column(String(50), default="CREATED")
    progress = Column(Float, default=0.0)
    current_stage = Column(String(100))
    stages = Column(JSON, default=list)
    logs = Column(Text, default="")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error = Column(Text)

    simulation = relationship("Simulation", back_populates="job")


class SimulationOutput(Base):
    __tablename__ = "simulation_outputs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    simulation_id = Column(UUID(as_uuid=False), ForeignKey("simulations.id"))
    model_name = Column(String(50))  # SPH or DELFT3D
    flood_extent_geojson = Column(JSON)
    max_depth_m = Column(Float)
    avg_depth_m = Column(Float)
    max_velocity_ms = Column(Float)
    inundation_area_km2 = Column(Float)
    peak_discharge_m3s = Column(Float)
    arrival_time_hrs = Column(Float)
    file_paths = Column(JSON, default=dict)
    is_mock = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    simulation = relationship("Simulation", back_populates="outputs")


class ImpactResult(Base):
    __tablename__ = "impact_results"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    simulation_id = Column(UUID(as_uuid=False), ForeignKey("simulations.id"))
    model_name = Column(String(50))
    affected_population = Column(Integer)
    affected_villages = Column(Integer)
    affected_buildings = Column(Integer)
    affected_roads_km = Column(Float)
    affected_bridges = Column(Integer)
    affected_agriculture_ha = Column(Float)
    affected_infrastructure = Column(Integer)
    impact_categories = Column(JSON, default=dict)
    is_preliminary = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    simulation = relationship("Simulation", back_populates="impact_results")


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    simulation_id = Column(UUID(as_uuid=False), ForeignKey("simulations.id"))
    format = Column(String(20))    # SHP, KML, GeoJSON, GeoTIFF, CSV
    model_name = Column(String(50))
    layer_name = Column(String(100))
    file_path = Column(String(1024))
    file_size_bytes = Column(Integer)
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

    simulation = relationship("Simulation", back_populates="exports")


# Database session management (for SQLite fallback in MVP)
from sqlalchemy import create_engine
from sqlalchemy.orm import Session


def get_engine(database_url: str):
    """Create SQLAlchemy engine with appropriate settings."""
    if database_url.startswith("sqlite"):
        return create_engine(database_url, connect_args={"check_same_thread": False})
    return create_engine(database_url, pool_pre_ping=True)


def init_db(engine):
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
