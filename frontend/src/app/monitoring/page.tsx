'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Radio, Satellite, CloudRain, Droplets, AlertTriangle,
  RefreshCw, Clock, Activity, Wifi, WifiOff, ChevronDown, ChevronUp,
  TrendingUp, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MOCK_MONITORING } from '@/lib/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// Generate mock river level time series (last 48 hours)
function generateRiverLevels() {
  const data = [];
  const now = Date.now();
  for (let i = 47; i >= 0; i--) {
    const t = now - i * 3600000;
    const hour = 47 - i;
    let level: number;
    if (hour < 30) level = 1180 + Math.sin(hour * 0.3) * 0.8 + hour * 0.05;
    else level = 1182.4 + (hour - 30) * 0.08;
    data.push({
      time: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      level: Math.round(level * 100) / 100,
      warning: 1185.0,
      danger: 1190.0,
    });
  }
  return data;
}

// Generate mock rainfall timeline
function generateRainfall() {
  const data = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const t = now - i * 3600000;
    const hour = 23 - i;
    data.push({
      time: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      rainfall: hour < 6 ? 8 + Math.random() * 5 : hour < 12 ? 15 + Math.random() * 10 : 5 + Math.random() * 3,
    });
  }
  return data;
}

const ALERT_COLORS: Record<string, string> = {
  HIGH: 'text-red-600 bg-red-900/20 border-red-200',
  MODERATE: 'text-amber-700 bg-amber-50 border-amber-200',
  INFO: 'text-slate-500 bg-orange-100 border-orange-200',
  LOW: 'text-green-600 bg-green-900/20 border-green-200',
};

const LEVEL_COLORS: Record<string, string> = {
  RED: 'text-red-600',
  ORANGE: 'text-orange-400',
  YELLOW: 'text-amber-700',
  GREEN: 'text-green-600',
};

export default function MonitoringPage() {
  const [riverData] = useState(generateRiverLevels);
  const [rainfallData] = useState(generateRainfall);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const gauge = MOCK_MONITORING.river_gauge;
  const levelPct = Math.min(100, ((gauge.current_level_m - 1170) / (gauge.threshold_danger_m - 1170)) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Radio className="h-6 w-6 text-orange-400" />
            Near-Real-Time Monitoring
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Satellite, rainfall, and river-level integration for HADR situational awareness.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={refresh}
            className={`p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-orange-100 transition-colors ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alert level banner */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${ALERT_COLORS[MOCK_MONITORING.alert_level] || ALERT_COLORS.MODERATE}`}>
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold">
            Alert Level: <span className={LEVEL_COLORS[MOCK_MONITORING.alert_level] || 'text-amber-700'}>{MOCK_MONITORING.alert_level}</span>          </div>
          <div className="text-sm opacity-80 mt-0.5">
            River level rising. Monitoring upstream catchment for increased discharge.
          </div>
        </div>
        <Badge variant="warning">{MOCK_MONITORING.river_level_status}</Badge>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Satellite className="h-5 w-5" />, label: 'Sentinel-1 SAR',
            status: 'NOT CONFIGURED', statusColor: 'text-slate-500',
            value: '—', sub: 'GEE credentials required',
            connected: false,
          },
          {
            icon: <Satellite className="h-5 w-5" />, label: 'Sentinel-2 Optical',
            status: 'NOT CONFIGURED', statusColor: 'text-slate-500',
            value: '—', sub: 'GEE credentials required',
            connected: false,
          },
          {
            icon: <CloudRain className="h-5 w-5" />, label: 'GPM Rainfall',
            status: 'MOCK DATA', statusColor: 'text-amber-700',
            value: '12.4 mm/hr', sub: 'Last 24h: 148 mm',
            connected: true,
          },
          {
            icon: <Droplets className="h-5 w-5" />, label: 'River Gauge',
            status: 'DEMO', statusColor: 'text-amber-700',
            value: `${gauge.current_level_m} m`, sub: 'Warning at 1185.0 m',
            connected: true,
          },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className={item.connected ? 'text-orange-400' : 'text-slate-500'}>{item.icon}</div>
                {item.connected ? <Wifi className="h-3.5 w-3.5 text-green-600" /> : <WifiOff className="h-3.5 w-3.5 text-slate-500" />}
              </div>
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className={`text-xs font-semibold mt-0.5 ${item.statusColor}`}>{item.status}</div>
              <div className="text-lg font-bold text-slate-800 mt-1">{item.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* River gauge + rainfall charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-orange-400" />
              River Level — Last 48 hrs            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Gauge bar */}
            <div className="mb-4 space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Current: {gauge.current_level_m} m</span>
                <span>Warning: {gauge.threshold_warning_m} m | Danger: {gauge.threshold_danger_m} m</span>
              </div>
              <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${levelPct > 80 ? 'bg-red-500' : levelPct > 60 ? 'bg-orange-500' : 'bg-orange-500'}`}
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={riverData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 9 }} interval={7} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6 }} formatter={(v: unknown) => [`${Number(v).toFixed(2)} m`, 'Level']} />
                <ReferenceLine y={gauge.threshold_warning_m} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: 'Warning', fill: '#F59E0B', fontSize: 10 }} />
                <ReferenceLine y={gauge.threshold_danger_m} stroke="#EF4444" strokeDasharray="4 2" label={{ value: 'Danger', fill: '#EF4444', fontSize: 10 }} />
                <Line dataKey="level" stroke="#06B6D4" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-blue-600" />
              Catchment Rainfall — Last 24 hrs            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rainfallData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 9 }} interval={5} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} label={{ value: 'mm/hr', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6 }} formatter={(v: unknown) => [`${Number(v).toFixed(1)} mm/hr`, 'Rainfall']} />
                <Line dataKey="rainfall" stroke="#3B82F6" dot={false} strokeWidth={2} fill="#3B82F6" fillOpacity={0.3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            Active Alerts
            <span className="ml-auto text-sm font-normal text-slate-500">{MOCK_MONITORING.alerts.length} alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {MOCK_MONITORING.alerts.map(alert => (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 cursor-pointer ${ALERT_COLORS[alert.severity] || ALERT_COLORS.INFO}`}
              onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Activity className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{alert.type.replace('_', ' ')}</span>
                      <Badge variant={alert.severity === 'HIGH' ? 'destructive' : alert.severity === 'MODERATE' ? 'warning' : 'secondary'} className="text-[10px]">
                        {alert.severity}
                      </Badge>
                      {alert.is_demo && (
                        <Badge variant="secondary" className="text-[10px]">
                          DEMO
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                {expandedAlert === alert.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              {expandedAlert === alert.id && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20 text-sm">
                  {alert.message}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* GEE integration section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5 text-orange-400" />
            Satellite Integration
          </CardTitle>
          <CardDescription>Google Earth Engine integration — not yet configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Sentinel-1 SAR', desc: 'C-band synthetic aperture radar for flood mapping through clouds. 10m resolution.', api: 'get_sentinel1()' },
              { name: 'Sentinel-2 Optical', desc: 'Multispectral imagery for land cover and water extent mapping. 10m resolution.', api: 'get_sentinel2()' },
              { name: 'Landsat-8/9', desc: 'Thermal and optical imagery for surface temperature and water mapping. 30m resolution.', api: 'get_landsat()' },
              { name: 'GPM IMERG Rainfall', desc: 'Global Precipitation Measurement — half-hourly rainfall at 10km resolution.', api: 'get_rainfall()' },
            ].map(sat => (
              <div key={sat.name} className="bg-orange-100 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-800 text-sm">{sat.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">NOT CONFIGURED</Badge>
                </div>
                <p className="text-xs text-slate-500">{sat.desc}</p>
                <code className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-mono">{sat.api}</code>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-orange-100 rounded-lg p-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              To enable GEE integration: set <code className="text-orange-600">GEE_PROJECT_ID</code> and <code className="text-orange-600">GEE_SERVICE_ACCOUNT</code> in backend/.env.
              The GEEProvider interface in <code className="text-orange-600">app/api/gee.py</code> is already implemented with a mock provider.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Trend indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'River Level Trend', value: '+0.8 m/hr', icon: <TrendingUp className="h-4 w-4 text-red-600" />, status: 'RISING', color: 'text-red-600' },
          { label: 'Catchment Rainfall', value: '148 mm/24h', icon: <CloudRain className="h-4 w-4 text-amber-700" />, status: 'HIGH', color: 'text-amber-700' },
          { label: 'Forecast (6h)', value: 'Continued rise', icon: <Activity className="h-4 w-4 text-orange-400" />, status: 'WATCH', color: 'text-orange-400' },
        ].map(t => (
          <Card key={t.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                {t.icon}
                <span className="text-xs text-slate-500">{t.label}</span>
              </div>
              <div className="text-xl font-bold text-slate-800">{t.value}</div>
              <div className={`text-xs font-semibold mt-1 ${t.color}`}>{t.status}</div>            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
