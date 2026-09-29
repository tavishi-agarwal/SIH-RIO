'use client';
import { useState } from 'react';
import {
  Database, Upload, Filter, CheckCircle, XCircle,
  Clock, RefreshCw, Search, Plus, Satellite, MapPin,
  BarChart2, Activity, AlertCircle, FileText, Globe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MOCK_DATASETS, type MockDataset } from '@/lib/mockData';

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  DEM: { icon: <MapPin className="h-4 w-4" />, color: 'text-amber-700' },
  River: { icon: <Activity className="h-4 w-4" />, color: 'text-blue-600' },
  Dam: { icon: <Database className="h-4 w-4" />, color: 'text-red-600' },
  Hydrology: { icon: <BarChart2 className="h-4 w-4" />, color: 'text-orange-400' },
  Population: { icon: <Globe className="h-4 w-4" />, color: 'text-green-600' },
  Infrastructure: { icon: <MapPin className="h-4 w-4" />, color: 'text-orange-400' },
  Satellite: { icon: <Satellite className="h-4 w-4" />, color: 'text-orange-400' },
};

const STATUS_CONFIG: Record<string, { label: string; badge: React.ReactNode }> = {
  VALIDATED: { label: 'Validated', badge: <Badge variant="success">VALIDATED</Badge> },
  NOT_CONFIGURED: { label: 'Not Configured', badge: <Badge variant="secondary">NOT CONFIGURED</Badge> },
  PROCESSING: { label: 'Processing', badge: <Badge variant="warning">PROCESSING</Badge> },
  FAILED: { label: 'Failed', badge: <Badge variant="destructive">FAILED</Badge> },
};

const SUPPORTED_FORMATS = ['GeoTIFF', 'CSV', 'GeoJSON', 'SHP (ZIP)', 'KML', 'JSON'];

export default function DataPage() {
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const categories = ['ALL', 'DEM', 'River', 'Dam', 'Hydrology', 'Population', 'Infrastructure', 'Satellite'];

  const filtered = MOCK_DATASETS.filter(d =>
    (category === 'ALL' || d.category === category) &&
    (!search || d.name.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: MOCK_DATASETS.length,
    validated: MOCK_DATASETS.filter(d => d.status === 'VALIDATED').length,
    synthetic: MOCK_DATASETS.filter(d => d.source === 'Synthetic Generator').length,
    notConfigured: MOCK_DATASETS.filter(d => d.status === 'NOT_CONFIGURED').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-6 w-6 text-orange-400" />
            Data Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage geospatial datasets for flood simulation: DEM, hydrology, infrastructure, and satellite data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowUpload(!showUpload)}>
            <Plus className="h-4 w-4" /> Upload Dataset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Datasets', value: stats.total, icon: <Database className="h-5 w-5 text-orange-400" /> },
          { label: 'Validated', value: stats.validated, icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
          { label: 'Synthetic/Demo', value: stats.synthetic, icon: <Activity className="h-5 w-5 text-amber-700" /> },
          { label: 'Not Configured', value: stats.notConfigured, icon: <XCircle className="h-5 w-5 text-slate-500" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                </div>
                {s.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload panel */}
      {showUpload && (
        <Card className="border-dashed border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-400" />
              Upload New Dataset
            </CardTitle>
            <CardDescription>Supported formats: {SUPPORTED_FORMATS.join(', ')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                dragOver ? 'border-orange-500 bg-orange-900/20' : 'border-orange-200 hover:border-orange-200'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
            >
              <Upload className="h-10 w-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Drop files here or click to browse</p>
              <p className="text-slate-500 text-sm mt-1">{SUPPORTED_FORMATS.join(' · ')}</p>
              <div className="mt-4">
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors border border-orange-200 text-slate-600 hover:bg-orange-100 h-8 px-3">
                    Browse Files
                    <input type="file" className="hidden" accept=".tif,.tiff,.csv,.geojson,.json,.zip,.kml" />
                  </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Dataset Name</label>
                <input className="w-full h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" placeholder="My DEM Dataset" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Category</label>
                <select className="w-full h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none">
                  {categories.filter(c => c !== 'ALL').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">CRS</label>
                <input className="w-full h-9 px-3 rounded-md bg-orange-100 border border-orange-200 text-slate-800 text-sm focus:outline-none" defaultValue="EPSG:4326" />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button size="sm">Upload &amp; Validate</Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Note: Upload processing is available when backend is running. Files are validated for CRS, format, and extent.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-500" />
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
              category === cat ? 'bg-orange-600 text-slate-800' : 'bg-orange-100 text-slate-500 hover:text-slate-800'
            }`}>
            {cat !== 'ALL' && CATEGORY_CONFIG[cat] && (
              <span className={CATEGORY_CONFIG[cat].color}>{CATEGORY_CONFIG[cat].icon}</span>
            )}
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 max-w-sm">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          className="bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none flex-1"
          placeholder="Search datasets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Dataset table */}
      <div className="overflow-x-auto rounded-lg border border-orange-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orange-200 bg-orange-50">
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Dataset</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Source</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Format</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">CRS</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Resolution</th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Size</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ds, i) => (
              <tr key={ds.id} className={`border-b border-orange-200 hover:bg-orange-100/50 ${i % 2 === 0 ? 'bg-orange-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 text-sm">{ds.name}</div>
                  <div className="text-xs text-slate-500">{ds.date}</div>
                </td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-1 ${CATEGORY_CONFIG[ds.category]?.color || 'text-slate-500'}`}>
                    {CATEGORY_CONFIG[ds.category]?.icon}
                    <span className="text-xs">{ds.category}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{ds.source}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-slate-600 font-mono">{ds.format}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs font-mono">{ds.crs}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{ds.resolution}</td>
                <td className="px-4 py-3 hidden md:table-cell text-right text-slate-500 text-xs">{ds.size}</td>
                <td className="px-4 py-3">
                  {STATUS_CONFIG[ds.status]?.badge || <Badge variant="secondary">{ds.status}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info about demo data */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong>SYNTHETIC DEMO DATASETS:</strong> Pre-loaded datasets above (DEM, river, dam, hydrology, etc.) are generated by
          <code className="ml-1 bg-amber-100 px-1 rounded">scripts/generate_demo_data.py</code> using synthetic algorithms.
          They are NOT real field data and must not be used for any real engineering or emergency planning purposes.
        </span>
      </div>

      {/* Dataset categories guide */}
      <Card>
        <CardHeader>
          <CardTitle>Required Data Categories</CardTitle>
          <CardDescription>For a complete flood simulation, the following data types are needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { cat: 'DEM', desc: 'Digital Elevation Model. 10–30m resolution. Source: SRTM, Cartosat, TanDEM-X.', fmt: 'GeoTIFF', required: true },
              { cat: 'Hydrology', desc: 'River discharge and water level time series. Min 30 days of data.', fmt: 'CSV', required: true },
              { cat: 'River Network', desc: 'Centerline and polygon of the river. Drainage basin boundary.', fmt: 'GeoJSON/SHP', required: true },
              { cat: 'Dam Parameters', desc: 'Dam height, crest elevation, reservoir capacity, spillway design.', fmt: 'JSON', required: true },
              { cat: 'Population', desc: 'Census data or GPW. Village/ward level at minimum.', fmt: 'GeoJSON/SHP', required: false },
              { cat: 'Infrastructure', desc: 'Roads, bridges, critical facilities, power lines.', fmt: 'GeoJSON/SHP', required: false },
              { cat: 'Buildings', desc: 'Building footprints from OpenStreetMap or Survey of India.', fmt: 'GeoJSON/SHP', required: false },
              { cat: 'Satellite', desc: 'Sentinel-1/2, Landsat for pre-/post-event flood mapping via GEE.', fmt: 'GeoTIFF', required: false },
            ].map(item => (
              <div key={item.cat} className="bg-orange-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800 text-sm">{item.cat}</span>
                  {item.required ? (
                    <Badge variant="destructive" className="text-[9px]">REQUIRED</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px]">OPTIONAL</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">{item.desc}</p>
                <div className="mt-2 text-xs font-mono text-orange-600">{item.fmt}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
