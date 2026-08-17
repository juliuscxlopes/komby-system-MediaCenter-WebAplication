// src/components/Map/MapComponent.tsx
//
// Mapa offline (MapLibre GL JS, tiles vetoriais do DataCenter -- ver
// TileService.js). Marcador de posição atualizado ao vivo via GPS (mesmo
// pipeline WS que os sensores do motor). "Seguir" liga/desliga o
// auto-centralizar -- fica ligado até o usuário arrastar o mapa.
//
// Pins de via (buraco/lombada/alerta) vêm de GET /road-events --
// buraco/lombada são detectados sozinhos pelo IMU no DataCenter
// (RoadEventService.js), alerta é o motorista registrando na hora pelo
// botão "Marcar aqui" (mesma posição do worker, não o GPS do navegador).
//
// FAB "+" (Plus) abre 3 ações (Trip.tsx nomeia): iniciar navegação (clica
// um ponto no mapa -> rota real via OSRM, ver NavigationService.js),
// cadastrar lugar salvo (clica um ponto -> nome -> saved_places) e criar um
// contador parcial (trip meter, sem interação no mapa). "Modo de escolha"
// (pickMode) troca o que um clique no mapa faz, sem interferir no resto.
import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Locate, TriangleAlert, Plus, X, MapPin, Route, Gauge, Navigation2 } from 'lucide-react';
import { buildMapStyle } from '../../config/mapStyle';
import { buildVehicleMarkerSvg, VEHICLE_MARKER_UPDATED_EVENT } from '../../config/vehicleMarker';
import { CompassWidget } from './CompassWidget';
import { useLiveGpsPosition } from '../../hooks/useLiveGpsPosition';
import { useNavigationState } from '../../hooks/useNavigationState';
import { onSensorUpdate } from '../../WebSocket/Listeners/WsTelemetryListeners';
import { roadEventsService, type RoadEvent, type HazardCategory } from '../../services/roadEventsService';
import { navigationService } from '../../services/navigationService';
import { savedPlacesService } from '../../services/savedPlacesService';
import { tripMetersService } from '../../services/tripMetersService';
import { settingsService } from '../../services/settingsService';

const DEFAULT_CENTER: [number, number] = [-43.9345, -19.9167]; // fallback antes do primeiro fix de GPS
const DEFAULT_ZOOM = 14;
const ROUTE_SOURCE_ID = 'active-route';

const HAZARD_OPTIONS: { value: HazardCategory; label: string }[] = [
  { value: 'buraco', label: 'Buraco' },
  { value: 'lombada', label: 'Lombada' },
  { value: 'alagamento', label: 'Alagamento' },
  { value: 'perigo', label: 'Perigo' },
];

// Ícone por tipo de evento -- SVG cru (não React) porque o marcador do
// MapLibre precisa de um elemento DOM puro, não de uma árvore React.
const EVENT_ICON: Record<RoadEvent['type'], string> = {
  pothole:
    '<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1e293b" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="#64748b"/></svg>',
  bump:
    '<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#b45309" stroke="white" stroke-width="2"/><path d="M6 14 Q12 7 18 14" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  hazard:
    '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2 L22 20 L2 20 Z" fill="#dc2626" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><rect x="11" y="9" width="2" height="5" fill="white"/><rect x="11" y="15.5" width="2" height="2" fill="white"/></svg>',
};

const EVENT_LABEL: Record<RoadEvent['type'], string> = {
  pothole: 'Buraco (detectado)',
  bump: 'Lombada (detectada)',
  hazard: 'Alerta',
};

type PickMode = 'none' | 'destination' | 'stop' | 'place';

export function MapComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const eventMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [follow, setFollow] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);
  const [pickMode, setPickMode] = useState<PickMode>('none');
  const [pendingPlace, setPendingPlace] = useState<{ lat: number; lon: number } | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [meterName, setMeterName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [vehicleMarker, setVehicleMarker] = useState<{ icon?: string; color?: string }>({});

  const position = useLiveGpsPosition();
  const route = useNavigationState();

  // Um marcador só, reusado tanto na carga em lote (GET /road-events) quanto
  // no push ao vivo por WS (sensor ROAD_EVENT) -- mesmo desenho/popup nos
  // dois casos, sem duplicar a lógica.
  const addEventMarker = useCallback((map: maplibregl.Map, event: RoadEvent) => {
    if (!event.location) return null;

    const el = document.createElement('div');
    el.innerHTML = EVENT_ICON[event.type];
    el.title = EVENT_LABEL[event.type];
    el.style.cursor = 'pointer';

    const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
      `<div style="font: 500 12px sans-serif; color: #1e293b;">${EVENT_LABEL[event.type]}${
        event.meta?.category ? ` · ${event.meta.category}` : ''
      }</div>`,
    );

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([event.location.lon, event.location.lat])
      .setPopup(popup)
      .addTo(map);

    eventMarkersRef.current.push(marker);
    return marker;
  }, []);

  const loadRoadEvents = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const events = await roadEventsService.list();

      eventMarkersRef.current.forEach((m) => m.remove());
      eventMarkersRef.current = [];
      events.forEach((event) => addEventMarker(map, event));
    } catch {
      // silencioso -- pins são um extra visual, não pode travar o mapa se a API cair
    }
  }, [addEventMarker]);

  // Buraco/lombada detectados pelo IMU e alerta manual aparecem no mapa na
  // hora, sem precisar recarregar -- o DataCenter rebroadcasta cada evento
  // de via por WS (room 'telemetry', sensor 'ROAD_EVENT') assim que grava,
  // mesmo pipeline que já existe pra GPS/sensores do motor.
  useEffect(() => {
    onSensorUpdate('ROAD_EVENT', (data) => {
      const map = mapRef.current;
      if (!map) return;
      addEventMarker(map, data as unknown as RoadEvent);
    });
  }, [addEventMarker]);

  // Avatar do veículo (ícone + cor escolhidos em Configurações > Avatar,
  // ver AvatarSection.tsx) -- busca uma vez ao montar e escuta o evento
  // disparado ao salvar, pra não precisar recarregar a página pra ver a
  // troca refletida no mapa.
  useEffect(() => {
    settingsService
      .getAll()
      .then((bundle) => setVehicleMarker({ icon: bundle.vehicle.marker_icon, color: bundle.vehicle.marker_color }))
      .catch(() => {
        // sem configuração ainda (veículo não cadastrado) -- fica no ícone padrão
      });

    function handleUpdated(e: Event) {
      const detail = (e as CustomEvent<{ icon: string; color: string }>).detail;
      if (detail) setVehicleMarker(detail);
    }
    window.addEventListener(VEHICLE_MARKER_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(VEHICLE_MARKER_UPDATED_EVENT, handleUpdated);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // [AJUSTE] MapLibre resolve a URL do worker dinamicamente em runtime de
    // um jeito que o Vite não bundla como asset -- o arquivo é copiado pro
    // build em public/ (ver dockerfile) e apontado aqui manualmente, senão o
    // worker fica pendurado tentando carregar um arquivo que não existe.
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

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

    map.on('load', () => {
      loadRoadEvents();

      // Fonte/camada da rota ativa -- vazia até existir uma rota (useEffect
      // separado só atualiza o `data` quando `route` muda).
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: ROUTE_SOURCE_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.85 },
      });
    });

    mapRef.current = map;

    return () => {
      eventMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [loadRoadEvents]);

  // Clique no mapa só vira "escolher ponto" quando um modo estiver ativo --
  // fora disso o mapa se comporta normal (arrastar, zoom, etc já são do MapLibre).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function handleClick(e: maplibregl.MapMouseEvent) {
      if (pickMode === 'none') return;
      const { lat, lng } = e.lngLat;

      if (pickMode === 'destination' || pickMode === 'stop') {
        const action = pickMode === 'destination' ? navigationService.start : navigationService.addStop;
        setPickMode('none');
        setBusy(true);
        setActionError(null);
        action(lat, lng)
          .catch((err) => setActionError(err instanceof Error ? err.message : 'Falha ao calcular rota.'))
          .finally(() => setBusy(false));
      } else if (pickMode === 'place') {
        setPickMode('none');
        setPendingPlace({ lat, lon: lng });
      }
    }

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [pickMode]);

  // Cursor de "mira" enquanto um modo de escolha estiver ativo -- feedback
  // visual de que o próximo clique no mapa vale por alguma coisa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = pickMode === 'none' ? '' : 'crosshair';
  }, [pickMode]);

  // Desenha/atualiza a rota ativa no mapa sempre que o estado de navegação mudar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(ROUTE_SOURCE_ID)) return;

    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!route) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.geometry.map((p) => [p.lon, p.lat]),
          },
        },
      ],
    });
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const lngLat: [number, number] = [position.lon, position.lat];
    const heading = Number.isFinite(position.heading) ? position.heading : 0;

    if (!markerRef.current) {
      // Avatar do veículo: ícone escolhido em Configurações > Avatar, girando
      // com o heading do GPS (rotationAlignment 'map' -- acompanha a rotação
      // do próprio mapa, não só da tela).
      const el = document.createElement('div');
      el.innerHTML = buildVehicleMarkerSvg(vehicleMarker.icon, vehicleMarker.color);
      markerRef.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat(lngLat)
        .setRotation(heading)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
      markerRef.current.setRotation(heading);
    }

    if (follow) {
      map.easeTo({ center: lngLat, duration: 500 });
    }
  }, [position, follow, vehicleMarker]);

  // Avatar mudou (salvou em Configurações) com o marcador já em tela --
  // reconstrói o SVG no elemento existente, sem esperar o próximo fix de GPS.
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.getElement().innerHTML = buildVehicleMarkerSvg(vehicleMarker.icon, vehicleMarker.color);
  }, [vehicleMarker]);

  async function handleReportHazard(category: HazardCategory) {
    setReporting(true);
    try {
      await roadEventsService.reportHazard(category);
      setReportOpen(false);
      setFabOpen(false);
      await loadRoadEvents();
    } catch {
      // botão volta ao estado normal -- usuário tenta de novo, sem popup de erro pra não travar quem tá dirigindo
    } finally {
      setReporting(false);
    }
  }

  async function handleConfirmPlace() {
    if (!pendingPlace || !placeName.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await savedPlacesService.create({ name: placeName.trim(), lat: pendingPlace.lat, lon: pendingPlace.lon });
      setPendingPlace(null);
      setPlaceName('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao salvar lugar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmMeter() {
    if (!meterName.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await tripMetersService.create(meterName.trim());
      setMeterModalOpen(false);
      setMeterName('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao criar contador.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelRoute() {
    setBusy(true);
    try {
      await navigationService.cancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Barra grande embaixo -- velocidade/bússola sempre; lado direito troca
          entre posição/sinal (parado) e km/tempo restante (navegando). Texto
          grande de propósito -- é pra ler de relance dirigindo, não miudinho
          num canto. */}
      {position && (
        <div className="absolute left-4 right-4 bottom-4 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-[2rem] shadow-xl px-6 sm:px-10 py-5 flex items-center gap-6 sm:gap-10">
          <CompassWidget heading={Number.isFinite(position.heading) ? position.heading : 0} />

          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-5xl sm:text-6xl font-bold text-slate-900 leading-none tabular-nums">
              {position.speed.toFixed(0)}
            </span>
            <span className="text-base font-semibold text-slate-400">km/h</span>
          </div>

          <div className="w-px h-14 bg-slate-100 shrink-0" />

          {route ? (
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <Navigation2 size={28} className="text-blue-600 shrink-0" />
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
                  {route.remainingKm.toFixed(1)} km
                </span>
                <span className="text-lg font-semibold text-slate-400">
                  ~{Math.max(1, Math.round(route.remainingMin))} min restantes
                </span>
              </div>
              <button
                onClick={handleCancelRoute}
                disabled={busy}
                className="ml-auto p-3 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors disabled:opacity-40 shrink-0"
                title="Cancelar navegação"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-700 leading-none truncate">
                {position.lat.toFixed(5)}, {position.lon.toFixed(5)}
              </p>
              <p className="text-sm text-slate-400 font-medium mt-1.5">
                {position.alt.toFixed(0)}m · {Number.isFinite(position.heading) ? position.heading.toFixed(0) : '--'}°
                · {position.satellites} sat · HDOP {position.hdop.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      )}

      {!follow && (
        <button
          onClick={() => setFollow(true)}
          className="absolute bottom-32 right-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-lg text-slate-700 hover:bg-slate-50 transition-colors"
          title="Centralizar na posição atual"
        >
          <Locate size={18} />
        </button>
      )}

      {/* FAB "+" -- todas as ações de "adicionar" ficam aqui: destino, parada,
          marcar problema na via (submenu aninhado), odômetro parcial, lugar. */}
      <div className="absolute bottom-32 right-20 flex flex-col-reverse items-end gap-2">
        <button
          onClick={() => {
            setFabOpen((open) => !open);
            setReportOpen(false); // sempre volta pro menu principal quando reabre
          }}
          className={`p-4 rounded-2xl shadow-lg transition-all ${
            fabOpen ? 'bg-slate-900 text-white rotate-45' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
          title="Adicionar"
        >
          <Plus size={20} />
        </button>

        {fabOpen && !reportOpen && (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-lg p-2 flex flex-col gap-1 min-w-[220px]">
            <button
              onClick={() => {
                setPickMode('destination');
                setFabOpen(false);
              }}
              disabled={!position}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Route size={16} className="text-blue-600" /> Adicionar destino
            </button>
            <button
              onClick={() => {
                setPickMode('stop');
                setFabOpen(false);
              }}
              disabled={!position || !route}
              title={!route ? 'Precisa de uma rota ativa primeiro' : undefined}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <MapPin size={16} className="text-blue-400" /> Adicionar parada
            </button>
            <button
              onClick={() => setReportOpen(true)}
              disabled={!position}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <TriangleAlert size={16} className="text-red-600" /> Marcar problema na via
            </button>
            <button
              onClick={() => {
                setMeterModalOpen(true);
                setFabOpen(false);
              }}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Gauge size={16} className="text-emerald-600" /> Adicionar odômetro parcial
            </button>
            <button
              onClick={() => {
                setPickMode('place');
                setFabOpen(false);
              }}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <MapPin size={16} className="text-amber-600" /> Cadastrar novo lugar
            </button>
          </div>
        )}

        {fabOpen && reportOpen && (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-lg p-2 flex flex-col gap-1 min-w-[220px]">
            <button
              onClick={() => setReportOpen(false)}
              className="flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X size={12} /> Voltar
            </button>
            {HAZARD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleReportHazard(option.value)}
                disabled={reporting}
                className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aviso de "toque no mapa pra escolher o ponto" */}
      {pickMode !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">
          {pickMode === 'destination' && 'Toque no mapa pra escolher o destino'}
          {pickMode === 'stop' && 'Toque no mapa pra escolher a parada'}
          {pickMode === 'place' && 'Toque no mapa pra escolher o local'}
          <button onClick={() => setPickMode('none')} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Modal: nomear lugar salvo depois de escolher o ponto no mapa */}
      {pendingPlace && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-72">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Nome do lugar</h3>
            <input
              autoFocus
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Ex: Casa, Sítio, Padaria..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
            />
            {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPendingPlace(null);
                  setPlaceName('');
                  setActionError(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPlace}
                disabled={busy || !placeName.trim()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nomear contador parcial (sem interação no mapa) */}
      {meterModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-72">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Novo odômetro parcial</h3>
            <input
              autoFocus
              value={meterName}
              onChange={(e) => setMeterName(e.target.value)}
              placeholder="Ex: Desde troca de óleo"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
            />
            {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setMeterModalOpen(false);
                  setMeterName('');
                  setActionError(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMeter}
                disabled={busy || !meterName.trim()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
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
