import { useState, useEffect, useRef } from 'react';
import { getSimulationStatus } from '@/lib/api';
import type { SimulationJobStatus } from '@/types';

export function useSimulation(simulationId: string | null) {
  const [status, setStatus] = useState<SimulationJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!simulationId) return;
    const poll = async () => {
      try {
        const res = await getSimulationStatus(simulationId);
        const s: SimulationJobStatus = res.data;
        setStatus(s);
        if (s.status !== 'COMPLETED' && s.status !== 'FAILED') {
          pollRef.current = setTimeout(poll, 2000);
        }
      } catch (e: any) {
        setError(e?.message || 'Poll failed');
      }
    };
    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [simulationId]);

  return {
    status,
    error,
    isRunning: status ? !['COMPLETED', 'FAILED', 'CREATED'].includes(status.status) : false,
    isCompleted: status?.status === 'COMPLETED',
    isFailed: status?.status === 'FAILED',
    progress: status?.progress || 0,
    currentStage: status?.current_stage || '',
    stages: status?.stages || [],
  };
}
