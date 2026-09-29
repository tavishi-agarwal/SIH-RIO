'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play, Plus, Eye, Trash2, BarChart2, Download, RefreshCw,
  CheckCircle, XCircle, Loader2, Clock, AlertCircle, Filter,
  ChevronRight, Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSimulations } from '@/lib/api';
import { MOCK_SIMULATIONS, type MockSimulation } from '@/lib/mockData';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED:      { label: 'Completed',    color: 'success',     icon: <CheckCircle className="h-3.5 w-3.5" /> },
  RUNNING:        { label: 'Running',      color: 'default',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  SPH_RUNNING:    { label: 'SPH Running',  color: 'default',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  DELFT3D_RUNNING:{ label: 'D3D Running',  color: 'default',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  FAILED:         { label: 'Failed',       color: 'destructive', icon: <XCircle className="h-3.5 w-3.5" /> },
  CREATED:        { label: 'Created',      color: 'secondary',   icon: <Clock className="h-3.5 w-3.5" /> },
  VALIDATING:     { label: 'Validating',   color: 'warning',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  PREPROCESSING:  { label: 'Preprocessing',color: 'warning',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  EXPORTING:      { label: 'Exporting',    color: 'warning',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  IMPACT_ANALYSIS:{ label: 'Impact',       color: 'warning',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  POSTPROCESSING: { label: 'Post-proc',    color: 'warning',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  GENERATING_INPUT:{ label: 'Generating',  color: 'warning',     icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
};

const SCENARIO_LABEL: Record<string, string> = {
  DAM_BREAK: 'Dam Break',
  FLASH_FLOOD: 'Flash Flood',
  RIVER_BLOCKAGE: 'River Blockage',
  LAKE_OUTBURST: 'Lake Outburst',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'secondary', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border
      ${cfg.color === 'success' ? 'bg-green-500/15 text-green-600 border-green-500/30' :
        cfg.color === 'destructive' ? 'bg-red-500/15 text-red-600 border-red-500/30' :
        cfg.color === 'warning' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
        cfg.color === 'default' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
        'bg-orange-200 text-slate-600 border-orange-200'}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<MockSimulation[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try real backend; fall back to mock
    getSimulations()
      .then((res) => {
        const sims = res.data?.simulations || [];
        if (sims.length > 0) {
          // Map backend response into our shape
          setSimulations(
            sims.map((s: Record<string, unknown>) => ({
              id: s.simulation_id,
              name: `Simulation ${String(s.simulation_id).slice(0, 8)}`,
              project: 'RIO',
              river: 'Demo Himalayan Tributary',
              dam: 'Demo Himalayan Reservoir Dam',
              scenario: 'DAM_BREAK',
              model: 'SPH + Delft3D',
              status: s.status,
              created: new Date().toISOString(),
              inundated_area_km2: 0,
              max_depth_m: 0,
              affected_population: 0,
              is_demo: Boolean(s.is_demo),
            }))
          );
        } else {
          setSimulations(MOCK_SIMULATIONS);
        }
      })
      .catch(() => setSimulations(MOCK_SIMULATIONS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? simulations : simulations.filter(s => s.status === filter);

  const stats = {
    total: simulations.length,
    completed: simulations.filter(s => s.status === 'COMPLETED').length,
    running: simulations.filter(s => ['RUNNING', 'SPH_RUNNING', 'DELFT3D_RUNNING', 'PREPROCESSING', 'POSTPROCESSING', 'IMPACT_ANALYSIS', 'EXPORTING', 'GENERATING_INPUT', 'VALIDATING'].includes(s.status)).length,
    failed: simulations.filter(s => s.status === 'FAILED').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-orange-400" />
            Simulations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage dam-break, flash-flood, and river-blockage simulations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/simulations/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New Simulation
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="sm" variant="secondary">
              <Play className="h-4 w-4" fill="currentColor" /> Run Demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: <BarChart2 className="h-5 w-5 text-slate-500" /> },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
          { label: 'Running', value: stats.running, icon: <Loader2 className={`h-5 w-5 text-orange-400 ${stats.running > 0 ? 'animate-spin' : ''}`} /> },
          { label: 'Failed', value: stats.failed, icon: <XCircle className="h-5 w-5 text-red-600" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-500" />
        {['ALL', 'COMPLETED', 'RUNNING', 'FAILED', 'CREATED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
              ${filter === f ? 'bg-orange-600 text-slate-800' : 'bg-orange-100 text-slate-500 hover:text-slate-800'}`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-20 text-center">
            <Waves className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-500 mb-4">No simulations found.</p>
            <Link href="/simulations/new"><Button>Create New Simulation</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-orange-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-200 bg-orange-50">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Scenario</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Model</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Area (km²)</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Max Depth</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Affected Pop.</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sim, i) => (
                <tr key={sim.id} className={`border-b border-orange-200 hover:bg-orange-100/50 transition-colors ${i % 2 === 0 ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{sim.name}</div>
                    <div className="text-xs text-slate-500">{sim.dam}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                    {SCENARIO_LABEL[sim.scenario] || sim.scenario}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-slate-600">{sim.model}</span>                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sim.status} />
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-slate-600 font-mono">
                    {sim.inundated_area_km2 > 0 ? sim.inundated_area_km2.toFixed(1) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-slate-600 font-mono">
                    {sim.max_depth_m > 0 ? `${sim.max_depth_m.toFixed(1)} m` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-slate-600 font-mono">
                    {sim.affected_population > 0 ? sim.affected_population.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/simulations/${sim.id}`}>
                        <button className="p-1.5 text-slate-500 hover:text-orange-400 rounded" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                      {sim.status === 'COMPLETED' && (
                        <>
                          <Link href={`/simulations/${sim.id}/results`}>
                            <button className="p-1.5 text-slate-500 hover:text-green-600 rounded" title="Results">
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/simulations/${sim.id}/comparison`}>
                            <button className="p-1.5 text-slate-500 hover:text-orange-400 rounded" title="Compare">
                              <BarChart2 className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href="/exports">
                            <button className="p-1.5 text-slate-500 hover:text-blue-600 rounded" title="Export">
                              <Download className="h-4 w-4" />
                            </button>
                          </Link>
                        </>
                      )}
                      {sim.status === 'CREATED' && (
                        <button className="p-1.5 text-slate-500 hover:text-orange-400 rounded" title="Run">
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {sim.status !== 'RUNNING' && (
                        <button className="p-1.5 text-slate-500 hover:text-red-600 rounded" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Demo note */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong>DEMO DATA:</strong> Pre-populated simulations above use synthetic terrain, hydrology, and mock hydraulic models.
          Click <strong>Run Demo</strong> to execute the full end-to-end pipeline.
        </span>
      </div>
    </div>
  );
}
