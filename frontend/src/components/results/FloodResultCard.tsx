import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { FloodResult } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function FloodResultCard({ result, model }: { result: FloodResult; model: 'SPH' | 'DELFT3D' }) {
  if (!result) return null;
  const metrics = [
    { label: 'Max Depth', value: `${result.max_depth_m?.toFixed(1)} m`, icon: '🌊' },
    { label: 'Avg Depth', value: `${result.avg_depth_m?.toFixed(1)} m`, icon: '📊' },
    { label: 'Max Velocity', value: `${result.max_velocity_ms?.toFixed(1)} m/s`, icon: '⚡' },
    { label: 'Inundation Area', value: `${result.inundation_area_km2?.toFixed(1)} km²`, icon: '🗺️' },
    { label: 'Peak Discharge', value: `${result.peak_discharge_m3s?.toFixed(0)} m³/s`, icon: '💧' },
    { label: 'Arrival Time', value: `${result.arrival_time_hrs?.toFixed(1)} hrs`, icon: '⏱️' },
  ];
  const exports = [
    { label: 'GeoJSON', key: 'flood_extent', ext: '.geojson' },
    { label: 'GeoTIFF Depth', key: 'flood_depth', ext: '.tif' },
    { label: 'GeoTIFF Velocity', key: 'velocity', ext: '.tif' },
    { label: 'GeoTIFF Arrival Time', key: 'arrival_time', ext: '.tif' },
    { label: 'Discharge CSV', key: 'discharge', ext: '.csv' },
  ];
  return (
    <Card className={`border-${model==='SPH'?'orange':'blue'}-700/40`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{model}</CardTitle>        </div>
        <p className="text-xs text-amber-700 mt-1">{result.disclaimer}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {metrics.map(m => (
            <div key={m.label} className="bg-orange-100 rounded-lg p-3">
              <div className="text-xs text-slate-500">{m.icon} {m.label}</div>
              <div className="text-lg font-bold text-slate-800 mt-1">{m.value || '—'}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500 mb-2 font-medium">EXPORTS</div>
          {exports.map(e => {
            const path = result.file_paths?.[e.key];
            return (
              <div key={e.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{e.label}</span>
                {path ? (
                  <a href={`${API_BASE}/api/exports/download?path=${encodeURIComponent(path)}`}
                    className="text-orange-400 hover:text-orange-600 text-xs flex items-center gap-1" download>
                    ↓ Download
                  </a>
                ) : <span className="text-slate-500 text-xs">Not available</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
