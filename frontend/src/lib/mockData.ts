'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Central mock / demo data for the HADR platform frontend.
// Used when the backend is not available or to pre-populate pages.
// All values are SYNTHETIC DEMONSTRATION DATA.
// ─────────────────────────────────────────────────────────────────────────────

import type { SimulationJobStatus, FloodResult, ImpactResult, ModelComparison, HydrologyPoint } from '@/types';

// Re-export locally so pages don't need two imports
export type { SimulationJobStatus, FloodResult, ImpactResult, ModelComparison, HydrologyPoint };

// ── Simulations ────────────────────────────────────────────────────────────
export interface MockSimulation {
  id: string;
  name: string;
  project: string;
  river: string;
  dam: string;
  scenario: string;
  model: string;
  status: string;
  created: string;
  inundated_area_km2: number;
  max_depth_m: number;
  affected_population: number;
  is_demo: boolean;
}

export const MOCK_SIMULATIONS: MockSimulation[] = [
  {
    id: 'sim-demo-001',
    name: 'Catastrophic Dam Break — Demo',
    project: 'Synthetic Himalayan Study',
    river: 'Demo Himalayan Tributary',
    dam: 'Demo Himalayan Reservoir Dam',
    scenario: 'DAM_BREAK',
    model: 'SPH + Delft3D',
    status: 'COMPLETED',
    created: '2024-06-15T06:00:00Z',
    inundated_area_km2: 42.5,
    max_depth_m: 14.2,
    affected_population: 5220,
    is_demo: true,
  },
  {
    id: 'sim-demo-002',
    name: 'Moderate Breach Scenario',
    project: 'Synthetic Himalayan Study',
    river: 'Demo Himalayan Tributary',
    dam: 'Demo Himalayan Reservoir Dam',
    scenario: 'DAM_BREAK',
    model: 'SPH',
    status: 'COMPLETED',
    created: '2024-06-14T10:30:00Z',
    inundated_area_km2: 28.3,
    max_depth_m: 9.1,
    affected_population: 2840,
    is_demo: true,
  },
  {
    id: 'sim-demo-003',
    name: 'Flash Flood — Upper Catchment',
    project: 'Synthetic Himalayan Study',
    river: 'Demo Himalayan Tributary',
    dam: 'Demo Himalayan Reservoir Dam',
    scenario: 'FLASH_FLOOD',
    model: 'Delft3D',
    status: 'FAILED',
    created: '2024-06-13T14:00:00Z',
    inundated_area_km2: 0,
    max_depth_m: 0,
    affected_population: 0,
    is_demo: true,
  },
  {
    id: 'sim-demo-004',
    name: 'River Blockage Analysis',
    project: 'Synthetic Himalayan Study',
    river: 'Demo Himalayan Tributary',
    dam: 'Demo Himalayan Reservoir Dam',
    scenario: 'RIVER_BLOCKAGE',
    model: 'SPH + Delft3D',
    status: 'RUNNING',
    created: '2024-06-16T08:00:00Z',
    inundated_area_km2: 0,
    max_depth_m: 0,
    affected_population: 0,
    is_demo: true,
  },
];

// ── Hydrology ──────────────────────────────────────────────────────────────
export function generateMockHydrology(): HydrologyPoint[] {
  const data: HydrologyPoint[] = [];
  for (let hour = 0; hour < 72; hour++) {
    let q: number, wl: number, rain: number, stage: string;
    if (hour < 24) {
      q = 52 + Math.sin(hour * 0.3) * 5;
      wl = 1180 + Math.sin(hour * 0.2) * 0.2;
      rain = 8 + Math.random() * 3;
      stage = 'NORMAL';
    } else if (hour < 26) {
      q = 52 + (hour - 24) * 200;
      wl = 1180 + (hour - 24) * 4;
      rain = 2;
      stage = 'BREACH_START';
    } else if (hour < 30) {
      q = 452 + (hour - 26) * 1650;
      wl = 1188 + (hour - 26) * 1.5;
      rain = 1;
      stage = 'RAPID_RISE';
    } else if (hour < 35) {
      q = 7052 + Math.sin(hour) * 100;
      wl = 1193.5 + Math.sin(hour) * 0.2;
      rain = 0.5;
      stage = 'PEAK';
    } else {
      const t = hour - 35;
      q = Math.max(55, 7052 * Math.exp(-0.12 * t));
      wl = Math.max(1181, 1193.5 - t * 0.75);
      rain = Math.max(0, 3 - t * 0.2);
      stage = 'RECESSION';
    }
    data.push({
      timestamp: `2024-06-15T${String(hour % 24).padStart(2, '0')}:00:00Z`,
      hour,
      discharge_m3s: Math.round(q * 10) / 10,
      water_level_m: Math.round(wl * 100) / 100,
      rainfall_mm_hr: Math.round(rain * 10) / 10,
      velocity_ms: Math.round((q / 85) * 1000) / 1000,
      stage,
      is_demo: true,
    });
  }
  return data;
}

// ── Flood Results ──────────────────────────────────────────────────────────
export const MOCK_SPH_RESULT: FloodResult = {
  model: 'SPH',
  is_mock: true,
  disclaimer: 'MOCK SPH — DEMONSTRATION ONLY. Not a validated SPH solver output.',
  max_depth_m: 14.2,
  avg_depth_m: 4.8,
  max_velocity_ms: 8.4,
  inundation_area_km2: 42.5,
  peak_discharge_m3s: 7052,
  arrival_time_hrs: 0.38,
  output_dir: '/storage/projects/sim-demo-001/outputs/sph',
  file_paths: {
    flood_depth: '/storage/projects/sim-demo-001/outputs/sph/flood_depth.npy',
    velocity: '/storage/projects/sim-demo-001/outputs/sph/velocity.npy',
    arrival_time: '/storage/projects/sim-demo-001/outputs/sph/arrival_time.npy',
    flood_extent: '/storage/projects/sim-demo-001/outputs/sph/flood_extent.geojson',
    discharge: '/storage/projects/sim-demo-001/outputs/sph/discharge.csv',
  },
};

export const MOCK_DELFT3D_RESULT: FloodResult = {
  model: 'DELFT3D',
  is_mock: true,
  disclaimer: 'MOCK DELFT3D — DEMONSTRATION ONLY. Not a validated Delft3D solver output.',
  max_depth_m: 13.8,
  avg_depth_m: 4.5,
  max_velocity_ms: 7.9,
  inundation_area_km2: 44.1,
  peak_discharge_m3s: 7052,
  arrival_time_hrs: 0.41,
  output_dir: '/storage/projects/sim-demo-001/outputs/delft3d',
  file_paths: {
    flood_depth: '/storage/projects/sim-demo-001/outputs/delft3d/flood_depth.npy',
    velocity: '/storage/projects/sim-demo-001/outputs/delft3d/velocity.npy',
    arrival_time: '/storage/projects/sim-demo-001/outputs/delft3d/arrival_time.npy',
    flood_extent: '/storage/projects/sim-demo-001/outputs/delft3d/flood_extent.geojson',
    discharge: '/storage/projects/sim-demo-001/outputs/delft3d/discharge.csv',
  },
};

// ── Impact ─────────────────────────────────────────────────────────────────
export const MOCK_SPH_IMPACT: ImpactResult = {
  model: 'SPH',
  is_mock: true,
  is_preliminary: true,
  disclaimer: 'PRELIMINARY DEMONSTRATION ESTIMATE — Based on synthetic data. NOT for real emergency decisions.',
  affected_population: 5220,
  affected_villages: 6,
  affected_buildings: 170,
  affected_roads_km: 42.3,
  affected_bridges: 2,
  affected_agriculture_ha: 312,
  affected_infrastructure: 3,
  impact_categories: {
    LOW: { applicable: true, area_fraction: 0.25, estimated_area_km2: 10.6 },
    MODERATE: { applicable: true, area_fraction: 0.40, estimated_area_km2: 17.0 },
    HIGH: { applicable: true, area_fraction: 0.25, estimated_area_km2: 10.6 },
    VERY_HIGH: { applicable: true, area_fraction: 0.10, estimated_area_km2: 4.3 },
  },
  flood_area_km2: 42.5,
  max_depth_m: 14.2,
};

export const MOCK_DELFT3D_IMPACT: ImpactResult = {
  model: 'DELFT3D',
  is_mock: true,
  is_preliminary: true,
  disclaimer: 'PRELIMINARY DEMONSTRATION ESTIMATE — Based on synthetic data. NOT for real emergency decisions.',
  affected_population: 5480,
  affected_villages: 6,
  affected_buildings: 178,
  affected_roads_km: 44.8,
  affected_bridges: 2,
  affected_agriculture_ha: 328,
  affected_infrastructure: 3,
  impact_categories: {
    LOW: { applicable: true, area_fraction: 0.22, estimated_area_km2: 9.7 },
    MODERATE: { applicable: true, area_fraction: 0.42, estimated_area_km2: 18.5 },
    HIGH: { applicable: true, area_fraction: 0.26, estimated_area_km2: 11.5 },
    VERY_HIGH: { applicable: true, area_fraction: 0.10, estimated_area_km2: 4.4 },
  },
  flood_area_km2: 44.1,
  max_depth_m: 13.8,
};

// ── Comparison ─────────────────────────────────────────────────────────────
export const MOCK_COMPARISON: ModelComparison = {
  is_mock: true,
  disclaimer: 'MOCK SPH vs MOCK DELFT3D — Both are demonstration outputs. Differences reflect different propagation algorithms, not validated physical differences.',
  metrics: {
    inundation_area_km2: { sph: 42.5, delft3d: 44.1, difference: 1.6, pct_difference: 3.8 },
    max_depth_m: { sph: 14.2, delft3d: 13.8, difference: -0.4, pct_difference: -2.8 },
    avg_depth_m: { sph: 4.8, delft3d: 4.5, difference: -0.3, pct_difference: -6.3 },
    max_velocity_ms: { sph: 8.4, delft3d: 7.9, difference: -0.5, pct_difference: -6.0 },
    peak_discharge_m3s: { sph: 7052, delft3d: 7052, difference: 0, pct_difference: 0 },
    arrival_time_hrs: { sph: 0.38, delft3d: 0.41, difference: 0.03, pct_difference: 7.9 },
    affected_population: { sph: 5220, delft3d: 5480, difference: 260, pct_difference: 5.0 },
  },
};

// ── Exports ─────────────────────────────────────────────────────────────────
export interface MockExportFile {
  id: string;
  filename: string;
  format: string;
  model: string;
  simulation: string;
  size_kb: number;
  created: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
}

export const MOCK_EXPORTS: MockExportFile[] = [
  { id: 'exp-001', filename: 'flood_extent_sph.geojson', format: 'GeoJSON', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 145, created: '2024-06-15T07:30:00Z', status: 'READY' },
  { id: 'exp-002', filename: 'flood_extent_sph.kml', format: 'KML', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 78, created: '2024-06-15T07:30:00Z', status: 'READY' },
  { id: 'exp-003', filename: 'flood_extent_sph.zip', format: 'SHP', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 320, created: '2024-06-15T07:30:00Z', status: 'READY' },
  { id: 'exp-004', filename: 'flood_depth_sph.tif', format: 'GeoTIFF', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 512, created: '2024-06-15T07:30:00Z', status: 'READY' },
  { id: 'exp-005', filename: 'discharge_sph.csv', format: 'CSV', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 12, created: '2024-06-15T07:30:00Z', status: 'READY' },
  { id: 'exp-006', filename: 'impact_summary_sph.csv', format: 'CSV', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 4, created: '2024-06-15T07:30:00Z', status: 'READY' },
  { id: 'exp-007', filename: 'flood_extent_delft3d.geojson', format: 'GeoJSON', model: 'Delft3D', simulation: 'Catastrophic Dam Break', size_kb: 158, created: '2024-06-15T07:31:00Z', status: 'READY' },
  { id: 'exp-008', filename: 'flood_extent_delft3d.kml', format: 'KML', model: 'Delft3D', simulation: 'Catastrophic Dam Break', size_kb: 85, created: '2024-06-15T07:31:00Z', status: 'READY' },
  { id: 'exp-009', filename: 'flood_depth_delft3d.tif', format: 'GeoTIFF', model: 'Delft3D', simulation: 'Catastrophic Dam Break', size_kb: 525, created: '2024-06-15T07:31:00Z', status: 'READY' },
  { id: 'exp-010', filename: 'velocity_sph.tif', format: 'GeoTIFF', model: 'SPH', simulation: 'Catastrophic Dam Break', size_kb: 495, created: '2024-06-15T07:30:00Z', status: 'READY' },
];

// ── Datasets ──────────────────────────────────────────────────────────────
export interface MockDataset {
  id: string;
  name: string;
  category: string;
  source: string;
  format: string;
  crs: string;
  resolution: string;
  size: string;
  date: string;
  status: string;
}

export const MOCK_DATASETS: MockDataset[] = [
  { id: 'ds-001', name: 'Synthetic Himalayan DEM (128×128)', category: 'DEM', source: 'Synthetic Generator', format: 'GeoTIFF', crs: 'EPSG:4326', resolution: '30 m', size: '64 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-002', name: 'Demo River Network', category: 'River', source: 'Synthetic Generator', format: 'GeoJSON', crs: 'EPSG:4326', resolution: 'Vector', size: '8 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-003', name: 'Demo Himalayan Reservoir Dam', category: 'Dam', source: 'Synthetic Generator', format: 'JSON', crs: 'EPSG:4326', resolution: 'Point', size: '2 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-004', name: 'Synthetic Hydrological Time Series (72h)', category: 'Hydrology', source: 'Synthetic Generator', format: 'CSV', crs: 'N/A', resolution: '1 hr', size: '18 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-005', name: 'Demo Settlements (8 Villages)', category: 'Population', source: 'Synthetic Generator', format: 'GeoJSON', crs: 'EPSG:4326', resolution: 'Point', size: '4 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-006', name: 'Demo Road Network', category: 'Infrastructure', source: 'Synthetic Generator', format: 'GeoJSON', crs: 'EPSG:4326', resolution: 'Vector', size: '5 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-007', name: 'Demo Agricultural Zones', category: 'Infrastructure', source: 'Synthetic Generator', format: 'GeoJSON', crs: 'EPSG:4326', resolution: 'Polygon', size: '3 KB', date: '2024-06-15', status: 'VALIDATED' },
  { id: 'ds-008', name: 'Mock Sentinel-1 SAR (Not Configured)', category: 'Satellite', source: 'Google Earth Engine (Mock)', format: 'GeoTIFF', crs: 'EPSG:32644', resolution: '10 m', size: '—', date: '—', status: 'NOT_CONFIGURED' },
  { id: 'ds-009', name: 'GPM IMERG Rainfall (Not Configured)', category: 'Satellite', source: 'Google Earth Engine (Mock)', format: 'NetCDF', crs: 'EPSG:4326', resolution: '10 km', size: '—', date: '—', status: 'NOT_CONFIGURED' },
];

// ── Monitoring mock data ──────────────────────────────────────────────────
export const MOCK_MONITORING = {
  alert_level: 'ORANGE',
  river_level_status: 'RISING',
  last_updated: new Date().toISOString(),
  sentinel1: { status: 'NOT_CONFIGURED', last_acquisition: '—', coverage: '—' },
  sentinel2: { status: 'NOT_CONFIGURED', last_acquisition: '—', cloud_cover: '—' },
  rainfall: { status: 'NOT_CONFIGURED', last_24h_mm: '—', catchment_avg_mm: '—' },
  river_gauge: { status: 'DEMO', current_level_m: 1182.4, threshold_warning_m: 1185.0, threshold_danger_m: 1190.0 },
  alerts: [
    { id: 'alert-001', type: 'FLOOD_WATCH', severity: 'HIGH', message: 'DEMO: River level rising rapidly near Demo Dam.', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), is_demo: true },
    { id: 'alert-002', type: 'RAINFALL_ALERT', severity: 'MODERATE', message: 'DEMO: Heavy rainfall forecast in upper catchment (>100mm/24h).', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), is_demo: true },
    { id: 'alert-003', type: 'SYSTEM', severity: 'INFO', message: 'GEE satellite integration not configured. Using mock data.', timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), is_demo: false },
  ],
};
