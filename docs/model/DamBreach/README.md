#  Dam Breach Model

This directory contains the core project files used for the RIO flood inundation modelling workflow.

## Model

The model represents a dam-breach flood scenario configured in RIO

The project files include:

- Project configuration
- 2D/geometry configuration
- Flow and boundary-condition configuration
- Initial conditions
- Simulation plan
-  Mapper configuration

## Files

| File | Purpose |
|---|---|
| `DamBreach.prj` |  project configuration |
| `DamBreach.g02` | Model geometry |
| `DamBreach.p01` | Simulation plan |
| `DamBreach.u01` | Unsteady-flow configuration |
| `DamBreach.x01` | Additional model configuration |
| `DamBreach.bco01` | Boundary-condition configuration |
| `DamBreach.ic.01` | Initial-condition configuration |
| `DamBreach.rasmap` |  Mapper configuration |

## Note

The repository contains the core model configuration required to document the RIO modelling workflow. Large generated result files and source GIS/workshop datasets are intentionally excluded from this directory.
