import type { SimulationJobStatus } from '@/types';
import { CheckCircle, XCircle, Loader2, Circle } from 'lucide-react';

const STAGES = [
  { id: 'VALIDATING', label: '01 — Data Validation' },
  { id: 'PREPROCESSING', label: '02 — GIS Preprocessing' },
  { id: 'GENERATING_INPUT', label: '03 — Model Input Generation' },
  { id: 'SPH_RUNNING', label: '04 — Mock SPH Simulation' },
  { id: 'DELFT3D_RUNNING', label: '05 — Mock Delft3D Simulation' },
  { id: 'POSTPROCESSING', label: '06 — Post-Processing' },
  { id: 'IMPACT_ANALYSIS', label: '07 — Impact Analysis' },
  { id: 'EXPORTING', label: '08 — GIS Export' },
  { id: 'COMPLETED', label: '09 — Complete' },
];

export function PipelineProgress({ job }: { job: SimulationJobStatus | null }) {
  if (!job) return <div className="text-slate-500 text-sm">No simulation running</div>;
  const completedIds = new Set(job.stages.filter(s => s.done).map(s => s.stage_id));
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Overall Progress</span>
          <span className="text-orange-400 font-mono">{Math.round((job.progress||0)*100)}%</span>
        </div>
        <div className="h-2 bg-orange-100 rounded-full">
          <div className={`h-full rounded-full transition-all ${
            job.status === 'COMPLETED' ? 'bg-green-500' : job.status === 'FAILED' ? 'bg-red-500' : 'bg-orange-500'
          }`} style={{width:`${Math.round((job.progress||0)*100)}%`}} />
        </div>
      </div>
      <div className="space-y-1">
        {STAGES.map(stage => {
          const done = completedIds.has(stage.id);
          const active = job.current_stage === stage.id && !done;
          const failed = job.status === 'FAILED' && active;
          return (
            <div key={stage.id} className={`flex items-center gap-3 px-3 py-1.5 rounded text-sm ${
              done ? 'bg-green-900/20' : active ? 'bg-orange-900/20' : 'bg-transparent'
            }`}>
              {failed ? <XCircle className="h-4 w-4 text-red-600" /> :
               done ? <CheckCircle className="h-4 w-4 text-green-600" /> :
               active ? <Loader2 className="h-4 w-4 text-orange-400 animate-spin" /> :
               <Circle className="h-4 w-4 text-slate-500" />}
              <span className={done ? 'text-slate-600' : active ? 'text-orange-600' : 'text-slate-500'}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
