'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Waves } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FloodResultCard } from '@/components/results/FloodResultCard';
import { ImpactCard } from '@/components/results/ImpactCard';
import HydrographChart from '@/components/charts/HydrographChart';
import {
  MOCK_SPH_RESULT, MOCK_DELFT3D_RESULT,
  MOCK_SPH_IMPACT, MOCK_DELFT3D_IMPACT,
  generateMockHydrology
} from '@/lib/mockData';
import { getSimulationResults, getSimulationImpact } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell
} from 'recharts';

const TABS = ['Hydrology', 'Dam Break', 'Flood Results', 'Impact Analysis', 'Exports'] as const;
type Tab = typeof TABS[number];

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('Hydrology');
  const [sphResult, setSphResult] = useState(MOCK_SPH_RESULT);
  const [d3dResult, setD3dResult] = useState(MOCK_DELFT3D_RESULT);
  const [sphImpact, setSphImpact] = useState(MOCK_SPH_IMPACT);
  const [d3dImpact, setD3dImpact] = useState(MOCK_DELFT3D_IMPACT);
  const hydrology = generateMockHydrology();

  useEffect(() => {
    // Try backend, fall back to mock
    getSimulationResults(id).then(res => {
      if (res.data?.sph_result) setSphResult(res.data.sph_result);
      if (res.data?.delft3d_result) setD3dResult(res.data.delft3d_result);
    }).catch(() => {});
    getSimulationImpact(id).then(res => {
      if (res.data?.sph_impact) setSphImpact(res.data.sph_impact);
      if (res.data?.delft3d_impact) setD3dImpact(res.data.delft3d_impact);
    }).catch(() => {});
  }, [id]);

  const depthDistData = [
    { range: '0–0.5m', sph: 12.1, d3d: 11.2 },
    { range: '0.5–1m', sph: 9.3, d3d: 10.5 },
    { range: '1–2m', sph: 8.8, d3d: 9.6 },
    { range: '2–5m', sph: 7.9, d3d: 8.4 },
    { range: '>5m', sph: 4.4, d3d: 4.4 },
  ];

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
  const exports = [
    { label: 'SPH Flood Extent (GeoJSON)', path: sphResult.file_paths?.flood_extent, fmt: 'GeoJSON' },
    { label: 'SPH Flood Extent (KML)', path: null, fmt: 'KML' },
    { label: 'SPH Flood Depth (GeoTIFF)', path: sphResult.file_paths?.flood_depth, fmt: 'GeoTIFF' },
    { label: 'SPH Velocity (GeoTIFF)', path: sphResult.file_paths?.velocity, fmt: 'GeoTIFF' },
    { label: 'SPH Discharge (CSV)', path: sphResult.file_paths?.discharge, fmt: 'CSV' },
    { label: 'Delft3D Flood Extent (GeoJSON)', path: d3dResult.file_paths?.flood_extent, fmt: 'GeoJSON' },
    { label: 'Delft3D Flood Depth (GeoTIFF)', path: d3dResult.file_paths?.flood_depth, fmt: 'GeoTIFF' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/simulations/${id}`}>
          <button className="p-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-orange-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Simulation Results</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{id.slice(0, 12)}...</span>          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Results shown are from MOCK SPH and MOCK Delft3D implementations using synthetic data. Not real flood modelling outputs. Do not use for any real-world decisions.</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'SPH Inundation', value: `${sphResult.inundation_area_km2} km²`, sub: 'MOCK', color: 'orange' },
          { label: 'D3D Inundation', value: `${d3dResult.inundation_area_km2} km²`, sub: 'MOCK', color: 'blue' },
          { label: 'Peak Discharge', value: `${sphResult.peak_discharge_m3s.toLocaleString()} m³/s`, sub: 'Both models', color: 'orange' },
          { label: 'Affected Population', value: sphImpact.affected_population.toLocaleString(), sub: 'SPH estimate', color: 'amber' },
        ].map(card => (
          <Card key={card.label} className={`border-${card.color}-700/30`}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-2xl font-bold text-${card.color}-400 mt-1`}>{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-orange-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Hydrology' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Breach Hydrograph</CardTitle>
              <CardDescription>Synthetic 72-hour hydrological time series showing dam-break event</CardDescription>
            </CardHeader>
            <CardContent>
              <HydrographChart data={hydrology} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Peak Discharge', value: '7,052 m³/s', sub: 'Hour 30' },
              { label: 'Water Level at Peak', value: '1,193.5 m', sub: 'asl' },
              { label: 'Recession Duration', value: '37 hrs', sub: 'After peak' },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{m.value}</p>
                  <p className="text-xs text-slate-500">{m.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'Dam Break' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Breach Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ['Breach Width', '80 m'],
                  ['Breach Depth', '65 m'],
                  ['Breach Elevation', '1,130 m asl'],
                  ['Formation Time', '0.5 hrs'],
                  ['Peak Discharge', '7,052 m³/s'],
                  ['Formula', 'Q = Cd × Bw × √(2g) × h^1.5'],
                  ['Cd', '0.577 (rectangular breach)'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-slate-800 font-mono text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dam Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ['Name', 'Demo Himalayan Reservoir Dam'],
                  ['Type', 'Gravity Dam'],
                  ['Height', '85 m'],
                  ['Crest Elevation', '1,200 m asl'],
                  ['Reservoir Volume', '150 MCM'],
                  ['Spillway Design', '5,500 m³/s'],
                  ['Hydropower', '120 MW'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-slate-800 text-right">{v}</dd>
                  </div>
                ))}
              </dl>            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Flood Results' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FloodResultCard result={sphResult} model="SPH" />
            <FloodResultCard result={d3dResult} model="DELFT3D" />
          </div>
          {/* Depth distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Flood Depth Distribution</CardTitle>
              <CardDescription>Inundated area (km²) by depth class — SPH vs Delft3D</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={depthDistData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} label={{ value: 'km²', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6 }} />
                  <Bar dataKey="sph" name="SPH (MOCK)" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="d3d" name="Delft3D (MOCK)" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Impact Analysis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImpactCard impact={sphImpact} model="SPH" />
            <ImpactCard impact={d3dImpact} model="Delft3D" />
          </div>
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            PRELIMINARY DEMONSTRATION ESTIMATE — Based on synthetic settlements, roads and infrastructure. Not for real emergency decisions.
          </div>
        </div>
      )}

      {tab === 'Exports' && (
        <Card>
          <CardHeader>
            <CardTitle>Available Exports</CardTitle>
            <CardDescription>GIS files generated by the simulation pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-200">
                    <th className="text-left py-2 pr-4 text-slate-500">File</th>
                    <th className="text-left py-2 pr-4 text-slate-500">Format</th>
                    <th className="text-right py-2 text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((e, i) => (
                    <tr key={i} className="border-b border-orange-200 hover:bg-orange-100/50">
                      <td className="py-2 pr-4 text-slate-600">{e.label}</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-slate-500">{e.fmt}</span>
                      </td>
                      <td className="py-2 text-right">
                        {e.path ? (
                          <a href={`${API_BASE}/api/exports/download?path=${encodeURIComponent(e.path)}`}
                            className="text-orange-400 hover:text-orange-600 text-xs" download>
                            ↓ Download
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">Backend required</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
