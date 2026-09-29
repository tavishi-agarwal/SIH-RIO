'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface FloodMapProps {
  riverGeoJSON?: object;
  damLocation?: [number, number];
  reservoirGeoJSON?: object;
  settlementsGeoJSON?: object;
  roadsGeoJSON?: object;
  floodExtentGeoJSON?: object;
  onMapLoad?: (map: MapLibreMap) => void;
}

export default function FloodMap(props: FloodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    river: true,
    reservoir: true,
    settlements: true,
    roads: true,
    flood: true,
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let MapLibre: typeof import('maplibre-gl');
    import('maplibre-gl').then((ml) => {
      MapLibre = ml;
      const map = new ml.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8,
          sources: {
            'carto': {
              type: 'raster',
              tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_429m_1_f0a4ee7cc024ded1d212ce0e'],
              tileSize: 256,
              attribution: '&copy; CartoDB &copy; OpenStreetMap',
            }
          },
          layers: [{ id: 'background', type: 'raster', source: 'carto' }]
        },
        center: [79.95, 30.30],
        zoom: 10,
      });
      map.on('load', () => {
        mapRef.current = map;
        setLoaded(true);
        if (props.onMapLoad) props.onMapLoad(map);
      });
      return () => { map.remove(); mapRef.current = null; };
    });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    // Add/update river layer
    if (props.riverGeoJSON) {
      if (map.getSource('river')) {
        (map.getSource('river') as GeoJSONSource).setData(props.riverGeoJSON as any);
      } else {
        map.addSource('river', { type: 'geojson', data: props.riverGeoJSON as any });
        map.addLayer({ id: 'river-line', type: 'line', source: 'river',
          filter: ['==', ['get', 'type'], 'river_centerline'],
          paint: { 'line-color': '#F97316', 'line-width': 2.5 } });
        map.addLayer({ id: 'river-poly', type: 'fill', source: 'river',
          filter: ['==', ['get', 'type'], 'river_polygon'],
          paint: { 'fill-color': '#F97316', 'fill-opacity': 0.25 } });
      }
    }
    // Add dam marker
    if (props.damLocation) {
      if (!map.getSource('dam')) {
        map.addSource('dam', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: props.damLocation }, properties: { name: 'Demo Dam' } }] } });
        map.addLayer({ id: 'dam-point', type: 'circle', source: 'dam', paint: { 'circle-radius': 8, 'circle-color': '#EF4444', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
      }
    }
    // Add reservoir
    if (props.reservoirGeoJSON) {
      if (map.getSource('reservoir')) {
        (map.getSource('reservoir') as GeoJSONSource).setData(props.reservoirGeoJSON as any);
      } else {
        map.addSource('reservoir', { type: 'geojson', data: props.reservoirGeoJSON as any });
        map.addLayer({ id: 'reservoir-fill', type: 'fill', source: 'reservoir', paint: { 'fill-color': '#FB923C', 'fill-opacity': 0.4 } });
        map.addLayer({ id: 'reservoir-line', type: 'line', source: 'reservoir', paint: { 'line-color': '#FB923C', 'line-width': 1.5 } });
      }
    }
    // Add settlements
    if (props.settlementsGeoJSON) {
      if (map.getSource('settlements')) {
        (map.getSource('settlements') as GeoJSONSource).setData(props.settlementsGeoJSON as any);
      } else {
        map.addSource('settlements', { type: 'geojson', data: props.settlementsGeoJSON as any });
        map.addLayer({ id: 'settlements-circle', type: 'circle', source: 'settlements', paint: { 'circle-radius': 6, 'circle-color': '#F59E0B', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } });
      }
    }
    // Add roads
    if (props.roadsGeoJSON) {
      if (map.getSource('roads')) {
        (map.getSource('roads') as GeoJSONSource).setData(props.roadsGeoJSON as any);
      } else {
        map.addSource('roads', { type: 'geojson', data: props.roadsGeoJSON as any });
        map.addLayer({ id: 'roads-line', type: 'line', source: 'roads', paint: { 'line-color': '#94A3B8', 'line-width': 1.5 } });
      }
    }
    // Add flood extent
    if (props.floodExtentGeoJSON) {
      if (map.getSource('flood')) {
        (map.getSource('flood') as GeoJSONSource).setData(props.floodExtentGeoJSON as any);
      } else {
        map.addSource('flood', { type: 'geojson', data: props.floodExtentGeoJSON as any });
        map.addLayer({ id: 'flood-fill', type: 'fill', source: 'flood', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.55 } });
        map.addLayer({ id: 'flood-line', type: 'line', source: 'flood', paint: { 'line-color': '#F97316', 'line-width': 1 } });
      }
    }
  }, [loaded, props.riverGeoJSON, props.damLocation, props.reservoirGeoJSON, props.settlementsGeoJSON, props.roadsGeoJSON, props.floodExtentGeoJSON]);

  const toggleLayer = (layer: string) => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const newVisible = !layerVisibility[layer];
    const layerIds: Record<string, string[]> = {
      river: ['river-line', 'river-poly'],
      reservoir: ['reservoir-fill', 'reservoir-line'],
      settlements: ['settlements-circle'],
      roads: ['roads-line'],
      flood: ['flood-fill', 'flood-line'],
    };
    (layerIds[layer] || []).forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', newVisible ? 'visible' : 'none');
    });
    setLayerVisibility(prev => ({ ...prev, [layer]: newVisible }));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-orange-50">
          <div className="text-orange-400 animate-pulse">Loading map...</div>
        </div>
      )}
      {/* Layer controls */}
      <div className="absolute top-4 right-4 bg-orange-50/90 rounded-lg border border-orange-200 p-3 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium mb-1">
          <Layers className="h-3.5 w-3.5" /> Layers
        </div>
        {Object.entries(layerVisibility).map(([layer, visible]) => (
          <button key={layer} onClick={() => toggleLayer(layer)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 w-full">
            {visible ? <Eye className="h-3 w-3 text-orange-400" /> : <EyeOff className="h-3 w-3" />}
            <span className="capitalize">{layer}</span>
          </button>
        ))}
      </div>
      {/* Legend */}
      <div className="absolute bottom-8 left-4 bg-orange-50/90 rounded-lg border border-orange-200 p-3 text-xs">
        <div className="text-slate-600 font-medium mb-2">Flood Depth</div>
        {[['#FFF176','0–0.5m'],['#FFB300','0.5–1m'],['#F57C00','1–2m'],['#D32F2F','2–5m'],['#7B1FA2','>5m']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-2 text-slate-500">
            <span className="w-4 h-3 rounded" style={{background:color}} />{label}
          </div>
        ))}      </div>
    </div>
  );
}
