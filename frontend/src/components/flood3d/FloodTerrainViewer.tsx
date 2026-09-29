'use client';
/**
 * FloodTerrainViewer — WebGL (MapLibre GL) 3D visualization of the REAL
 * HEC-RAS flood simulation outputs served by /api/flood/*.
 *
 * What is rendered and where it comes from:
 *  - 3D terrain: real DEM (Terrain Tiles / Terrarium, USGS 3DEP & partners),
 *    draped by MapLibre's raster-dem terrain engine. NOT procedural.
 *  - Basemap: CARTO raster tiles (real OSM geography), spatially aligned with
 *    the simulation rasters via EPSG:4326 reprojection done on the backend.
 *  - Flood depth layers: PNG rasters derived directly from the supplied
 *    GeoTIFFs (EPSG:2271 → EPSG:4326, ft → m). No invented values.
 *  - WSE (Min) layer: real minimum water surface elevation raster.
 *
 * Timeline states (all real data snapshots):
 *   t=0   baseline (no flood layers)
 *   t=1   Depth @ 00:26:00  (instantaneous snapshot)
 *   t=2   Depth (Max)       (envelope over the whole run)
 * Playback crossfades between snapshots — the crossfade is a visual
 * interpolation between two real states, and is labelled as such in the UI.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  Play, Pause, RotateCcw, Layers, Mountain, Database,
  AlertTriangle, Eye, EyeOff, MousePointer2, Waves,
} from 'lucide-react';
import { getFloodMeta, floodStateImageUrl } from '@/lib/api';
import FloodVideoPlayer from './FloodVideoPlayer';

const TERRARIUM_TILES =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// Legend stops must mirror DEPTH_STOPS in
// backend/app/services/flood/raster_pipeline.py (metres).
const DEPTH_LEGEND: Array<[string, string]> = [
  ['rgba(186,225,255,1)', '0 – 0.5 m'],
  ['rgba(115,198,255,1)', '0.5 – 1 m'],
  ['rgba(65,165,245,1)', '1 – 2 m'],
  ['rgba(33,120,220,1)', '2 – 4 m'],
  ['rgba(18,78,180,1)', '4 – 8 m'],
  ['rgba(10,45,140,1)', '8 – 12 m'],
  ['rgba(4,12,70,1)', '12 – 17+ m'],
];

const STATE_LABELS = ['Baseline (pre-flood)', 'Depth @ t = 00:26:00', 'Maximum depth envelope'];

interface FloodMeta {
  crs_native: string;
  units_native: string;
  units_served: string;
  raster_dir: string | null;
  data_source: string;
  terrain_source: { provider: string; note: string };
  files: Array<any>;
  states: Record<string, any>;
}

export default function FloodTerrainViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const tRef = useRef<number>(0);

  const [meta, setMeta] = useState<FloodMeta | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [t, setT] = useState(0);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [showWse, setShowWse] = useState(false);
  const [showFlood, setShowFlood] = useState(true);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [cursor, setCursor] = useState<{ lng: number; lat: number; elev: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'video'>('map');

  // ------------------------------------------------------------------
  // Apply timeline position to layer opacities (crossfade between the
  // two real snapshots; t=0 hides both = baseline).
  // ------------------------------------------------------------------
  const applyTimeline = useCallback((tt: number) => {
    const map = mapRef.current;
    if (!map || !map.getLayer('flood-t26') || !map.getLayer('flood-max')) return;
    let oT26 = 0, oMax = 0;
    if (tt <= 1) {
      oT26 = tt;
    } else {
      oT26 = Math.max(0, 2 - tt);
      oMax = tt - 1;
    }
    map.setPaintProperty('flood-t26', 'raster-opacity', oT26);
    map.setPaintProperty('flood-max', 'raster-opacity', oMax);
  }, []);

  // ------------------------------------------------------------------
  // Init map once
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: MapLibreMap;

    Promise.all([import('maplibre-gl'), getFloodMeta()])
      .then(([ml, resp]) => {
        if (disposed) return;
        const metaData = resp.data as FloodMeta;
        setMeta(metaData);

        const s26 = metaData.states['depth_t26'];
        const smax = metaData.states['depth_max'];
        const swse = metaData.states['wse_min'];
        if (!s26?.available || !smax?.available) {
          setError('Depth rasters are not available from the backend.');
          return;
        }
        // Domain bounds = union of the two depth states (lon/lat)
        const b = [
          Math.min(s26.bounds_lonlat[0], smax.bounds_lonlat[0]),
          Math.min(s26.bounds_lonlat[1], smax.bounds_lonlat[1]),
          Math.max(s26.bounds_lonlat[2], smax.bounds_lonlat[2]),
          Math.max(s26.bounds_lonlat[3], smax.bounds_lonlat[3]),
        ];
        const center: [number, number] = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];

        map = new ml.Map({
          container: containerRef.current!,
          style: {
            version: 8,
            sources: {
              carto: {
                type: 'raster',
                tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_429m_1_f0a4ee7cc024ded1d212ce0e'],
                tileSize: 256,
                attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
              },
              // REAL DEM terrain — Terrarium-encoded raster-dem tiles
              terrain_dem: {
                type: 'raster-dem',
                tiles: [TERRARIUM_TILES],
                encoding: 'terrarium',
                tileSize: 256,
                maxzoom: 12,
                attribution: 'Terrain: AWS Terrain Tiles (USGS 3DEP & partners)',
              } as any,
            },
            layers: [{ id: 'basemap', type: 'raster', source: 'carto' }],
          },
          center,
          zoom: 10.5,
          pitch: 62,
          bearing: -18,
          maxPitch: 80,
        });

        map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');
        map.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-right');

        map.on('load', () => {
          if (disposed) return;
          // Enable 3D terrain from the real DEM
          if (typeof (map as any).setTerrain === 'function') {
            (map as any).setTerrain({ source: 'terrain_dem', exaggeration: 1.5 });
          }
          // Sky atmosphere
          if (!(map as any).getLayer('sky')) {
            try {
              (map as any).addLayer({
                id: 'sky', type: 'sky',
                paint: {
                  'sky-color': '#dcebfb',
                  'horizon-color': '#f2f8ff',
                  'sky-horizon-blend': 0.6,
                  'fog-color': '#dcebfb',
                  'fog-ground-blend': 0.4,
                },
              } as any);
            } catch { /* sky layer unsupported — cosmetic only */ }
          }

          // --- Flood layers from the REAL rasters (backend PNGs) ---
          map.addSource('flood-t26', {
            type: 'image',
            url: floodStateImageUrl('depth_t26'),
            coordinates: s26.maplibre_coordinates,
          });
          map.addSource('flood-max', {
            type: 'image',
            url: floodStateImageUrl('depth_max'),
            coordinates: smax.maplibre_coordinates,
          });
          map.addLayer({
            id: 'flood-t26', type: 'raster', source: 'flood-t26',
            paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 },
          });
          map.addLayer({
            id: 'flood-max', type: 'raster', source: 'flood-max',
            paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 },
          });

          if (swse?.available) {
            map.addSource('wse-min', {
              type: 'image',
              url: floodStateImageUrl('wse_min'),
              coordinates: swse.maplibre_coordinates,
            });
            map.addLayer({
              id: 'wse-min', type: 'raster', source: 'wse-min',
              layout: { visibility: 'none' },
              paint: { 'raster-opacity': 0.85 },
            });
          }

          // Fit camera to the actual simulation domain
          map.fitBounds(
            [[b[0], b[1]], [b[2], b[3]]] as any,
            { padding: 60, pitch: 62, bearing: -18, duration: 1500 },
          );

          mapRef.current = map;
          setMapReady(true);
        });

        // Cursor readout: lon/lat + REAL terrain elevation from the DEM
        map.on('mousemove', (e: any) => {
          let elev: number | null = null;
          try {
            const q = (map as any).queryTerrainElevation?.(e.lngLat);
            if (typeof q === 'number') elev = q;
          } catch { /* ignore */ }
          setCursor({ lng: e.lngLat.lng, lat: e.lngLat.lat, elev });
        });
      })
      .catch((e) => setError(String(e?.message || e)));

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Playback loop
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTsRef.current = 0;
    const DURATION = 9000; // ms for a full 0 -> 2 pass at speed=1
    const step = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      tRef.current += (dt * speed * 2) / (DURATION / 1000);
      if (tRef.current >= 2.15) tRef.current = 0; // small hold at the end
      const tt = Math.min(2, tRef.current);
      setT(tt);
      applyTimeline(tt);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, applyTimeline]);

  // Manual scrub
  const scrub = (v: number) => {
    tRef.current = v;
    setT(v);
    applyTimeline(v);
  };

  const resetCamera = () => {
    const map = mapRef.current;
    if (!map || !meta) return;
    const s26 = meta.states['depth_t26'];
    const smax = meta.states['depth_max'];
    const b = [
      Math.min(s26.bounds_lonlat[0], smax.bounds_lonlat[0]),
      Math.min(s26.bounds_lonlat[1], smax.bounds_lonlat[1]),
      Math.max(s26.bounds_lonlat[2], smax.bounds_lonlat[2]),
      Math.max(s26.bounds_lonlat[3], smax.bounds_lonlat[3]),
    ];
    map.fitBounds([[b[0], b[1]], [b[2], b[3]]] as any,
      { padding: 60, pitch: 62, bearing: -18, duration: 1200 });
  };

  // Terrain exaggeration (visual aid — labelled in UI)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    try { (map as any).setTerrain({ source: 'terrain_dem', exaggeration }); } catch { /* noop */ }
  }, [exaggeration, mapReady]);

  // WSE visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer('wse-min')) return;
    map.setLayoutProperty('wse-min', 'visibility', showWse ? 'visible' : 'none');
  }, [showWse, mapReady]);

  // Flood master visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    ['flood-t26', 'flood-max'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showFlood ? 'visible' : 'none');
    });
  }, [showFlood, mapReady]);

  const stateIndex = t < 0.5 ? 0 : t < 1.5 ? 1 : 2;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90">
          <div className="text-center space-y-2 max-w-md">
            <AlertTriangle className="h-10 w-10 text-amber-700 mx-auto" />
            <p className="text-slate-600 text-sm">{error}</p>
            <p className="text-slate-500 text-xs">Is the backend running on :8000?</p>
          </div>
        </div>
      )}

      {/* Top-left: title + provenance badge */}
      <div className="absolute top-4 left-4 z-20 bg-orange-50/90 border border-orange-200 rounded-lg px-4 py-3 space-y-1 max-w-sm">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-orange-400" />
          <span className="text-slate-800 font-semibold text-sm">3D Flood Simulation — Real Data</span>
        </div>
        <div className="text-[11px] text-slate-500 leading-snug">
          HEC-RAS 2D outputs · EPSG:2271 → EPSG:4326 · depths in metres ·
          terrain from real DEM (AWS Terrain Tiles / USGS 3DEP)
        </div>
        {/* View mode toggle: 3D view vs simulation */}
        <div className="flex gap-1 pt-1">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
              viewMode === 'map'
                ? 'bg-orange-600/30 text-orange-600 border border-orange-600/50'
                : 'text-slate-500 hover:text-slate-800 bg-orange-100 border border-orange-200'}`}
          >
            <Mountain className="h-3 w-3" /> 3D view
          </button>
          <button
            onClick={() => setViewMode('video')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
              viewMode === 'video'
                ? 'bg-orange-600/30 text-orange-600 border border-orange-600/50'
                : 'text-slate-500 hover:text-slate-800 bg-orange-100 border border-orange-200'}`}
          >
            <Waves className="h-3 w-3" /> Simulation
          </button>
        </div>
      </div>

      {/* Video mode overlays the map (map stays mounted underneath) */}
      {viewMode === 'video' && (
        <div className="absolute inset-0 z-30">
          <FloodVideoPlayer onBack={() => setViewMode('map')} />
        </div>
      )}

      {/* Right: layers + terrain controls */}
      <div className="absolute top-4 right-14 z-20 bg-orange-50/90 border border-orange-200 rounded-lg p-3 text-xs space-y-2 w-52">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Layers className="h-3.5 w-3.5" /> Layers & Terrain
        </div>
        <button onClick={() => setShowFlood(v => !v)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 w-full">
          {showFlood ? <Eye className="h-3 w-3 text-orange-400" /> : <EyeOff className="h-3 w-3" />}
          Flood depth (real)
        </button>
        <button onClick={() => setShowWse(v => !v)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 w-full">
          {showWse ? <Eye className="h-3 w-3 text-orange-400" /> : <EyeOff className="h-3 w-3" />}
          WSE (Min) surface
        </button>
        <div className="pt-1 border-t border-orange-200">
          <div className="flex justify-between text-slate-500 mb-1">
            <span>Vertical exaggeration</span>
            <span className="text-orange-600">{exaggeration.toFixed(1)}×</span>
          </div>
          <input type="range" min={1} max={3} step={0.1} value={exaggeration}
            onChange={e => setExaggeration(parseFloat(e.target.value))}
            className="w-full accent-orange-500" />
          <div className="text-[10px] text-slate-500">visual aid — 1.0× = true proportions</div>
        </div>
        <button onClick={() => setShowDataPanel(v => !v)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 w-full pt-1 border-t border-orange-200">
          <Database className="h-3 w-3" /> Data provenance
        </button>
      </div>

      {/* Data provenance panel */}
      {showDataPanel && meta && (
        <div className="absolute top-40 right-14 z-20 bg-orange-50/95 border border-orange-200 rounded-lg p-4 text-xs w-96 max-h-[55vh] overflow-y-auto space-y-3">
          <div className="text-slate-700 font-semibold">Source data (resources/)</div>
          <div className="text-slate-500">{meta.data_source}</div>
          <div className="text-slate-500">{meta.crs_native}</div>
          <div className="text-slate-500">Served as: {meta.units_served}</div>
          {meta.files.map((f) => (
            <div key={f.file} className="border border-orange-200 rounded p-2 space-y-1">
              <div className="text-slate-600 font-medium break-all">{f.file}</div>
              {f.readable ? (
                <div className="text-slate-500 space-y-0.5">
                  <div>{f.width}×{f.height} px @ {f.res_ft[0]} ft · NoData {f.nodata}</div>
                  <div>range: {f.stats_m.min?.toFixed(2)} – {f.stats_m.max?.toFixed(2)} m
                    {' '}({f.stats_native_ft.min?.toFixed(2)} – {f.stats_native_ft.max?.toFixed(2)} ft)</div>
                  <div>valid: {(f.valid_fraction * 100).toFixed(2)}% · area: {f.flooded_area_km2} km²</div>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Unreadable: {f.error}
                    {f.vrt_metadata?.source_filename && <> — missing source <span className="break-all">{f.vrt_metadata.source_filename}</span></>}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-orange-200 pt-2 space-y-1">
            <div className="text-slate-600 font-medium">What is real vs. approximation</div>
            <div className="text-slate-500 leading-relaxed">
              Terrain: real DEM tiles (Terrarium/USGS 3DEP), {meta.terrain_source.note}{' '}
              Flood/WSE rasters: exact values from the files above (reprojected + unit-converted only).{' '}
              Playback crossfade between the two snapshots is a visual interpolation, not a physical time series.{' '}
              Vertical exaggeration is a display aid.
            </div>
          </div>
        </div>
      )}

      {/* Cursor readout */}
      {cursor && (
        <div className="absolute bottom-24 right-4 z-20 bg-orange-50/80 border border-orange-200 rounded px-2.5 py-1.5 text-[11px] text-slate-600 flex items-center gap-2">
          <MousePointer2 className="h-3 w-3 text-orange-400" />
          {cursor.lat.toFixed(5)}°, {cursor.lng.toFixed(5)}°
          {cursor.elev != null && <span className="text-orange-600">terrain {cursor.elev.toFixed(1)} m</span>}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-24 left-4 z-20 bg-orange-50/90 border border-orange-200 rounded-lg p-3 text-xs">
        <div className="text-slate-600 font-medium mb-2">Flood depth (m) — real data</div>
        {DEPTH_LEGEND.map(([color, label]) => (
          <div key={label} className="flex items-center gap-2 text-slate-500">
            <span className="w-4 h-3 rounded-sm" style={{ background: color }} />{label}
          </div>
        ))}
      </div>

      {/* Bottom control bar: play / timeline / camera */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-orange-50/95 border border-orange-200 rounded-lg px-4 py-3 w-[min(720px,90%)] space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-2 rounded-md bg-orange-600 hover:bg-orange-500 text-slate-800"
            disabled={!mapReady}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <input
            type="range" min={0} max={2} step={0.01} value={t}
            onChange={e => { setPlaying(false); scrub(parseFloat(e.target.value)); }}
            className="flex-1 accent-orange-500"
          />
          <button onClick={resetCamera} className="p-2 rounded-md bg-orange-100 hover:bg-orange-200 text-slate-700" title="Reset camera">
            <RotateCcw className="h-4 w-4" />
          </button>
          <select
            value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}
            className="bg-orange-100 border border-orange-200 rounded px-2 py-1 text-xs text-slate-700"
          >
            {[0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          {STATE_LABELS.map((l, i) => (
            <span key={l} className={i === stateIndex ? 'text-orange-600 font-medium' : 'text-slate-500'}>{l}</span>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 text-center">
          snapshots are real raster data · crossfade between them is visual interpolation
        </div>
      </div>

      {!mapReady && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="text-orange-400 animate-pulse text-sm">Loading real terrain & flood rasters…</div>
        </div>
      )}
    </div>
  );
}
