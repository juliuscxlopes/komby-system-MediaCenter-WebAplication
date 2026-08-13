// src/components/Map/MapComponent.tsx
//
// Mapa offline (MapLibre GL JS, tiles vetoriais do DataCenter -- ver
// TileService.js). Marcador de posição atualizado ao vivo via GPS (mesmo
// pipeline WS que os sensores do motor). "Seguir" liga/desliga o
// auto-centralizar -- fica ligado até o usuário arrastar o mapa.
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Locate } from 'lucide-react';
import { buildMapStyle } from '../../config/mapStyle';
import { useLiveGpsPosition } from '../../hooks/useLiveGpsPosition';

const DEFAULT_CENTER: [number, number] = [-43.9345, -19.9167]; // fallback antes do primeiro fix de GPS
const DEFAULT_ZOOM = 14;

export function MapComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [follow, setFollow] = useState(true);
  const position = useLiveGpsPosition();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      // [AJUSTE] Tiles gerados pelo Planetiler a partir do OpenMapTiles/OSM
      // exigem crédito visível por licença -- compact:true mantém discreto
      // (só um ícone que expande), não desliga.
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Qualquer arrasto manual desliga o "seguir" -- não fica brigando com o usuário.
    map.on('dragstart', () => setFollow(false));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const lngLat: [number, number] = [position.lon, position.lat];

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-lg';
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    if (follow) {
      map.easeTo({ center: lngLat, duration: 500 });
    }
  }, [position, follow]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {!follow && (
        <button
          onClick={() => setFollow(true)}
          className="absolute bottom-4 right-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-lg text-slate-700 hover:bg-slate-50 transition-colors"
          title="Centralizar na posição atual"
        >
          <Locate size={18} />
        </button>
      )}

      {!position && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm text-slate-400 text-sm font-medium gap-2">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
          Aguardando sinal de GPS...
        </div>
      )}
    </div>
  );
}
