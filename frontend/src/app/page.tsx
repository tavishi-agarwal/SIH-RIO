'use client';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Play, Activity, Waves, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDemoFull, getDemoRiver, getDemoReservoir, getDemoSettlements, getDemoRoads, getDemoDam } from '@/lib/api';

const FloodMap = dynamic(() => import('@/components/map/FloodMap'), { ssr: false, loading: () => <div className="bg-orange-50 animate-pulse w-full h-full" /> });

export default function Dashboard() {
  const [demoData, setDemoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDemoDam(), getDemoRiver(), getDemoReservoir(), getDemoSettlements(), getDemoRoads()])
      .then(([dam, river, res, settlements, roads]) => {
        setDemoData({ dam: dam.data, river: river.data, reservoir: res.data, settlements: settlements.data, roads: roads.data });
      })
      .catch(() => setDemoData(null))
      .finally(() => setLoading(false));
  }, []);

  const statsCards = [
    { label: 'Scenario', value: 'DAM BREAK', icon: '🏔️' },
    { label: 'Max Inundation', value: '42.5 km²', icon: '🌊' },
    { label: 'Max Depth', value: '14.2 m', icon: '📏' },
    { label: 'Affected Pop.', value: '5,220', icon: '👥' },
    { label: 'Peak Discharge', value: '7,050 m³/s', icon: '💧' },
    { label: 'Arrival Time', value: '0.4 hrs', icon: '⏱️' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-orange-200 shrink-0">
        <div className="flex items-center gap-3">
          <Waves className="h-5 w-5 text-orange-400" />
          <h1 className="font-semibold text-slate-800">RIO</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/demo">
            <Button size="sm" className="gap-2">
              <Play className="h-4 w-4" fill="currentColor" />
              RUN FULL DEMO
            </Button>
          </Link>
          <Link href="/simulations/new">
            <Button size="sm" variant="outline">New Simulation</Button>
          </Link>
        </div>
      </div>

      {/* Main content: Map + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 shrink-0 border-r border-orange-200 overflow-y-auto p-4 space-y-4">
          {/* Study area */}
          <div>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Study Area</h2>
            <div className="bg-orange-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="text-slate-800 font-medium">Synthetic Himalayan Tributary</div>
              <div className="text-slate-500 text-xs">30.2–30.4°N, 79.8–80.1°E</div>
            </div>
          </div>

          {/* Dam info */}
          {demoData?.dam && (
            <div>
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Dam</h2>
              <div className="bg-orange-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="text-slate-800 font-medium">{demoData.dam.name}</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="text-slate-500">Height:</div><div className="text-slate-700">{demoData.dam.height_m}m</div>
                  <div className="text-slate-500">Volume:</div><div className="text-slate-700">{demoData.dam.reservoir_volume_mcm} MCM</div>
                  <div className="text-slate-500">Max WL:</div><div className="text-slate-700">{demoData.dam.max_water_level_m}m</div>
                </div>
              </div>
            </div>
          )}

          {/* Model status */}
          <div>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Models</h2>
            <div className="space-y-2">
              {[{name:'SPH',color:'orange'},{name:'Delft3D',color:'blue'}].map(m => (
                <div key={m.name} className="bg-orange-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-500">Adapter Ready</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-2">
            <Link href="/demo"><Button variant="outline" size="sm" className="w-full justify-start gap-2"><Play className="h-3.5 w-3.5" />Run Full Demo</Button></Link>
            <Link href="/simulations"><Button variant="ghost" size="sm" className="w-full justify-start gap-2"><Activity className="h-3.5 w-3.5" />Simulations</Button></Link>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {!loading && demoData ? (
            <FloodMap
              riverGeoJSON={demoData.river}
              damLocation={demoData.dam?.coordinates}
              reservoirGeoJSON={demoData.reservoir}
              settlementsGeoJSON={demoData.settlements}
              roadsGeoJSON={demoData.roads}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-orange-50">
              <div className="text-center space-y-3">
                <Waves className="h-12 w-12 text-orange-500 mx-auto animate-pulse" />
                <p className="text-slate-500">{loading ? 'Loading demo data...' : 'Unable to connect to backend. Start the backend server.'}</p>
                {!loading && <Link href="/demo"><Button>Try Demo Mode</Button></Link>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom metrics bar */}
      <div className="shrink-0 border-t border-orange-200 px-4 py-3">
        <div className="flex items-center gap-4 overflow-x-auto">
          {statsCards.map(s => (
            <div key={s.label} className="shrink-0 bg-orange-50 rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-lg">{s.icon}</span>
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-sm font-bold text-slate-800">{s.value}</div>
              </div>            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
