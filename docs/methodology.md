# RIO Methodology

## 1. Overview

RIO (River Inundation & Outlook) is a flood inundation modelling and visualization system designed to simulate river flooding and communicate the resulting flood extent and severity in an understandable way.

The system combines geospatial data, hydraulic modelling using DELFT3D and a visualization layer to transform river and terrain information into actionable flood inundation information.

## 2. Overall Workflow

The RIO workflow can be summarized as:

Input Data
→ Terrain Preparation
→ River Geometry
→ Hydraulic Parameters
→ Boundary Conditions
→ Simulation
→ Flood Depth / Water Surface Results
→ Inundation Mapping
→ RIO Visualization

## 3. Input Data

The hydraulic model requires information describing the river system and surrounding terrain.

The major input categories include:

- Digital elevation / terrain data
- River and channel geometry
- Cross-sectional information
- Flow conditions
- Boundary conditions
- Hydraulic roughness parameters
- Flood or breach scenario information

## 4. Terrain Preparation

Terrain data is used to represent the elevation of the study area.

The terrain provides the underlying surface over which simulated flood water propagates.

The prepared terrain is incorporated into the hydraulic modelling workflow so that water-surface elevations can be related to ground elevations to determine areas affected by flooding.

## 5. Hydraulic Model Preparation

The river system is then simulated

The model contains:

- River geometry
- Cross sections
- Hydraulic structures where applicable
- Roughness coefficients
- Flow data
- Boundary conditions
- Simulation configuration

## 6. Hydraulic Simulation

Hydraulic conditions are calculated throughout the modelled river system.

Depending on the configured simulation, the model produces hydraulic information such as:

- Water-surface elevation
- Flow
- Velocity
- Depth

These outputs provide the basis for determining the spatial extent and severity of inundation.

## 7. Inundation Mapping

Flood inundation can be derived by comparing simulated water-surface elevation with terrain elevation.

Conceptually:

Flood Depth = Water Surface Elevation − Ground Elevation

Areas where the resulting depth is greater than zero represent potentially inundated regions, subject to the assumptions and resolution of the model.

## 8. Visualization

RIO presents the resulting flood information through a user-facing visualization layer.

The visualization is intended to make hydraulic model outputs easier to interpret by displaying information such as:

- Flood extent
- Flood depth
- Water level
- Flow or velocity
- Affected regions

## 9. Important Assumptions

Hydraulic modelling results depend strongly on the quality of the input data and assumptions used in the model.

Important factors include:

- Terrain resolution and accuracy
- River geometry
- Manning's roughness coefficient
- Flow conditions
- Boundary conditions
- Model resolution
- Representation of hydraulic structures
- Scenario assumptions



## 10. Limitations

The quality of the final inundation map is constrained by the quality of the underlying terrain, hydraulic data, model configuration, and scenario assumptions.

## 11. Summary

RIO integrates hydraulic modelling and visualization into a single workflow:

Geospatial Data
→ Hydraulic Model
→ HEC-RAS Simulation
→ Hydraulic Results
→ Inundation Extraction
→ Visualization

This provides a reproducible framework for analysing and communicating river flood inundation scenarios.
