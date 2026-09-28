# RIO System Architecture

## 1. Overview

RIO is composed of several logical layers that work together to transform input data into a visual representation of flood inundation.

## 2. High-Level Architecture

.
                 ┌─────────────────────┐
                 │      User / Judge   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      RIO Frontend   │
                 │  Maps & Visual UI   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       Backend       │
                 │ Data / API Layer    │
                 └──────────┬──────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
   ┌──────────────────┐          ┌──────────────────┐
   │  Input / Geo Data │          │     DELFT3D     │
   │ Terrain / Flow    │─────────▶│ Hydraulic Model  │
   └──────────────────┘          └────────┬─────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Hydraulic Results
                                (kml and sph files)│
                                │ Depth / Velocity │
                                │ Water Surface    │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │ Inundation Data  │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │ RIO Visualization│
                                └──────────────────┘
