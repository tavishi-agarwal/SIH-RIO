import type { ModelComparison } from '@/types';

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  inundation_area_km2: { label: 'Inundation Area', unit: 'km²' },
  max_depth_m: { label: 'Max Depth', unit: 'm' },
  avg_depth_m: { label: 'Avg Depth', unit: 'm' },
  max_velocity_ms: { label: 'Max Velocity', unit: 'm/s' },
  peak_discharge_m3s: { label: 'Peak Discharge', unit: 'm³/s' },
  arrival_time_hrs: { label: 'Arrival Time', unit: 'hrs' },
  affected_population: { label: 'Affected Population', unit: 'people' },
};

export default function ComparisonTable({ comparison }: { comparison: ModelComparison }) {
  if (!comparison) return null;
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-medium text-slate-800">SPH vs Delft3D Comparison</h3>
      </div>
      <p className="text-xs text-amber-700 mb-4">{comparison.disclaimer}</p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-orange-200">
            <th className="text-left py-2 pr-4 text-slate-500 font-medium">Metric</th>
            <th className="text-right py-2 px-4 text-orange-400 font-medium">SPH</th>
            <th className="text-right py-2 px-4 text-blue-600 font-medium">Delft3D</th>
            <th className="text-right py-2 px-4 text-slate-500 font-medium">Diff</th>
            <th className="text-right py-2 pl-4 text-slate-500 font-medium">%Diff</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(comparison.metrics || {}).map(([key, m]) => {
            const meta = METRIC_LABELS[key] || { label: key, unit: '' };
            const diff = m.difference;
            const diffColor = diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-slate-500';
            return (
              <tr key={key} className="border-b border-orange-200 hover:bg-orange-100/50">
                <td className="py-2 pr-4 text-slate-600">{meta.label} <span className="text-slate-500 text-xs">{meta.unit}</span></td>
                <td className="text-right py-2 px-4 text-orange-600 font-mono">{(m.sph ?? 0).toFixed(m.sph > 100 ? 0 : 1)}</td>
                <td className="text-right py-2 px-4 text-blue-700 font-mono">{(m.delft3d ?? 0).toFixed(m.delft3d > 100 ? 0 : 1)}</td>
                <td className={`text-right py-2 px-4 font-mono ${diffColor}`}>{diff > 0 ? '+' : ''}{(diff ?? 0).toFixed(1)}</td>
                <td className={`text-right py-2 pl-4 font-mono ${diffColor}`}>{m.pct_difference > 0 ? '+' : ''}{(m.pct_difference ?? 0).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
