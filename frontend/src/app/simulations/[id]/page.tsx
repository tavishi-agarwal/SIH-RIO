'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart2, Play, ChevronRight, Settings, Download,
  ArrowLeft, AlertCircle, Clock, MapPin, Cpu, Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PipelineProgress } from '@/components/pipeline/PipelineProgress';
import { getSimulation, runSimulation } from '@/lib/api';
import { MOCK_SIMULATIONS, MOCK_SPH_RESULT, MOCK_DELFT3D_RESULT } from '@/lib/mockData';
import type { SimulationJobStatus } from '@/types';
import { useSimulation } from '@/hooks/useSimulation';

export default function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [simData, setSimData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const mockSim = MOCK_SIMULATIONS.find(s => s.id === id) || MOCK_SIMULATIONS[0];
  const { status, isRunning, isCompleted } = useSimulation(
    (simData as Record<string, string> | null)?.['simulation_id'] as string | null
  );

  useEffect(() => {
    getSimulation(id)
      .then(res => setSimData(res.data))
      .catch(() => setSimData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runSimulation(id);
    } catch {
      // ignore
    } finally {
      setRunning(false);
    }
  };

  const currentStatus = (status?.status) || (simData as Record<string, string> | null)?.['status'] || mockSim.status;
  const isDemo = Boolean(!simData || (simData as Record<string, unknown>)['is_demo']);

  const paramRows = [
    { label: 'Study Area', value: '79.8–80.1°E, 30.2–30.4°N', icon: <MapPin className="h-4 w-4 text-slate-500" /> },
    { label: 'River', value: mockSim.river, icon: null },
    { label: 'Dam', value: mockSim.dam, icon: null },
    { label: 'Scenario', value: mockSim.scenario === 'DAM_BREAK' ? 'Dam Break' : mockSim.scenario, icon: null },
    { label: 'Breach Width', value: '80 m', icon: <Sliders className="h-4 w-4 text-slate-500" /> },
    { label: 'Reservoir Level', value: '1,195 m asl', icon: null },
    { label: 'Sim Duration', value: '24 hrs', icon: <Clock className="h-4 w-4 text-slate-500" /> },
    { label: 'Resolution', value: '30 m', icon: null },
    { label: 'Models', value: mockSim.model, icon: <Cpu className="h-4 w-4 text-slate-500" /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/simulations">
          <button className="p-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-orange-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{mockSim.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{id.slice(0, 12)}...</span>
            {isDemo && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Demo
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {currentStatus === 'CREATED' && (
            <Button size="sm" onClick={handleRun} disabled={running}>
              <Play className="h-4 w-4" fill="currentColor" />
              {running ? 'Starting...' : 'Run'}
            </Button>
          )}
          {currentStatus === 'COMPLETED' && (
            <>
              <Link href={`/simulations/${id}/results`}>
                <Button size="sm">
                  <ChevronRight className="h-4 w-4" /> Results
                </Button>
              </Link>
              <Link href={`/simulations/${id}/comparison`}>
                <Button size="sm" variant="outline">
                  <BarChart2 className="h-4 w-4" /> Compare
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      {currentStatus === 'COMPLETED' && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Simulation completed successfully. Both mock SPH and mock Delft3D results are available.
          <Link href={`/simulations/${id}/results`} className="ml-auto underline hover:no-underline">
            View Results →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Parameters */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {paramRows.map(r => (
                  <div key={r.label} className="flex justify-between gap-2 text-sm">
                    <dt className="text-slate-500 flex items-center gap-1">
                      {r.icon}{r.label}
                    </dt>
                    <dd className="text-slate-700 font-medium text-right">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Model status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Model Adapters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'SPH', full: 'Smooth Particle Hydrodynamics', color: 'orange' },
                { name: 'Delft3D', full: 'Delft3D-FLOW', color: 'blue' },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between bg-orange-100 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.full}</div>
                  </div>                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick results */}
          {currentStatus === 'COMPLETED' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Inundation Area', sph: `${MOCK_SPH_RESULT.inundation_area_km2} km²`, d3d: `${MOCK_DELFT3D_RESULT.inundation_area_km2} km²` },
                    { label: 'Max Depth', sph: `${MOCK_SPH_RESULT.max_depth_m} m`, d3d: `${MOCK_DELFT3D_RESULT.max_depth_m} m` },
                    { label: 'Arrival Time', sph: `${MOCK_SPH_RESULT.arrival_time_hrs} hrs`, d3d: `${MOCK_DELFT3D_RESULT.arrival_time_hrs} hrs` },
                  ].map(r => (
                    <div key={r.label}>
                      <div className="text-xs text-slate-500 mb-1">{r.label}</div>
                      <div className="flex gap-2">
                        <span className="flex-1 text-center bg-orange-900/30 text-orange-600 rounded px-2 py-1 text-xs">{r.sph}</span>
                        <span className="flex-1 text-center bg-blue-900/30 text-blue-700 rounded px-2 py-1 text-xs">{r.d3d}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 text-[10px] text-center">
                    <span className="flex-1 text-orange-500">SPH</span>
                    <span className="flex-1 text-blue-500">Delft3D</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineProgress job={
                status || (currentStatus === 'COMPLETED' ? {
                  simulation_id: id,
                  status: 'COMPLETED',
                  progress: 1.0,
                  current_stage: 'COMPLETED',
                  is_mock: true,
                  stages: [
                    { stage_id: 'VALIDATING', message: 'Data Validation — OK', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'PREPROCESSING', message: 'GIS Preprocessing — OK', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'GENERATING_INPUT', message: 'Model Inputs — OK', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'SPH_RUNNING', message: 'Mock SPH Complete', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'DELFT3D_RUNNING', message: 'Mock Delft3D Complete', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'POSTPROCESSING', message: 'Post-Processing — OK', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'IMPACT_ANALYSIS', message: 'Impact Analysis — OK', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'EXPORTING', message: 'GIS Export — OK', progress: 1, done: true, timestamp: new Date().toISOString() },
                    { stage_id: 'COMPLETED', message: 'Pipeline Complete', progress: 1, done: true, timestamp: new Date().toISOString() },
                  ],
                } as SimulationJobStatus : null)
              } />
            </CardContent>
          </Card>

          {/* Action links */}
          {currentStatus === 'COMPLETED' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: `/simulations/${id}/results`, label: 'View Results', icon: <ChevronRight className="h-4 w-4" />, variant: 'default' as const },
                { href: `/simulations/${id}/comparison`, label: 'SPH vs Delft3D', icon: <BarChart2 className="h-4 w-4" />, variant: 'outline' as const },
                { href: '/exports', label: 'Export Files', icon: <Download className="h-4 w-4" />, variant: 'outline' as const },
                { href: '/simulations/new', label: 'New Simulation', icon: <Settings className="h-4 w-4" />, variant: 'ghost' as const },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <Button variant={a.variant} size="sm" className="w-full justify-start gap-2">
                    {a.icon}{a.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
