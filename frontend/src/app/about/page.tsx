'use client';
import { useState } from 'react';
import {
  Info, Waves, AlertTriangle, BookOpen, Cpu, Satellite,
  Globe, Activity, MapPin, BarChart2, Shield, ChevronDown, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SECTIONS = [
  {
    id: 'sih', icon: <Shield className="h-5 w-5" />, title: 'SIH Problem Statement',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          The Smart India Hackathon (SIH) problem addressed by this platform is the development of a
          <strong className="text-slate-800"> generalized software framework</strong> for dam-break analysis,
          river blockage analysis, flash-flood scenario generation, and flood inundation simulation.
        </p>
        <div className="bg-orange-100 rounded-lg p-4 space-y-1">
          {[
            'Dam-break analysis (parametric breach models)',
            'River blockage / landslide dam analysis',
            'Natural lake / glacial lake outburst (GLOF) analysis',
            'Flash-flood scenario generation',
            'Flood inundation simulation (depth, velocity, arrival time)',
            'Hydrological data processing',
            'DEM processing (slope, hillshade, flow direction)',
            'Satellite data integration (Sentinel-1/2, Landsat)',
            'Loss, damage and impact analysis',
            'Model comparison (SPH vs Delft3D)',
            'GIS visualization and export (SHP/KML/GeoJSON/GeoTIFF)',
            'Near-real-time flood analysis',
            'HADR decision support',
          ].map(item => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'hadr', icon: <Shield className="h-5 w-5" />, title: 'HADR — Humanitarian Assistance & Disaster Relief',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          HADR operations require <strong className="text-slate-800">rapid, accurate situational awareness</strong> during
          flood events. This platform provides pre-computed flood inundation maps, impact estimates, and
          geospatial exports to support civil authorities, NDRF, and disaster management agencies.
        </p>
        <p>
          By running simulations <em>before</em> a dam failure occurs using parametric breach scenarios,
          response teams can pre-position resources, identify evacuation routes, and prioritize at-risk
          settlements. The platform is designed for use in command-and-control contexts where decisions must be
          made under uncertainty with incomplete real-time data.
        </p>
      </div>
    ),
  },
  {
    id: 'dam-break', icon: <Waves className="h-5 w-5" />, title: 'Dam-Break Analysis',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          Dam-break analysis models the catastrophic or partial failure of a dam structure, computing the
          downstream flood wave propagation. The <strong className="text-slate-800">breach hydrograph</strong> —
          the discharge time series at the dam — is computed using parametric formulas.
        </p>
        <div className="bg-orange-100 rounded-lg p-4 font-mono text-xs space-y-2">
          <div className="text-orange-400">Simplified rectangular breach formula:</div>
          <div className="text-slate-800">Q = Cd × Bw × √(2g) × h<sup>1.5</sup></div>
          <div className="text-slate-500">where:</div>
          <div className="text-slate-600">  Cd = 0.577 (discharge coefficient)</div>
          <div className="text-slate-600">  Bw = breach width (m)</div>
          <div className="text-slate-600">  h  = head of water above breach (m)</div>
          <div className="text-slate-600">  g  = 9.81 m/s²</div>
        </div>
        <p>
          The resulting hydrograph drives the downstream hydraulic simulation (SPH or Delft3D), which
          computes flood depth, velocity, and arrival time throughout the study area.
        </p>
      </div>
    ),
  },
  {
    id: 'dem', icon: <MapPin className="h-5 w-5" />, title: 'DEM — Digital Elevation Model',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          The Digital Elevation Model (DEM) is the terrain representation that drives flood routing.
          Elevation data determines flow direction, flood extent, and depth.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'SRTM', res: '30 m', desc: 'NASA Shuttle Radar Topography Mission. Global coverage.' },
            { label: 'Cartosat', res: '5–10 m', desc: 'ISRO CartoDEM. India-specific, high accuracy.' },
            { label: 'TanDEM-X', res: '12 m', desc: 'DLR X-band radar. Very high accuracy.' },
            { label: 'LiDAR', res: '<1 m', desc: 'Airborne/terrestrial. Highest accuracy for critical infrastructure.' },
          ].map(d => (
            <div key={d.label} className="bg-orange-100 rounded-lg p-3">
              <div className="font-semibold text-slate-800">{d.label}</div>
              <div className="text-xs text-orange-400">{d.res}</div>
              <div className="text-xs text-slate-500 mt-1">{d.desc}</div>
            </div>
          ))}
        </div>
        <p>Derived products: hillshade, slope, aspect, D8 flow direction, catchment delineation.</p>
      </div>
    ),
  },
  {
    id: 'sph', icon: <Cpu className="h-5 w-5" />, title: 'SPH — Smooth Particle Hydrodynamics',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Current SPH results are MOCK/DEMONSTRATION ONLY. A real SPH solver (e.g., DualSPHysics) has not been installed.
        </div>
        <p>
          SPH is a <strong className="text-slate-800">Lagrangian meshfree method</strong> that represents the fluid
          as a collection of particles. Each particle carries fluid properties (density, velocity, pressure)
          and interacts with neighbouring particles through smoothing kernel functions.
        </p>
        <div className="bg-orange-100 rounded-lg p-4 space-y-2 text-xs">
          <div className="text-orange-400">SPH Advantages for Dam Break:</div>
          <div>• Naturally handles large free-surface deformations</div>
          <div>• No mesh required — automatic wet/dry front tracking</div>
          <div>• Suitable for rapid initial transient of dam break</div>
          <div>• Can model debris and sediment transport</div>
          <div className="text-orange-400 mt-2">Connect real solver:</div>
          <div className="font-mono text-slate-600">Set SPH_EXECUTABLE=/path/to/DualSPHysics in backend/.env</div>
        </div>
      </div>
    ),
  },
  {
    id: 'delft3d', icon: <Activity className="h-5 w-5" />, title: 'Delft3D — Structured Grid Hydraulics',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Current Delft3D results are MOCK/DEMONSTRATION ONLY. Real Delft3D runtime has not been installed.
        </div>
        <p>
          Delft3D-FLOW is a <strong className="text-slate-800">structured curvilinear grid</strong> hydrodynamic
          model solving the 2D shallow water equations (depth-averaged). It is widely used for operational
          flood forecasting, coastal modelling, and river engineering.
        </p>
        <div className="bg-orange-100 rounded-lg p-4 space-y-2 text-xs">
          <div className="text-blue-600">Delft3D Advantages:</div>
          <div>• Operational, production-grade hydraulic modelling</div>
          <div>• Mature calibration and validation tools</div>
          <div>• Widely accepted in engineering and regulatory contexts</div>
          <div>• Integration with Delft3D-FM for unstructured grids</div>
          <div className="text-blue-600 mt-2">Connect real solver:</div>
          <div className="font-mono text-slate-600">Set DELFT3D_EXECUTABLE=/path/to/d_hydro in backend/.env</div>
        </div>
      </div>
    ),
  },
  {
    id: 'satellite', icon: <Satellite className="h-5 w-5" />, title: 'Satellite & GEE Integration',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          The platform is designed to integrate with <strong className="text-slate-800">Google Earth Engine (GEE)</strong>
          for automated satellite data retrieval and flood change detection.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Sentinel-1 SAR', use: 'Flood mapping through cloud cover. C-band backscatter change detection.' },
            { name: 'Sentinel-2', use: 'Optical water index (NDWI, MNDWI) for flood extent mapping when cloud-free.' },
            { name: 'Landsat 8/9', use: 'Historical baseline analysis. Long time series water extent.' },
            { name: 'GPM IMERG', use: 'Near-real-time global precipitation. 30-min, 10km resolution.' },
          ].map(s => (
            <div key={s.name} className="bg-orange-100 rounded-lg p-3">
              <div className="font-semibold text-slate-800 text-sm">{s.name}</div>
              <div className="text-xs text-slate-500 mt-1">{s.use}</div>
            </div>
          ))}
        </div>
        <div className="font-mono text-xs bg-orange-100 rounded p-3 text-slate-600">
          Configure: GEE_PROJECT_ID and GEE_SERVICE_ACCOUNT in backend/.env
        </div>
      </div>
    ),
  },
  {
    id: 'architecture', icon: <Globe className="h-5 w-5" />, title: 'System Architecture',
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        <pre className="bg-orange-100 rounded-lg p-4 text-xs text-orange-600 overflow-x-auto font-mono leading-relaxed">
{`┌─────────────────────────────────────────────────┐
│              RIO      │
├─────────────────────────────────────────────────┤
│  FRONTEND (Next.js 14 + TypeScript)             │
│  ├── Dashboard (MapLibre GL GIS map)            │
│  ├── Demo Runner (pipeline visualization)       │
│  ├── Simulation Wizard (7-step form)            │
│  ├── Results (charts, maps, impact)             │
│  ├── Comparison (SPH vs Delft3D)                │
│  ├── Monitoring (river level, rainfall)         │
│  ├── Exports (GIS file download)                │
│  └── Data Manager (dataset catalog)             │
├─────────────────────────────────────────────────┤
│  BACKEND (FastAPI + Python)                     │
│  ├── Demo API (/api/demo/*)                     │
│  ├── Simulations API (/api/simulations/*)       │
│  ├── GEE API (/api/gee/* — mock)               │
│  ├── Monitoring API (/api/monitoring/*)         │
│  └── Exports API (/api/exports/*)              │
├─────────────────────────────────────────────────┤
│  PIPELINE (Threading / Celery)                  │
│  VALIDATE → PREPROCESS → GENERATE INPUT         │
│  → MOCK SPH → MOCK DELFT3D                      │
│  → POSTPROCESS → IMPACT → EXPORT               │
├─────────────────────────────────────────────────┤
│  MODEL ADAPTERS                                 │
│  ├── SPHModelAdapter (mock → real DualSPHysics) │
│  └── Delft3DModelAdapter (mock → real d_hydro) │
├─────────────────────────────────────────────────┤
│  SERVICES                                       │
│  ├── DemoDataService (synthetic data)           │
│  ├── DamBreakEngine (breach hydrograph)         │
│  ├── DEMProcessor (hillshade, slope)            │
│  ├── ImpactAnalyzer (population, roads)         │
│  └── GISExporter (GeoJSON/KML/SHP/GeoTIFF/CSV) │
├─────────────────────────────────────────────────┤
│  INFRASTRUCTURE (Docker Compose)               │
│  ├── frontend:3000                             │
│  ├── backend:8000                              │
│  ├── postgres+postgis:5432                     │
│  ├── redis:6379                                │
│  └── worker (Celery)                           │
└─────────────────────────────────────────────────┘`}
        </pre>
      </div>
    ),
  },
];

export default function AboutPage() {
  const [openSection, setOpenSection] = useState<string | null>('sih');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Waves className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">RIO</h1>
            <p className="text-slate-500 text-sm">SIH Problem — Generalized Framework for Dam-Break &amp; Flood Analysis</p>
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed">
          A scientific computing platform for dam-break analysis, river blockage analysis, flash-flood
          scenario generation, and flood inundation simulation. Designed for Humanitarian Assistance and
          Disaster Relief (HADR) decision support, integrating SPH and Delft3D hydraulic models with
          GIS visualization, satellite data, and automated impact analysis.
        </p>
        <div className="flex flex-wrap gap-2">
          
        </div>
      </div>

      {/* Mock disclaimer */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-amber-700 text-sm">Important: Current Status</div>
          <p className="text-amber-700/80 text-sm mt-1">
            All SPH and Delft3D outputs in this platform are <strong>MOCK/DEMONSTRATION ONLY</strong>.
            The real DualSPHysics and Delft3D-FLOW solvers have not been installed. The model adapters are
            complete and ready — only the solver executables need to be provided. Synthetic DEM, hydrology,
            and infrastructure data are used. Results must not be used for any real emergency or engineering decisions.
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Stages', value: '9', icon: <Activity className="h-5 w-5 text-orange-400" /> },
          { label: 'Export Formats', value: '5', icon: <Globe className="h-5 w-5 text-blue-600" /> },
          { label: 'API Endpoints', value: '30+', icon: <BarChart2 className="h-5 w-5 text-orange-400" /> },
          { label: 'GIS Layers', value: '10+', icon: <MapPin className="h-5 w-5 text-green-600" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                </div>
                {s.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SIH Problem Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-400" />
            SIH Problem → Platform Feature Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-200">
                  <th className="text-left py-2 pr-4 text-slate-500">SIH Requirement</th>
                  <th className="text-left py-2 pr-4 text-slate-500">Platform Feature</th>
                  <th className="text-left py-2 text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  ['Dam-break analysis', 'DamBreakEngine + breach hydrograph', 'IMPLEMENTED'],
                  ['River blockage analysis', 'Scenario type: RIVER_BLOCKAGE', 'UI READY'],
                  ['Flash-flood scenarios', 'Scenario type: FLASH_FLOOD', 'UI READY'],
                  ['GLOF analysis', 'Scenario type: LAKE_OUTBURST', 'UI READY'],
                  ['Flood inundation simulation', 'Mock SPH + Mock Delft3D pipeline', 'MOCK'],
                  ['Hydrological data processing', 'Hydrograph generation + CSV export', 'IMPLEMENTED'],
                  ['DEM processing', 'DEMProcessor: hillshade, slope, flow dir', 'IMPLEMENTED'],
                  ['Satellite data integration', 'GEE API (mock provider ready)', 'MOCK'],
                  ['Loss & damage analysis', 'ImpactAnalyzer: population, roads, bldgs', 'IMPLEMENTED'],
                  ['Model comparison', 'SPH vs Delft3D comparison page', 'IMPLEMENTED'],
                  ['GIS visualization', 'MapLibre GL JS with layer controls', 'IMPLEMENTED'],
                  ['SHP/KML/GeoJSON/GeoTIFF export', 'GISExporter service', 'IMPLEMENTED'],
                  ['Near-real-time analysis', 'Monitoring page + GEE abstraction', 'MOCK'],
                  ['HADR decision support', 'Impact cards + HADR dashboard', 'IMPLEMENTED'],
                  ['Delft3D integration', 'Delft3DModelAdapter (mock → real)', 'ADAPTER READY'],
                  ['SPH integration', 'SPHModelAdapter (mock → real)', 'ADAPTER READY'],
                ].map(([req, feat, status]) => (
                  <tr key={req} className="border-b border-orange-200 hover:bg-orange-100/30">
                    <td className="py-2 pr-4 text-slate-600">{req}</td>
                    <td className="py-2 pr-4 text-slate-500 font-mono">{feat}</td>
                    <td className="py-2">
                      <Badge variant={status === 'IMPLEMENTED' ? 'success' : status === 'MOCK' ? 'warning' : status === 'ADAPTER READY' ? 'default' : 'secondary'} className="text-[10px]">
                        {status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Accordion sections */}
      <div className="space-y-3">
        {SECTIONS.map(section => (
          <Card key={section.id}>
            <button
              className="w-full text-left px-5 py-4"
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-orange-400">{section.icon}</div>
                  <span className="font-semibold text-slate-800">{section.title}</span>
                </div>
                {openSection === section.id ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
              </div>
            </button>
            {openSection === section.id && (
              <div className="px-5 pb-5">
                {section.content}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Credits */}
      <div className="text-center text-xs text-slate-500 space-y-1 pb-4">
        <p>RIO — SIH Project</p>
        <p>Built with Next.js, FastAPI, MapLibre GL JS, NumPy, and open-source GIS libraries.</p>
        <p className="text-amber-700">All simulation outputs are MOCK/DEMONSTRATION DATA. Not for real emergency use.</p>
      </div>
    </div>
  );
}
