'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Database, Zap, Sliders, Cpu, FileCheck, Play,
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Waves, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createSimulation } from '@/lib/api';

const STEPS = [
  { id: 1, label: 'Study Area', icon: MapPin },
  { id: 2, label: 'Datasets', icon: Database },
  { id: 3, label: 'Scenario', icon: Zap },
  { id: 4, label: 'Parameters', icon: Sliders },
  { id: 5, label: 'Models', icon: Cpu },
  { id: 6, label: 'Review', icon: FileCheck },
  { id: 7, label: 'Run', icon: Play },
];

const SCENARIOS = [
  { id: 'DAM_BREAK', label: 'Dam Break', desc: 'Catastrophic or partial dam failure scenario. Models breach formation and downstream flood wave.', tag: 'PRIMARY DEMO' },
  { id: 'RIVER_BLOCKAGE', label: 'River Blockage', desc: 'Landslide or debris dam blocks river channel, causing upstream impoundment and sudden release.', tag: '' },
  { id: 'FLASH_FLOOD', label: 'Flash Flood', desc: 'Rapid surface runoff from intense rainfall over a catchment area.', tag: '' },
  { id: 'LAKE_OUTBURST', label: 'Glacial Lake Outburst (GLOF)', desc: 'Sudden release from a moraine-dammed or ice-dammed glacial lake.', tag: '' },
];

function StepIndicator({ step, current }: { step: typeof STEPS[0]; current: number }) {
  const done = step.id < current;
  const active = step.id === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
        done ? 'bg-orange-600 border-orange-600' :
        active ? 'border-orange-500 bg-orange-100' :
        'border-orange-200 bg-orange-50'
      }`}>
        {done ? <CheckCircle className="h-4 w-4 text-slate-800" /> :
         <step.icon className={`h-4 w-4 ${active ? 'text-orange-400' : 'text-slate-500'}`} />}
      </div>
      <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-orange-400' : done ? 'text-slate-600' : 'text-slate-500'}`}>
        {step.label}
      </span>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, unit = '', hint = '', min, max, step }: {
  label: string; type?: string; value: string | number; onChange: (v: string) => void;
  unit?: string; hint?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min} max={max} step={step}
          className="flex-1 h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
        />
        {unit && <span className="text-slate-500 text-xs shrink-0">{unit}</span>}
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function NewSimulationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('My Dam-Break Simulation');
  const [scenario, setScenario] = useState('DAM_BREAK');
  const [useDemo, setUseDemo] = useState(true);
  const [useSPH, setUseSPH] = useState(true);
  const [useDelft3D, setUseDelft3D] = useState(true);

  const [params, setParams] = useState({
    reservoir_water_level_m: 1195,
    dam_height_m: 85,
    breach_width_m: 80,
    breach_depth_m: 65,
    breach_elevation_m: 1130,
    breach_formation_time_hrs: 0.5,
    initial_downstream_discharge_m3s: 50,
    simulation_duration_hrs: 24,
    simulation_timestep_s: 10,
    terrain_resolution_m: 30,
  });

  const setParam = (key: string, value: string) => {
    setParams(p => ({ ...p, [key]: parseFloat(value) || 0 }));
  };

  const PRESETS = {
    minor: { breach_width_m: 20, breach_depth_m: 15, breach_formation_time_hrs: 2, label: 'Minor' },
    moderate: { breach_width_m: 50, breach_depth_m: 40, breach_formation_time_hrs: 1, label: 'Moderate' },
    catastrophic: { breach_width_m: 80, breach_depth_m: 65, breach_formation_time_hrs: 0.5, label: 'Catastrophic' },
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setParams(p => ({ ...p, ...PRESETS[preset] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name,
        scenario_type: scenario,
        is_demo: useDemo,
        use_sph: useSPH,
        use_delft3d: useDelft3D,
        parameters: params,
      };
      const res = await createSimulation(payload);
      const simId = res.data?.simulation_id;
      if (simId) router.push(`/simulations/${simId}`);
      else router.push('/simulations');
    } catch {
      setError('Failed to create simulation. Make sure the backend is running.');
      setStep(6);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 5) return useSPH || useDelft3D;
    return true;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">New Simulation</h1>
        <p className="text-slate-500 text-sm mt-1">Configure and run a flood simulation using mock or real solver backends.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-start justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-orange-100 z-0 mx-4" />
        {STEPS.map(s => <StepIndicator key={s.id} step={s} current={step} />)}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => { const S = STEPS[step - 1]; return <S.icon className="h-5 w-5 text-orange-400" />; })()}
            Step {step} — {STEPS[step - 1].label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 1: Study Area */}
          {step === 1 && (
            <div className="space-y-4">
              <InputField label="Simulation Name" value={name} onChange={setName} hint="Give your simulation a descriptive name." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Min Longitude" type="number" value={79.80} onChange={() => {}} unit="°E" hint="West boundary" />
                <InputField label="Max Longitude" type="number" value={80.10} onChange={() => {}} unit="°E" hint="East boundary" />
                <InputField label="Min Latitude" type="number" value={30.20} onChange={() => {}} unit="°N" hint="South boundary" />
                <InputField label="Max Latitude" type="number" value={30.40} onChange={() => {}} unit="°N" hint="North boundary" />
              </div>
              <div className="flex items-start gap-2 text-xs text-orange-400 bg-orange-900/20 border border-orange-700/30 rounded-lg p-3">
                <Waves className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Default coordinates are the synthetic Himalayan study area used in the demo (Uttarakhand-inspired, ~30.2–30.4°N, 79.8–80.1°E).</span>
              </div>
            </div>
          )}

          {/* Step 2: Datasets */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-300 bg-orange-900/20 cursor-pointer"
                onClick={() => setUseDemo(true)}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${useDemo ? 'border-orange-500 bg-orange-500' : 'border-orange-200'}`}>
                  {useDemo && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div>
                  <div className="font-medium text-slate-800">Use Synthetic Demo Dataset</div>
                  <div className="text-sm text-slate-500">Pre-generated DEM, river, dam, settlements and hydrology. No upload required.</div>                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50/50 cursor-pointer opacity-60"
                onClick={() => setUseDemo(false)}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!useDemo ? 'border-orange-500 bg-orange-500' : 'border-orange-200'}`}>
                  {!useDemo && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div>
                  <div className="font-medium text-slate-800">Upload Custom Datasets</div>
                  <div className="text-sm text-slate-500">Upload your own DEM (GeoTIFF), river (GeoJSON), dam parameters (JSON), and hydrology (CSV).</div>                </div>
              </div>
            </div>
          )}

          {/* Step 3: Scenario */}
          {step === 3 && (
            <div className="space-y-3">
              {SCENARIOS.map(sc => (
                <div key={sc.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    scenario === sc.id ? 'border-orange-600 bg-orange-900/30' : 'border-orange-200 bg-orange-50/50 hover:border-orange-200'
                  }`}
                  onClick={() => setScenario(sc.id)}>
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    scenario === sc.id ? 'border-orange-500 bg-orange-500' : 'border-orange-200'
                  }`}>
                    {scenario === sc.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {sc.label}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{sc.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Dam-break Parameters */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Quick Preset:</span>
                {(Object.entries(PRESETS) as [keyof typeof PRESETS, typeof PRESETS[keyof typeof PRESETS]][]).map(([key, p]) => (
                  <button key={key} onClick={() => applyPreset(key)}
                    className="px-3 py-1 text-xs rounded-md bg-orange-100 border border-orange-200 text-slate-600 hover:border-orange-600 hover:text-orange-400 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Reservoir Water Level" type="number" value={params.reservoir_water_level_m} onChange={v => setParam('reservoir_water_level_m', v)} unit="m" />
                <InputField label="Dam Height" type="number" value={params.dam_height_m} onChange={v => setParam('dam_height_m', v)} unit="m" />
                <InputField label="Breach Width" type="number" value={params.breach_width_m} onChange={v => setParam('breach_width_m', v)} unit="m" />
                <InputField label="Breach Depth" type="number" value={params.breach_depth_m} onChange={v => setParam('breach_depth_m', v)} unit="m" />
                <InputField label="Breach Elevation" type="number" value={params.breach_elevation_m} onChange={v => setParam('breach_elevation_m', v)} unit="m asl" />
                <InputField label="Breach Formation Time" type="number" value={params.breach_formation_time_hrs} onChange={v => setParam('breach_formation_time_hrs', v)} unit="hrs" step={0.1} />
                <InputField label="Initial Downstream Discharge" type="number" value={params.initial_downstream_discharge_m3s} onChange={v => setParam('initial_downstream_discharge_m3s', v)} unit="m³/s" />
                <InputField label="Simulation Duration" type="number" value={params.simulation_duration_hrs} onChange={v => setParam('simulation_duration_hrs', v)} unit="hrs" />
                <InputField label="Timestep" type="number" value={params.simulation_timestep_s} onChange={v => setParam('simulation_timestep_s', v)} unit="s" />
                <InputField label="Terrain Resolution" type="number" value={params.terrain_resolution_m} onChange={v => setParam('terrain_resolution_m', v)} unit="m" />
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Peak discharge is computed using the simplified rectangular breach formula: Q = Cd × Bw × √(2g) × h^1.5
              </p>
            </div>
          )}

          {/* Step 5: Models */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Select which hydraulic models to run. Both use mock (demonstration) implementations.</p>
              {[
                { key: 'sph', state: useSPH, set: setUseSPH, name: 'SPH', full: 'Smooth Particle Hydrodynamics', desc: 'Lagrangian particle-based flood simulation. Sharper flood front, narrower spread.', color: 'orange' },
                { key: 'delft3d', state: useDelft3D, set: setUseDelft3D, name: 'Delft3D', full: 'Delft3D-FLOW', desc: 'Structured curvilinear grid hydrodynamic model. Broader diffusion, slightly larger extent.', color: 'blue' },
              ].map(m => (
                <div key={m.key}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    m.state ? `border-${m.color}-600/50 bg-${m.color}-900/20` : 'border-orange-200 bg-orange-50/50 hover:border-orange-200'
                  }`}
                  onClick={() => m.set(!m.state)}>
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    m.state ? 'border-orange-500 bg-orange-500' : 'border-orange-200'
                  }`}>
                    {m.state && <CheckCircle className="h-3 w-3 text-slate-800" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{m.name}</span>
                      <span className="text-slate-500 text-sm">— {m.full}</span>                    </div>
                    <p className="text-sm text-slate-500 mt-1">{m.desc}</p>
                    <p className="text-xs text-amber-700 mt-1">Adapter ready. Connect real solver by setting {m.name.toUpperCase()}_EXECUTABLE in .env</p>
                  </div>
                </div>
              ))}
              {!useSPH && !useDelft3D && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Please select at least one model.
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-900/20 border border-red-700/30 rounded p-3 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Simulation Name', value: name },
                  { label: 'Scenario', value: SCENARIOS.find(s => s.id === scenario)?.label || scenario },
                  { label: 'Dataset', value: useDemo ? 'Synthetic Demo Dataset' : 'Custom Upload' },
                  { label: 'Models', value: [useSPH ? 'SPH (MOCK)' : '', useDelft3D ? 'Delft3D (MOCK)' : ''].filter(Boolean).join(' + ') },
                  { label: 'Breach Width', value: `${params.breach_width_m} m` },
                  { label: 'Breach Depth', value: `${params.breach_depth_m} m` },
                  { label: 'Reservoir Level', value: `${params.reservoir_water_level_m} m` },
                  { label: 'Formation Time', value: `${params.breach_formation_time_hrs} hrs` },
                  { label: 'Sim Duration', value: `${params.simulation_duration_hrs} hrs` },
                  { label: 'Terrain Res.', value: `${params.terrain_resolution_m} m` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between bg-orange-100 rounded-lg px-4 py-3">
                    <span className="text-slate-500 text-sm">{row.label}</span>
                    <span className="text-slate-800 text-sm font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                Selected models are MOCK implementations. Results are for demonstration only.
              </div>
            </div>
          )}

          {/* Step 7: Run */}
          {step === 7 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 border-2 border-orange-600 flex items-center justify-center mx-auto">
                {submitting ? <Loader2 className="h-8 w-8 text-orange-400 animate-spin" /> : <Play className="h-8 w-8 text-orange-400" fill="currentColor" />}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{submitting ? 'Creating Simulation...' : 'Ready to Run'}</h3>
              <p className="text-slate-500 max-w-sm mx-auto text-sm">
                {submitting ? 'Sending configuration to backend...' : 'Click the button below to submit this simulation for processing.'}
              </p>
              {!submitting && (
                <Button size="lg" onClick={handleSubmit}>
                  <Play className="h-5 w-5" fill="currentColor" /> Submit Simulation
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          Step {step} of {STEPS.length}
        </div>
        {step < 7 ? (
          <Button size="sm" onClick={() => setStep(s => Math.min(7, s + 1))} disabled={!canProceed()}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Running...</> : <><Play className="h-4 w-4" fill="currentColor" /> Run</>}
          </Button>
        )}
      </div>
    </div>
  );
}
