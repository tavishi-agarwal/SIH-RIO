import type { ImpactResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export function ImpactCard({ impact, model }: { impact: ImpactResult; model: string }) {
  if (!impact) return null;
  const metrics = [
    { label: 'Affected Population', value: (impact.affected_population || 0).toLocaleString(), icon: '👥' },
    { label: 'Villages', value: impact.affected_villages || 0, icon: '🏘️' },
    { label: 'Buildings', value: (impact.affected_buildings || 0).toLocaleString(), icon: '🏠' },
    { label: 'Roads (km)', value: `${(impact.affected_roads_km || 0).toFixed(1)} km`, icon: '🛣️' },
    { label: 'Bridges', value: impact.affected_bridges || 0, icon: '🌉' },
    { label: 'Agriculture (ha)', value: `${(impact.affected_agriculture_ha || 0).toFixed(0)} ha`, icon: '🌾' },
  ];
  const CATEGORY_COLORS: Record<string, string> = { LOW: '#4CAF50', MODERATE: '#FFB300', HIGH: '#F57C00', VERY_HIGH: '#D32F2F' };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Impact Analysis — {model}</CardTitle>        </div>
        <div className="flex items-start gap-2 text-xs text-amber-700 mt-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{impact.disclaimer || 'PRELIMINARY DEMONSTRATION ESTIMATE — Not for real emergency decisions.'}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {metrics.map(m => (
            <div key={m.label} className="bg-orange-100 rounded p-3">
              <div className="text-xs text-slate-500">{m.icon} {m.label}</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium">Impact Categories</div>
          {Object.entries(impact.impact_categories || {}).map(([cat, data]) => data.applicable ? (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{background: CATEGORY_COLORS[cat]}} />
              <span className="text-sm text-slate-600">{cat}</span>
              <div className="flex-1 h-1.5 bg-orange-100 rounded-full">
                <div className="h-full rounded-full" style={{width:`${(data.area_fraction||0)*100}%`,background:CATEGORY_COLORS[cat]}} />
              </div>
              <span className="text-xs text-slate-500">{data.estimated_area_km2?.toFixed(1)} km²</span>
            </div>
          ) : null)}
        </div>
      </CardContent>
    </Card>
  );
}
