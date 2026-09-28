# RIO Input Fields

## 1. Overview

RIO (River Inundation & Outlook) uses a combination of geographic, hydraulic, hydrological, and scenario-specific inputs to model and visualize river inundation.

These inputs define the physical environment, flow conditions, modelling parameters, and flood scenario used by the system.

The major input categories are:

* Study area information
* Terrain data
* River geometry
* Hydraulic parameters
* Flow conditions
* Boundary conditions
* Flood / breach scenario parameters
* Simulation settings

---

## 2. Study Area

The study-area inputs identify the geographic region being modelled.

| Input Field                 | Description                                 |
| --------------------------- | ------------------------------------------- |
| Study Area                  | Geographic region selected for modelling    |
| River                       | River or river reach being analysed         |
| Location                    | Geographic location of the study area       |
| Coordinate Reference System | Spatial reference system used by the data   |
| Area of Interest            | Geographic boundary of the modelling domain |

---

## 3. Terrain Inputs

Terrain data represents the elevation of the land surface surrounding the river.

| Input Field     | Description                              |
| --------------- | ---------------------------------------- |
| Terrain Dataset | Digital elevation data used by the model |
| Resolution      | Spatial resolution of the terrain        |
| Vertical Datum  | Reference used for elevation values      |
| Terrain Format  | Format of the terrain dataset            |
| Preprocessing   | Processing performed before modelling    |

Terrain is important because it determines how simulated flood water can propagate across the floodplain.

---

## 4. River Geometry

River geometry describes the physical characteristics of the river system.

| Input Field          | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| River Centerline     | Location of the river channel                                 |
| River Reach          | Specific river section being modelled                         |
| Cross Sections       | Cross-sectional representation of the river                   |
| River Stations       | Locations used to identify cross sections                     |
| Bank Locations       | Left and right bank positions                                 |
| Floodplain Geometry  | Representation of the surrounding floodplain                  |
| Hydraulic Structures | Bridges, dams, culverts, or other structures where applicable |

---

## 5. Hydraulic Parameters

Hydraulic parameters describe how water interacts with the river channel and surrounding surfaces.

### Manning's Roughness

Manning's roughness coefficient (`n`) represents resistance to flow.

Different surfaces may require different values.

| Surface / Region |    Manning's n |
| ---------------- | -------------: |
| Main Channel     | To be verified |
| Floodplain       | To be verified |
| Other Surface    | To be verified |

The final values should be taken from the actual model configuration rather than estimated in the documentation.

### Other Hydraulic Parameters

Depending on the modelling configuration, additional parameters may include:

* Channel slope
* Hydraulic radius
* Cross-sectional properties
* Roughness zones
* Structure parameters
* Initial water levels

---

## 6. Flow Inputs

Flow inputs define the amount and behaviour of water entering the model.

| Input Field     | Description                        |
| --------------- | ---------------------------------- |
| Flow Type       | Type of flow information supplied  |
| Discharge       | Flow rate entering the system      |
| Peak Discharge  | Maximum discharge for the scenario |
| Flow Hydrograph | Discharge variation over time      |
| Flow Units      | Units used for discharge           |
| Data Source     | Source of the flow information     |

Depending on the scenario, flow may be represented as a constant discharge or a time-varying hydrograph.

---

## 7. Boundary Conditions

Boundary conditions define how water enters or leaves the model domain.

| Boundary         | Possible Input                                 |
| ---------------- | ---------------------------------------------- |
| Upstream         | Flow / discharge / hydrograph                  |
| Downstream       | Water level / normal depth / rating curve      |
| Lateral Boundary | Flow or water-level condition where applicable |

The exact boundary conditions depend on the selected modelling scenario.

---

## 8. Flood / Breach Scenario Inputs

RIO can represent a defined flood scenario and, where applicable, a dam or hydraulic-structure breach scenario.

| Input Field           | Description                              |
| --------------------- | ---------------------------------------- |
| Scenario Type         | Type of flood scenario                   |
| Structure / Dam       | Structure involved in the scenario       |
| Breach Date           | Date associated with the breach scenario |
| Breach Time           | Time associated with the breach          |
| Breach Width          | Final breach width                       |
| Breach Formation Time | Time required for breach development     |
| Breach Elevation      | Elevation associated with the breach     |
| Initial Conditions    | Conditions before the event              |
| Downstream Conditions | Conditions downstream of the structure   |

All scenario-specific values should be verified against the final model configuration.

---

## 9. Simulation Settings

Simulation settings determine how the model is executed.

| Input Field      | Description                               |
| ---------------- | ----------------------------------------- |
| Simulation Start | Beginning of the simulation               |
| Simulation End   | End of the simulation                     |
| Time Step        | Computational time interval               |
| Output Interval  | Frequency at which results are saved      |
| Model Resolution | Spatial resolution of the simulation      |
| Simulation Type  | Type of hydraulic/hydrodynamic simulation |

---

## 10. Model Selection

RIO can use different modelling approaches depending on the scenario and available data.

The modelling layer can include hydraulic or hydrodynamic models such as:
* Delft3D
* HEC-RAS
others 

The selected model determines the required input format, parameters, computational approach, and output variables.

The model-specific methodology is documented separately in:

* `delft3d-model.md`
* Additional model documentation where required

---

## 11. Input → Model → Output

The general RIO data flow is:

```text
Study Area
    ↓
Terrain
    ↓
River Geometry
    ↓
Hydraulic Parameters
    ↓
Flow Conditions
    ↓
Boundary Conditions
    ↓
Flood / Breach Scenario
    ↓
Simulation Settings
    ↓
Hydraulic / Hydrodynamic Model
    ↓
Model Results
    ↓
Inundation Processing
    ↓
RIO Visualization
```

---

## 12. Model Outputs

The configured model can produce outputs such as:

* Water-surface elevation
* Flood depth
* Flow velocity
* Discharge
* Flow direction
* Inundation extent

These outputs are subsequently processed for visualization and interpretation within RIO.

---

## 13. Flood Depth Calculation

A simplified representation of flood depth is:

```text
Flood Depth =
Water Surface Elevation − Terrain Elevation
```

Locations where the calculated water depth is positive can represent potentially inundated areas.

The resulting spatial information can be used to generate inundation maps.

---

## 14. Data Validation

Before running a simulation, input data should be checked for:

* Missing values
* Incorrect units
* Invalid geographic coordinates
* Inconsistent coordinate systems
* Unrealistic flow values
* Missing boundary conditions
* Invalid terrain data
* Incorrect geometry
* Inconsistent simulation times

Input validation helps prevent incorrect or unstable model configurations.

---

## 15. Reproducibility

For a reproducible RIO simulation, the following should be recorded:

* Input datasets
* Dataset sources
* Coordinate reference system
* Terrain resolution
* River geometry
* Manning's roughness
* Flow conditions
* Boundary conditions
* Flood / breach parameters
* Simulation period
* Time step
* Model version
* Processing methodology

The final values should always be verified against the actual model configuration before being treated as authoritative.

---

## 16. Limitations

Model results depend on the quality of the input data and assumptions used during simulation.

Important sources of uncertainty include:

* Terrain accuracy
* River geometry
* Flow uncertainty
* Boundary conditions
* Roughness coefficients
* Model resolution
* Breach assumptions
* Hydraulic structures
* Numerical assumptions

Therefore, RIO outputs should be interpreted as model-based representations of the selected scenario rather than exact guarantees of real-world flooding.

---

## 17. Summary

RIO converts multiple types of geographic and hydraulic information into a flood inundation result.

```text
INPUTS
  │
  ├── Terrain
  ├── River Geometry
  ├── Manning's n
  ├── Flow
  ├── Boundary Conditions
  ├── Flood / Breach Scenario
  └── Simulation Settings
          │
          ▼
    MODEL SIMULATION
          │
          ▼
       RESULTS
          │
          ├── Water Level
          ├── Depth
          ├── Velocity
          └── Inundation Extent
          │
          ▼
    RIO VISUALIZATION
```
