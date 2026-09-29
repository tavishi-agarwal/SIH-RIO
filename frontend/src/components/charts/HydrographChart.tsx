'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend, ResponsiveContainer } from 'recharts';
import type { HydrologyPoint } from '@/types';

export default function HydrographChart({ data }: { data: HydrologyPoint[] }) {
  if (!data?.length) return <div className="text-slate-500 text-center py-8">No hydrological data</div>;
  const maxQ = Math.max(...data.map(d => d.discharge_m3s));
  const breachHour = data.find(d => d.stage === 'BREACH_START')?.hour;
  const peakHour = data.find(d => d.stage === 'PEAK')?.hour;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-600">Discharge Hydrograph</h3>
        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">SYNTHETIC DATA — DEMO</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{top:5,right:20,left:10,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="hour" stroke="#94A3B8" label={{value:'Time (hrs)', position:'insideBottom', offset:-3, fill:'#94A3B8', fontSize:11}} />
          <YAxis stroke="#94A3B8" label={{value:'Q (m³/s)', angle:-90, position:'insideLeft', fill:'#94A3B8', fontSize:11}} />
          <Tooltip contentStyle={{background:'#0F172A',border:'1px solid #334155',borderRadius:'6px',color:'#E2E8F0'}} formatter={(v: any) => [`${v.toFixed(0)} m³/s`, 'Discharge']} labelFormatter={l => `Hour ${l}`} />
          <Legend />
          {breachHour !== undefined && <ReferenceLine x={breachHour} stroke="#F97316" strokeDasharray="4 2" label={{value:'Breach',fill:'#F97316',fontSize:10}} />}
          {peakHour !== undefined && <ReferenceLine x={peakHour} stroke="#EF4444" strokeDasharray="4 2" label={{value:'Peak',fill:'#EF4444',fontSize:10}} />}
          <Line dataKey="discharge_m3s" name="Discharge (m³/s)" stroke="#06B6D4" dot={false} strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
