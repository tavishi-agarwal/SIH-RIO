'use client';
import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadDemo, getDemoStatus } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { SimulationJobStatus, PipelineStage } from '@/types';

const STAGE_LABELS: Record<string, string> = {
  CREATED: '01 — Data Loading',
  VALIDATING: '02 — Data Validation',
  PREPROCESSING: '03 — GIS Preprocessing',
  GENERATING_INPUT: '04 — Model Input Generation',
  SPH_RUNNING: '05 — Mock SPH Simulation',
  DELFT3D_RUNNING: '06 — Mock Delft3D Simulation',
  POSTPROCESSING: '07 — Post-Processing',
  IMPACT_ANALYSIS: '08 — Impact Analysis',
  EXPORTING: '09 — GIS Export',
  COMPLETED: '10 — Complete',
};

export default function DemoRunButton() {
  const [running, setRunning] = useState(false);
  const [simulationId, setSimulationId] = useState<string|null>(null);
  const [status, setStatus] = useState<SimulationJobStatus|null>(null);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();
  const pollRef = useRef<NodeJS.Timeout|null>(null);

  const startDemo = async () => {
    setRunning(true);
    setError(null);
    setStatus(null);
    try {
      const res = await loadDemo();
      const simId = res.data.simulation_id;
      setSimulationId(simId);
      // Poll status
      const poll = async () => {
        try {
          const statusRes = await getDemoStatus(simId);
          const s = statusRes.data as SimulationJobStatus;
          setStatus(s);
          if (s.status !== 'COMPLETED' && s.status !== 'FAILED') {
            pollRef.current = setTimeout(poll, 2000);
          } else {
            setRunning(false);
          }
        } catch (e) {
          setError('Failed to get status');
          setRunning(false);
        }
      };
      poll();
    } catch (e: any) {
      setError(e?.message || 'Failed to start demo');
      setRunning(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const isCompleted = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED';
  const progress = status?.progress || 0;

  return (
    <div className="space-y-6">
      {!running && !isCompleted && !isFailed && (
        <Button size="xl" className="bg-orange-600 hover:bg-orange-500 text-slate-800 font-bold shadow-lg shadow-orange-900/50" onClick={startDemo}>
          <Play className="h-6 w-6" fill="currentColor" />
          RUN FULL DEMO
        </Button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <XCircle className="h-4 w-4" />{error}
          <Button size="sm" variant="outline" onClick={startDemo}>Retry</Button>
        </div>
      )}

      {(running || isCompleted || isFailed) && status && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 space-y-4">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">
                {isCompleted ? 'Pipeline Complete' : isFailed ? 'Pipeline Failed' : `Running: ${status.current_stage}`}
              </span>
              <span className="text-orange-400 font-mono">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-orange-500'}`}
                style={{width: `${Math.round(progress*100)}%`}}
              />
            </div>
          </div>

          {/* Stage list */}
          <div className="space-y-1.5">
            {status.stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {stage.done ? (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                ) : stage.stage_id === status.current_stage ? (
                  <Loader2 className="h-4 w-4 text-orange-400 animate-spin shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-orange-200 shrink-0" />
                )}
                <span className={stage.done ? 'text-slate-600' : stage.stage_id === status.current_stage ? 'text-orange-400' : 'text-slate-500'}>
                  {STAGE_LABELS[stage.stage_id] || stage.message}
                </span>
                {stage.done && <span className="ml-auto text-xs text-slate-500">{new Date(stage.timestamp).toLocaleTimeString()}</span>}
              </div>
            ))}
          </div>

          {/* Actions */}
          {isCompleted && simulationId && (
            <div className="flex gap-3 pt-2">
              <Button onClick={() => router.push(`/simulations/${simulationId}/results`)}>
                View Results <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push(`/simulations/${simulationId}/comparison`)}>
                SPH vs Delft3D
              </Button>
              <Button variant="ghost" onClick={() => { setStatus(null); setRunning(false); setSimulationId(null); setError(null); }}>
                Reset
              </Button>
            </div>
          )}
          {isFailed && (
            <Button variant="outline" onClick={startDemo}>Retry Demo</Button>
          )}
        </div>
      )}
    </div>
  );
}
