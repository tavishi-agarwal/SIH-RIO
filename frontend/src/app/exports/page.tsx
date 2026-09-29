'use client';
import { useState, useEffect } from 'react';
import {
  Download, RefreshCw, FileJson, FileText, Map,
  Package, Filter, CheckCircle, Clock, XCircle, Eye,
  Database, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MOCK_EXPORTS, type MockExportFile } from '@/lib/mockData';
import { getExports } from '@/lib/api';

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  GeoJSON: <FileJson className="h-4 w-4 text-green-600" />,
  KML: <Map className="h-4 w-4 text-blue-600" />,
  SHP: <Package className="h-4 w-4 text-amber-700" />,
  GeoTIFF: <Database className="h-4 w-4 text-orange-400" />,
  CSV: <FileText className="h-4 w-4 text-orange-400" />,
};

const FORMAT_COLORS: Record<string, string> = {
  GeoJSON: 'bg-green-900/30 text-green-700 border-green-200',
  KML: 'bg-blue-900/30 text-blue-700 border-blue-700/40',
  SHP: 'bg-amber-50 text-amber-700 border-amber-200',
  GeoTIFF: 'bg-orange-900/30 text-orange-600 border-orange-700/40',
  CSV: 'bg-orange-900/30 text-orange-600 border-orange-700/40',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'READY') return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (status === 'GENERATING') return <Clock className="h-4 w-4 text-amber-700 animate-pulse" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

export default function ExportsPage() {
  const [exports, setExports] = useState<MockExportFile[]>([]);
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [filterModel, setFilterModel] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getExports()
      .then(res => {
        if (res.data?.files?.length > 0) {
          // Map backend format to MockExportFile shape
          setExports(res.data.files.map((f: Record<string, unknown>) => ({
            id: String(f.path || f.filename),
            filename: String(f.filename || ''),
            format: String(f.format || 'GeoJSON').toUpperCase(),
            model: String(f.model || 'SPH').toUpperCase(),
            simulation: 'Demo Simulation',
            size_kb: Math.round((Number(f.size_bytes) || 0) / 1024),
            created: new Date().toISOString(),
            status: 'READY',
          })));
        } else {
          setExports(MOCK_EXPORTS);
        }
      })
      .catch(() => setExports(MOCK_EXPORTS))
      .finally(() => setLoading(false));
  }, []);

  const formats = ['ALL', 'GeoJSON', 'KML', 'SHP', 'GeoTIFF', 'CSV'];
  const models = ['ALL', 'SPH', 'Delft3D'];

  const filtered = exports.filter(e =>
    (filterFormat === 'ALL' || e.format === filterFormat) &&
    (filterModel === 'ALL' || e.model.includes(filterModel))
  );

  const stats = {
    total: exports.length,
    ready: exports.filter(e => e.status === 'READY').length,
    total_kb: exports.reduce((a, e) => a + e.size_kb, 0),
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDownload = (exp: MockExportFile) => {
    // In demo mode without backend, show a toast
    showToast(`Demo: ${exp.filename} would download here. Start the backend to enable real downloads.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-orange-900 border border-orange-700 text-orange-200 text-sm px-4 py-2 rounded-lg shadow-lg max-w-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Download className="h-6 w-6 text-orange-400" />
            GIS Export Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Download flood simulation outputs in GIS-ready formats.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Files', value: stats.total, icon: <Database className="h-5 w-5 text-orange-400" /> },
          { label: 'Ready', value: stats.ready, icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
          { label: 'Total Size', value: `${Math.round(stats.total_kb / 1024 * 10) / 10} MB`, icon: <Package className="h-5 w-5 text-orange-400" /> },
          { label: 'Formats', value: '5', icon: <Map className="h-5 w-5 text-blue-600" /> },
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

      {/* Format summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['GeoJSON', 'KML', 'SHP', 'GeoTIFF', 'CSV'].map(fmt => {
          const count = exports.filter(e => e.format === fmt).length;
          return (
            <button
              key={fmt}
              onClick={() => setFilterFormat(filterFormat === fmt ? 'ALL' : fmt)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                filterFormat === fmt
                  ? `${FORMAT_COLORS[fmt]} ring-1 ring-current`
                  : 'border-orange-200 bg-orange-50 text-slate-500 hover:border-orange-200'
              }`}
            >
              {FORMAT_ICONS[fmt]}
              <div className="text-left">
                <div className="text-xs font-semibold">{fmt}</div>
                <div className="text-xs opacity-70">{count} files</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-500">Model:</span>
          {models.map(m => (
            <button key={m} onClick={() => setFilterModel(m)}
              className={`px-2 py-1 text-xs rounded transition-colors ${filterModel === m ? 'bg-orange-600 text-slate-800' : 'bg-orange-100 text-slate-500 hover:text-slate-800'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Files table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-orange-400 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-orange-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-200 bg-orange-50">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">File</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Format</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Model</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Simulation</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Size</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Created</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No export files match the selected filters.
                  </td>
                </tr>
              ) : filtered.map((exp, i) => (
                <tr key={exp.id} className={`border-b border-orange-200 hover:bg-orange-100/50 ${i % 2 === 0 ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {FORMAT_ICONS[exp.format] || <FileText className="h-4 w-4 text-slate-500" />}
                      <span className="text-slate-800 font-mono text-xs">{exp.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${FORMAT_COLORS[exp.format] || ''}`}>
                      {exp.format}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="default" className="text-[10px]">
                      {exp.model}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{exp.simulation}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-slate-500 font-mono text-xs">
                    {exp.size_kb > 1024 ? `${(exp.size_kb / 1024).toFixed(1)} MB` : `${exp.size_kb} KB`}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                    {new Date(exp.created).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <StatusIcon status={exp.status} />
                      <span className="text-xs text-slate-500">{exp.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleDownload(exp)}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-orange-100 text-orange-400 hover:bg-orange-800/40 border border-orange-700/30 transition-colors"
                        title="Download"
                        disabled={exp.status !== 'READY'}
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                      <button
                        className="p-1.5 text-slate-500 hover:text-slate-600 rounded"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Backend note */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong>DEMO EXPORTS:</strong> Files listed above are generated by the mock simulation pipeline.
          To download real files, start the backend server (<code>uvicorn app.main:app</code>) and run the full demo pipeline.
          Files are stored at <code>backend/storage/projects/&lt;sim_id&gt;/exports/</code>.
        </span>
      </div>

      {/* Format guide */}
      <Card>
        <CardHeader>
          <CardTitle>Supported GIS Formats</CardTitle>
          <CardDescription>All flood simulation outputs are available in these formats for use in QGIS, ArcGIS, Google Earth, and other tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { fmt: 'GeoJSON', icon: '{}', desc: 'Vector features with properties. Open in QGIS, Mapbox, Leaflet, or any web GIS tool.' },
              { fmt: 'KML/KMZ', icon: '🌍', desc: 'Google Earth format. View flood extent overlaid on satellite imagery.' },
              { fmt: 'SHP (ZIP)', icon: '📦', desc: 'ESRI Shapefile — the industry standard. Compatible with all GIS software.' },
              { fmt: 'GeoTIFF', icon: '🗺️', desc: 'Raster outputs: flood depth, velocity, arrival time. Load as raster layers in QGIS.' },
              { fmt: 'CSV', icon: '📊', desc: 'Discharge hydrograph, impact summary. Import into Excel, Python, or R.' },
            ].map(f => (
              <div key={f.fmt} className="bg-orange-100 rounded-lg p-4">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-medium text-slate-800 text-sm">{f.fmt}</div>
                <div className="text-xs text-slate-500 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
