'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, Info, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ComparisonTable from '@/components/results/ComparisonTable';
import HydrographChart from '@/components/charts/HydrographChart';
import { MOCK_COMPARISON, MOCK_SPH_RESULT, MOCK_DELFT3D_RESULT, generateMockHydrology } from '@/lib/mockData';
import { getSimulationComparison } from '@/lib/api';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import type { ModelComparison } from '@/types';

export default function ComparisonPage() {
  const { id } = useParams<{ id: string }>();
  const [comparison, setComparison] = useState<ModelComparison>(MOCK_COMPARISON);
  const hydrology = generateMockHydrology();

  useEffect(() => {
    getSimulationComparison(id)
      .then(res => { if (res.data?.metrics) setComparison(res.data); })
      .catch(() => {});
  }, [id]);

  // Normalized radar data (0–100 scale)
  const radarData = [
    { metric: 'Inundation', sph: 96, d3d: 100 },
    { metric: 'Max Depth', sph: 100, d3d: 97 },
    { metric: 'Velocity', sph: 100, d3d: 94 },
    { metric: 'Arrival\nTime', sph: 100, d3d: 93 },
    { metric: 'Avg Depth', sph: 100, d3d: 94 },
  ];

  const barData = [
    { name: 'Inundation\n(km²)', sph: MOCK_SPH_RESULT.inundation_area_km2, d3d: MOCK_DELFT3D_RESULT.inundation_area_km2 },
    { name: 'Max Depth\n(m)', sph: MOCK_SPH_RESULT.max_depth_m, d3d: MOCK_DELFT3D_RESULT.max_depth_m },
    { name: 'Max Vel.\n(m/s)', sph: MOCK_SPH_RESULT.max_velocity_ms, d3d: MOCK_DELFT3D_RESULT.max_velocity_ms },
    { name: 'Avg Depth\n(m)', sph: MOCK_SPH_RESULT.avg_depth_m, d3d: MOCK_DELFT3D_RESULT.avg_depth_m },
    { name: 'Arrival\n(hrs)', sph: MOCK_SPH_RESULT.arrival_time_hrs, d3d: MOCK_DELFT3D_RESULT.arrival_time_hrs },
  ];

  const DiffIcon = ({ val }: { val: number }) =>
    val > 0 ? <TrendingUp className="h-3.5 w-3.5 text-red-600" /> :
    val < 0 ? <TrendingDown className="h-3.5 w-3.5 text-green-600" /> :
    <Minus className="h-3.5 w-3.5 text-slate-500" />;

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
          <h1 className="text-xl font-bold text-slate-800">Model Comparison</h1>
          <div className="flex items-center gap-2 mt-1">            <span className="text-slate-500 text-sm">vs</span>          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong>DEMO / MOCK MODEL OUTPUT.</strong> Neither SPH nor Delft3D real solvers are installed.
          Both outputs use deterministic synthetic algorithms with different propagation parameters.
          The comparison reflects algorithmic differences, not validated physical model differences.
          Results must not be used for any real engineering or emergency decisions.
        </span>
      </div>

      {/* Model info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            name: 'SPH (Mock)', color: 'orange',
            desc: 'Smooth Particle Hydrodynamics — Lagrangian particle-based approach. Sharper flood front, narrower lateral spread.',
            params: 'Decay=0.55 | Velocity coef=0.85 | Wave speed=8.5 m/s',
            area: MOCK_SPH_RESULT.inundation_area_km2, depth: MOCK_SPH_RESULT.max_depth_m,
            vel: MOCK_SPH_RESULT.max_velocity_ms, arr: MOCK_SPH_RESULT.arrival_time_hrs,
          },
          {
            name: 'Delft3D (Mock)', color: 'blue',
            desc: 'Delft3D-FLOW — Structured curvilinear grid hydrodynamic model. Higher diffusion coefficient, broader flood extent.',
            params: 'Decay=0.65 | Diffusion=1.18 | Wave speed=7.8 m/s',
            area: MOCK_DELFT3D_RESULT.inundation_area_km2, depth: MOCK_DELFT3D_RESULT.max_depth_m,
            vel: MOCK_DELFT3D_RESULT.max_velocity_ms, arr: MOCK_DELFT3D_RESULT.arrival_time_hrs,
          },
        ].map(m => (
          <Card key={m.name} className={`border-${m.color}-700/40`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className={`text-${m.color}-300`}>{m.name}</CardTitle>              </div>
              <CardDescription>{m.desc}</CardDescription>
              <p className={`text-[11px] font-mono text-${m.color}-500/80 mt-1`}>{m.params}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Inundation', value: `${m.area} km²` },
                  { label: 'Max Depth', value: `${m.depth} m` },
                  { label: 'Max Velocity', value: `${m.vel} m/s` },
                  { label: 'Arrival Time', value: `${m.arr} hrs` },
                ].map(stat => (
                  <div key={stat.label} className="bg-orange-100 rounded-lg p-3">
                    <div className={`text-xs text-${m.color}-400`}>{stat.label}</div>
                    <div className="text-lg font-bold text-slate-800">{stat.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Differences table */}
      <Card>
        <CardHeader>
          <CardTitle>Quantitative Comparison</CardTitle>
          <CardDescription>Positive difference = Delft3D {'>'} SPH | Negative = SPH {'>'} Delft3D</CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonTable comparison={comparison} />
        </CardContent>
      </Card>

      {/* Visual comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Side-by-Side Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 5, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6 }}
                  formatter={(v: unknown) => [Number(v).toFixed(2), '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sph" name="SPH (MOCK)" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                <Bar dataKey="d3d" name="Delft3D (MOCK)" fill="#2563EB" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Normalized Profile (0–100)</CardTitle>
            <CardDescription>Higher = more severe in each category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Radar name="SPH (MOCK)" dataKey="sph" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} />
                <Radar name="Delft3D (MOCK)" dataKey="d3d" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hydrograph comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Discharge Hydrograph Comparison</CardTitle>
          <CardDescription>Both models use the same input breach hydrograph — differences appear in propagation</CardDescription>
        </CardHeader>
        <CardContent>
          <HydrographChart data={hydrology} />
        </CardContent>
      </Card>

      {/* Difference description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-orange-400" />
            Spatial Difference Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 text-sm text-slate-500 bg-orange-100 rounded-lg p-4">
            <span>
              In a full deployment with real solvers, this section would show difference raster maps for
              flood depth, velocity, and arrival time between SPH and Delft3D outputs (overlaid on the GIS map).
              The spatial comparison would highlight where each model produces more conservative estimates,
              useful for HADR planning and uncertainty quantification.
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Max Depth Difference', sph: '14.2 m', d3d: '13.8 m', diff: '-0.4 m', icon: <DiffIcon val={-0.4} /> },
              { label: 'Inundation Difference', sph: '42.5 km²', d3d: '44.1 km²', diff: '+1.6 km²', icon: <DiffIcon val={1.6} /> },
              { label: 'Arrival Time Difference', sph: '0.38 hrs', d3d: '0.41 hrs', diff: '+0.03 hrs', icon: <DiffIcon val={0.03} /> },
            ].map(d => (
              <div key={d.label} className="bg-orange-100 rounded-lg p-4 space-y-2">
                <div className="text-xs text-slate-500 font-medium">{d.label}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-400">SPH: {d.sph}</span>
                  <span className="text-blue-600">D3D: {d.d3d}</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
                  {d.icon} {d.diff}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-4 w-4" />
        To connect real Delft3D: set <code className="bg-orange-100 px-1 rounded">DELFT3D_EXECUTABLE</code> in backend/.env.
        To connect real SPH: set <code className="bg-orange-100 px-1 rounded">SPH_EXECUTABLE</code>.
      </div>
    </div>
  );
}
