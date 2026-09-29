'use client';
import { useState } from 'react';
import {
  Settings, Moon, Sun, Monitor, Save, RotateCcw,
  Cpu, Globe, HardDrive, Satellite, CheckCircle,
  XCircle, AlertCircle, Eye, EyeOff, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Theme = 'dark' | 'light' | 'system';

function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 bg-orange-100 rounded-lg text-orange-400">{icon}</div>
      <div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function ToggleInput({
  label, value, onChange, hint
}: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-orange-600' : 'bg-orange-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function TextInput({
  label, value, onChange, hint, type = 'text', masked = false
}: { label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string; masked?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={masked && !show ? 'password' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 font-mono"
        />
        {masked && (
          <button onClick={() => setShow(!show)} className="p-2 text-slate-500 hover:text-slate-600">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function NumberInput({ label, value, onChange, unit, min, max, hint }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; min?: number; max?: number; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max}
          className="flex-1 h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        {unit && <span className="text-slate-500 text-xs">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SelectInput({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-600">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ConnStatus({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {connected
        ? <CheckCircle className="h-4 w-4 text-green-600" />
        : <XCircle className="h-4 w-4 text-red-600" />}
      <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>{label}</span>
    </div>
  );
}

export default function SettingsPage() {
  // Appearance
  const [theme, setTheme] = useState<Theme>('dark');
  const [compactMode, setCompactMode] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);

  // Simulation defaults
  const [defaultModel, setDefaultModel] = useState('BOTH');
  const [simDuration, setSimDuration] = useState(24);
  const [timestep, setTimestep] = useState(10);
  const [terrainRes, setTerrainRes] = useState(30);

  // GIS
  const [defaultCRS, setDefaultCRS] = useState('EPSG:4326');
  const [mapProvider, setMapProvider] = useState('Carto Dark');
  const [defaultLayers, setDefaultLayers] = useState({ river: true, dam: true, settlements: true, roads: false, flood: true });

  // Storage
  const [storagePath, setStoragePath] = useState('./storage');

  // Models
  const [sphExe, setSphExe] = useState('');
  const [d3dExe, setD3dExe] = useState('');

  // GEE
  const [geeProject, setGeeProject] = useState('');
  const [geeServiceAccount, setGeeServiceAccount] = useState('');

  const [saved, setSaved] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('appearance');

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ id, icon, title, desc, children }: {
    id: string; icon: React.ReactNode; title: string; desc: string; children: React.ReactNode;
  }) => (
    <Card>
      <button
        className="w-full text-left"
        onClick={() => setOpenSection(openSection === id ? null : id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SectionHeader icon={icon} title={title} desc={desc} />
            {openSection === id ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
          </div>
        </CardHeader>
      </button>
      {openSection === id && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-400" />
            Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure RIO appearance, models, and integrations.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button size="sm" onClick={save}>
            <Save className="h-4 w-4" /> {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Appearance */}
      <Section id="appearance" icon={<Monitor className="h-5 w-5" />} title="Appearance" desc="Theme and display preferences">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-slate-600 mb-2">Theme</div>
            <div className="flex gap-3">
              {([
                { id: 'dark', icon: <Moon className="h-5 w-5" />, label: 'Dark' },
                { id: 'light', icon: <Sun className="h-5 w-5" />, label: 'Light' },
                { id: 'system', icon: <Monitor className="h-5 w-5" />, label: 'System' },
              ] as { id: Theme; icon: React.ReactNode; label: string }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    theme === t.id
                      ? 'border-orange-600 bg-orange-900/30 text-orange-400'
                      : 'border-orange-200 bg-orange-100 text-slate-500 hover:border-orange-200'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Note: Full theme switching requires backend session support. Current implementation uses CSS class strategy.
            </p>
          </div>
          <div className="border-t border-orange-200 pt-4 space-y-2">
            <ToggleInput label="Compact Mode" value={compactMode} onChange={setCompactMode} hint="Reduce padding and spacing for smaller screens" />
            <ToggleInput label="Show Demo Banner" value={showDemoBanner} onChange={setShowDemoBanner} hint="Display the amber demonstration warning banner" />
          </div>
        </div>
      </Section>

      {/* Simulation Defaults */}
      <Section id="simulation" icon={<Cpu className="h-5 w-5" />} title="Simulation Defaults" desc="Default parameters for new simulations">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            label="Default Model"
            value={defaultModel}
            onChange={setDefaultModel}
            options={['SPH', 'DELFT3D', 'BOTH']}
            hint="Which hydraulic model(s) to run by default"
          />
          <NumberInput label="Simulation Duration" value={simDuration} onChange={setSimDuration} unit="hrs" min={1} max={168} hint="Default: 24 hrs" />
          <NumberInput label="Model Timestep" value={timestep} onChange={setTimestep} unit="s" min={1} max={300} hint="Numerical timestep for model computation" />
          <NumberInput label="Terrain Resolution" value={terrainRes} onChange={setTerrainRes} unit="m" min={5} max={250} hint="DEM resampling resolution" />
        </div>
      </Section>

      {/* GIS */}
      <Section id="gis" icon={<Globe className="h-5 w-5" />} title="GIS Configuration" desc="Map provider, CRS, and layer defaults">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              label="Default CRS"
              value={defaultCRS}
              onChange={setDefaultCRS}
              options={['EPSG:4326', 'EPSG:32643', 'EPSG:32644', 'EPSG:32645', 'EPSG:4979']}
              hint="WGS 84 (EPSG:4326) recommended for demo"
            />
            <SelectInput
              label="Map Basemap"
              value={mapProvider}
              onChange={setMapProvider}
              options={['Carto Dark', 'Carto Light', 'OpenStreetMap', 'Stadia Toner']}
              hint="Base tile layer for the GIS map"
            />
          </div>
          <div>
            <div className="text-sm text-slate-600 mb-2">Default Visible Layers</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(defaultLayers).map(([layer, visible]) => (
                <div key={layer} className="flex items-center gap-2">
                  <button
                    onClick={() => setDefaultLayers(l => ({ ...l, [layer]: !l[layer as keyof typeof l] }))}
                    className={`w-4 h-4 rounded border flex items-center justify-center ${visible ? 'bg-orange-600 border-orange-600' : 'border-orange-200'}`}
                  >
                    {visible && <CheckCircle className="h-3 w-3 text-slate-800" />}
                  </button>
                  <span className="text-sm text-slate-600 capitalize">{layer}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Storage */}
      <Section id="storage" icon={<HardDrive className="h-5 w-5" />} title="Storage" desc="File storage paths and object storage configuration">
        <div className="space-y-4">
          <TextInput
            label="Local Storage Path"
            value={storagePath}
            onChange={setStoragePath}
            hint="Directory for simulation outputs, exports, and cached data"
          />
          <div className="bg-orange-100 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-800 mb-2">Object Storage (MinIO / S3)</div>
            <ConnStatus connected={false} label="Not configured — using local filesystem" />
            <p className="text-xs text-slate-500 mt-2">
              Set <code className="bg-orange-50 px-1 rounded">MINIO_ENDPOINT</code>, <code className="bg-orange-50 px-1 rounded">MINIO_ACCESS_KEY</code>,
              and <code className="bg-orange-50 px-1 rounded">MINIO_SECRET_KEY</code> in backend/.env to enable object storage.
            </p>
          </div>
        </div>
      </Section>

      {/* Model Configuration */}
      <Section id="models" icon={<Cpu className="h-5 w-5" />} title="Model Configuration" desc="Connect real hydraulic solver executables">
        <div className="space-y-6">
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Both models currently use MOCK implementations. The platform is ready to receive real solver executables.
          </div>

          {[
            {
              name: 'SPH', full: 'Smooth Particle Hydrodynamics',
              exe: sphExe, setExe: setSphExe,
              envVar: 'SPH_EXECUTABLE',
              color: 'orange',
              desc: 'Point to your SPH solver binary (e.g., DualSPHysics, SPlisHSPlasH). The adapter will pass generated input files and collect output TIF/CSV files.',
            },
            {
              name: 'Delft3D', full: 'Delft3D-FLOW',
              exe: d3dExe, setExe: setD3dExe,
              envVar: 'DELFT3D_EXECUTABLE',
              color: 'blue',
              desc: 'Point to your Delft3D d_hydro binary. The adapter generates .mdf and .grd input files and reads NEFIS output files.',
            },
          ].map(m => (
            <div key={m.name} className={`border border-${m.color}-700/40 rounded-lg p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-${m.color}-400`}>{m.name}</span>
                <span className="text-slate-500 text-sm">— {m.full}</span>              </div>
              <p className="text-xs text-slate-500">{m.desc}</p>
              <TextInput
                label={`Executable Path (${m.envVar})`}
                value={m.exe}
                onChange={m.setExe}
                hint={`Leave blank to use MOCK implementation. Set ${m.envVar} in backend/.env for real solver.`}
              />
              <ConnStatus connected={false} label="Real solver not connected — MOCK mode active" />
            </div>
          ))}
        </div>
      </Section>

      {/* GEE */}
      <Section id="gee" icon={<Satellite className="h-5 w-5" />} title="Google Earth Engine" desc="Satellite data integration for flood monitoring">
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-orange-100 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            GEE integration is not required for the demo. Configure when real satellite monitoring is needed.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="GEE Project ID (GEE_PROJECT_ID)"
              value={geeProject}
              onChange={setGeeProject}
              hint="Your Google Cloud Project with Earth Engine enabled"
            />
            <TextInput
              label="Service Account (GEE_SERVICE_ACCOUNT)"
              value={geeServiceAccount}
              onChange={setGeeServiceAccount}
              hint="gee-service@project.iam.gserviceaccount.com"
            />
          </div>
          <ConnStatus connected={false} label="GEE not configured — mock provider active" />
          <div className="text-xs text-slate-500 space-y-1">
            <p>Enabled capabilities when configured:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              {['Sentinel-1 SAR flood mapping', 'Sentinel-2 optical flood extent', 'GPM IMERG rainfall', 'Landsat surface water', 'Automated change detection'].map(c => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Version info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Platform Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Platform', 'RIO'],
              ['Version', '1.0.0-mvp'],
              ['Frontend', 'Next.js 14.2.5 + TypeScript'],
              ['Backend', 'FastAPI + Python 3.11'],
              ['Map Library', 'MapLibre GL JS'],
              ['Charts', 'Recharts'],
              ['SPH Adapter', 'Mock (Demo Mode)'],
              ['Delft3D Adapter', 'Mock (Demo Mode)'],
              ['Database', 'SQLite (Dev) / PostgreSQL+PostGIS (Prod)'],
              ['Worker', 'Threading (Dev) / Celery+Redis (Prod)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between bg-orange-100 rounded px-3 py-2">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-800 text-right font-mono text-xs">{v}</span>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <Button onClick={save} className="w-full md:w-auto">
          <Save className="h-4 w-4" /> {saved ? '✓ Settings Saved' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
