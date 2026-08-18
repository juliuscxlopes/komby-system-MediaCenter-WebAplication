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
// FAB "+" (Plus) abre: "Rota" (RouteModal.tsx -- escolhe destino por
// sugestão/busca, roteia via OSRM, permite somar parada sem fechar, ver
// NavigationService.js), marcar problema na via, odômetro parcial, e
// cadastrar lugar salvo (nome -> saved_places, aparece no mapa como
// casinha, ver placeMarker.ts). "Modo de escolha" (pickMode) é só o escape
// "toque no mapa" tanto de destino quanto de lugar salvo.
//
// Histórico de trajetos vive DENTRO da barra de baixo (enableHistoryDrawer)
// -- toca a barra, ela "sobe" (a própria barra cresce pra cima, dentro do
// mesmo cartão) e mostra deslocamento/visitados/recentes. Opcional porque a
// Home vai reaproveitar esse componente sem esse painel.
import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Locate,
  TriangleAlert,
  Plus,
  X,
  MapPin,
  Route,
  Gauge,
  Navigation2,
  ChevronUp,
  ChevronDown,
  Star,
  Clock,
} from 'lucide-react';
import { buildMapStyle } from '../../config/mapStyle';
import { buildVehicleMarkerSvg, VEHICLE_MARKER_UPDATED_EVENT } from '../../config/vehicleMarker';
import { buildPlaceMarkerSvg } from '../../config/placeMarker';
import { CompassWidget } from './CompassWidget';
import { AddressSearchModal } from './AddressSearchModal';
import { RouteModal } from './RouteModal';
import { TripHistoryModal } from './TripHistoryModal';
import { useLiveGpsPosition } from '../../hooks/useLiveGpsPosition';
import { useNavigationState } from '../../hooks/useNavigationState';
import { onSensorUpdate } from '../../WebSocket/Listeners/WsTelemetryListeners';
import { roadEventsService, type RoadEvent, type HazardCategory } from '../../services/roadEventsService';
import { navigationService, type RouteSuggestions } from '../../services/navigationService';
import { savedPlacesService } from '../../services/savedPlacesService';
import { tripMetersService } from '../../services/tripMetersService';
import { settingsService } from '../../services/settingsService';
import { tripsService, type Trip } from '../../services/tripsService';

const DEFAULT_CENTER: [number, number] = [-43.9345, -19.9167]; // fallback antes do primeiro fix de GPS
const DEFAULT_ZOOM = 16;
const ROUTE_SOURCE_ID = 'active-route';
// Camadas de linha de via no mapStyle.ts (source-layer 'transportation') --
// usadas só pra descobrir o nome da rua atual via queryRenderedFeatures,
// sem precisar de reverse-geocode no backend (o dado já está no tile).
const ROAD_LAYER_IDS = ['road-minor', 'road-secondary', 'road-primary', 'road-motorway'];
const HISTORY_SOURCE_ID = 'trip-history';
const DOUBLE_TAP_WINDOW_MS = 280;

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
  incline:
    '<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#0891b2" stroke="white" stroke-width="2"/><path d="M6 15 L12 8 L18 15" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const EVENT_LABEL: Record<RoadEvent['type'], string> = {
  pothole: 'Buraco (detectado)',
  bump: 'Lombada (detectada)',
  hazard: 'Alerta',
  incline: 'Inclinação',
};

type PickMode = 'none' | 'destination' | 'place';

interface Props {
  enableHistoryDrawer?: boolean;
}

export function MapComponent({ enableHistoryDrawer = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const eventMarkersRef = useRef<maplibregl.Marker[]>([]);
  const placeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [follow, setFollow] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);
  const [pickMode, setPickMode] = useState<PickMode>('none');
  const [searchModal, setSearchModal] = useState<'place' | null>(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<{ lat: number; lon: number } | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [meterName, setMeterName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [vehicleMarker, setVehicleMarker] = useState<{ icon?: string; color?: string }>({});
  const [streetName, setStreetName] = useState<string | null>(null);
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);

  // Histórico (drawer da barra de baixo) -- só entra em jogo com
  // enableHistoryDrawer (Home reaproveita o mapa sem isso).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showPathsOnMap, setShowPathsOnMap] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [suggestions, setSuggestions] = useState<RouteSuggestions | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Altura do cartão de baixo pros botões flutuantes (FAB "+" e
  // "centralizar") se posicionarem sempre ACIMA dele. Não mede o cartão
  // inteiro com ResizeObserver (isso persegue a caixa DURANTE a animação de
  // abrir/fechar o drawer e sempre chega atrasado, o botão entra por baixo
  // do cartão no meio do movimento). Em vez disso: footerHeight é a parte
  // estável (velocidade + alça, não muda com drawerOpen) medida uma vez, e
  // lugaresHeight é a altura natural do conteúdo do drawer medida direto
  // (scrollHeight, não a caixa que está animando) -- soma os dois e anima o
  // `bottom` do botão com a MESMA duração da transição do drawer, os dois se
  // movem juntos em vez de um perseguir o outro.
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(112);
  const lugaresContentRef = useRef<HTMLDivElement>(null);
  const [lugaresHeight, setLugaresHeight] = useState(0);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setFooterHeight(entries[0].contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // scrollHeight do conteúdo do drawer é a altura NATURAL dele -- funciona
  // mesmo com o wrapper clipado (height:0 quando fechado), porque
  // scrollHeight é do próprio elemento, não da caixa que o esconde.
  useEffect(() => {
    if (lugaresContentRef.current) setLugaresHeight(lugaresContentRef.current.scrollHeight);
  }, [suggestions]);

  const position = useLiveGpsPosition();
  const route = useNavigationState();

  // "Mais visitados" e "recentes" eram duas listas quase iguais -- agora é
  // uma só (recentDestinations, que já inclui idas a lugar salvo), com uma
  // estrela marcando quem tem saved_place_id (é um lugar registrado, não
  // só um destino avulso).
  useEffect(() => {
    if (!enableHistoryDrawer) return;
    navigationService
      .getSuggestions()
      .then(setSuggestions)
      .catch(() => {
        // sem sugestão ainda -- a lista de histórico fica no estado vazio
      });
  }, [enableHistoryDrawer]);

  async function ensureTripsLoaded() {
    if (trips.length > 0) return trips;
    const list = await tripsService.list();
    setTrips(list);
    return list;
  }

  // Distingue toque simples de duplo sem depender do threshold nativo do
  // navegador -- primeiro toque espera a janela, segundo dentro dela cancela
  // o simples e dispara o duplo.
  function handleHistoryTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      ensureTripsLoaded().then(() => {
        setShowListModal(true);
        setDrawerOpen(false);
      });
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        ensureTripsLoaded().then((list) => {
          setShowPathsOnMap(list.length > 0);
          setDrawerOpen(false);
        });
      }, DOUBLE_TAP_WINDOW_MS);
    }
  }

  // Um marcador só, reusado tanto na carga em lote (GET /road-events) quanto
  // no push ao vivo por WS (sensor ROAD_EVENT) -- mesmo desenho/popup nos
  // dois casos, sem duplicar a lógica.
  const addEventMarker = useCallback((map: maplibregl.Map, event: RoadEvent) => {
    if (!event.location) return null;

    const el = document.createElement('div');
    el.innerHTML = EVENT_ICON[event.type];
    el.title = EVENT_LABEL[event.type];
    el.style.cursor = 'pointer';

    const detail = event.meta?.category ?? (event.meta?.direction === 'uphill' ? 'subida' : event.meta?.direction === 'downhill' ? 'descida' : null);
    const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
      `<div style="font: 500 12px sans-serif; color: #1e293b;">${EVENT_LABEL[event.type]}${detail ? ` · ${detail}` : ''}</div>`,
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

  // Lugares salvos (Casa, Sítio...) como marcador de casinha -- antes disso
  // ninguém chamava savedPlacesService.list(), então cadastrar um lugar não
  // mostrava nada no mapa depois. Recarrega no mount e toda vez que um lugar
  // novo é cadastrado (ver handleConfirmPlace/searchModal onConfirm).
  const loadSavedPlaces = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const places = await savedPlacesService.list();

      placeMarkersRef.current.forEach((m) => m.remove());
      placeMarkersRef.current = [];

      places.forEach((place) => {
        const el = document.createElement('div');
        el.innerHTML = buildPlaceMarkerSvg();
        el.title = place.name;
        el.style.cursor = 'pointer';

        const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
          `<div style="font: 500 12px sans-serif; color: #1e293b;">${place.name}</div>`,
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([place.lon, place.lat])
          .setPopup(popup)
          .addTo(map);

        placeMarkersRef.current.push(marker);
      });
    } catch {
      // silencioso -- marcador de lugar salvo é um extra visual, não pode travar o mapa se a API cair
    }
  }, []);

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

    // top-left pra sobrar o canto superior direito só pra bússola (CompassWidget).
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    // Qualquer arrasto manual desliga o "seguir" -- não fica brigando com o usuário.
    map.on('dragstart', () => setFollow(false));

    map.on('load', () => {
      loadRoadEvents();
      loadSavedPlaces();

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

      // Histórico de trajetos (toque na barra de baixo) -- fino e
      // translúcido de propósito: sobrepondo muitas trips, as ruas mais
      // percorridas ficam naturalmente mais "cheias", sem precisar calcular
      // densidade.
      map.addSource(HISTORY_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: HISTORY_SOURCE_ID,
        type: 'line',
        source: HISTORY_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#7c3aed', 'line-width': 2.5, 'line-opacity': 0.35 },
      });
    });

    mapRef.current = map;

    return () => {
      eventMarkersRef.current.forEach((m) => m.remove());
      placeMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [loadRoadEvents, loadSavedPlaces]);

  // Clique no mapa só vira "escolher ponto" quando um modo estiver ativo --
  // fora disso o mapa se comporta normal (arrastar, zoom, etc já são do MapLibre).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function handleClick(e: maplibregl.MapMouseEvent) {
      if (pickMode === 'none') return;
      const { lat, lng } = e.lngLat;

      if (pickMode === 'destination') {
        setPickMode('none');
        setBusy(true);
        setActionError(null);
        navigationService
          .start(lat, lng)
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

  // Desenha/limpa o histórico de trajetos (toque simples na barra de baixo)
  // -- trips sem path (não deveria acontecer, mas trip fechada sem GPS
  // suficiente pode não ter simplificado nada) são só ignoradas.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(HISTORY_SOURCE_ID)) return;

    const source = map.getSource(HISTORY_SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!showPathsOnMap || trips.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: trips
        .filter((t) => t.path && t.path.length > 1)
        .map((t) => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: t.path!.map((p) => [p.lon, p.lat]),
          },
        })),
    });
  }, [trips, showPathsOnMap]);

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

  // Nome da rua atual + limite de velocidade -- consulta as feições já
  // renderizadas no pixel da posição (o dado já está no tile/GeoJSON
  // carregado, sem chamada nenhuma ao DataCenter a cada tick de GPS). Nome:
  // pega a via mais próxima com `name`, sem nenhuma cai pra null (UI mostra
  // coordenadas). Limite: camada separada speed-limit-lines (maxspeed não
  // faz parte do schema OpenMapTiles, ver mapStyle.ts).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const point = map.project([position.lon, position.lat]);
    const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
      [point.x - 6, point.y - 6],
      [point.x + 6, point.y + 6],
    ];

    const roadFeatures = map.queryRenderedFeatures(bbox, { layers: ROAD_LAYER_IDS });
    const named = roadFeatures.find((f) => typeof f.properties?.name === 'string' && f.properties.name.length > 0);
    setStreetName(named ? (named.properties!.name as string) : null);

    const speedFeatures = map.queryRenderedFeatures(bbox, { layers: ['speed-limit-lines'] });
    const limit = speedFeatures.length > 0 ? parseInt(speedFeatures[0].properties?.maxspeed, 10) : NaN;
    setSpeedLimit(Number.isFinite(limit) ? limit : null);
  }, [position]);

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
      await loadSavedPlaces();
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

  const recentDestinations = suggestions?.recentDestinations.slice(0, 5) ?? [];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Bússola -- canto superior direito, sempre visível junto do resto do mapa. */}
      {position && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full shadow-lg p-1">
          <CompassWidget heading={Number.isFinite(position.heading) ? position.heading : 0} />
        </div>
      )}

      {/* Barra grande embaixo -- velocidade sempre que tem GPS; lado direito
          troca entre rua atual/sinal (parado) e km/tempo restante
          (navegando). Se enableHistoryDrawer, a barra ganha uma "alça" no
          topo -- tocar nela faz o cartão crescer pra cima (drawer) e mostrar
          deslocamento/visitados/recentes. Texto grande de propósito -- é pra
          ler de relance dirigindo, não miudinho num canto. */}
      {position && (
        <div className="absolute left-4 right-4 bottom-4 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden">
          {/* Velocidade fica no TOPO do cartão, fixa -- é o dado que
              precisa ser visto de relance dirigindo, não pode ficar pulando
              de posição quando o drawer abre. A alça vem logo abaixo dela; o
              drawer (Lugares) é o ÚLTIMO bloco, abrindo por baixo da alça. */}
          <div ref={footerRef}>
            <div className="px-6 sm:px-10 py-5 flex items-center gap-6 sm:gap-10">
              <div className="flex items-baseline gap-2 shrink-0">
                <span
                  className={`text-5xl sm:text-6xl font-bold leading-none tabular-nums ${
                    speedLimit != null && position.speed > speedLimit ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {position.speed.toFixed(0)}
                </span>
                <span className="text-base font-semibold text-slate-400">
                  km/h{speedLimit != null && <span className="block text-[11px] leading-none mt-0.5">limite {speedLimit}</span>}
                </span>
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
                    {streetName || `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)}`}
                  </p>
                  <p className="text-sm text-slate-400 font-medium mt-1.5">
                    {position.alt.toFixed(0)}m · {Number.isFinite(position.heading) ? position.heading.toFixed(0) : '--'}°
                    · {position.satellites} sat · HDOP {position.hdop.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {enableHistoryDrawer && (
              <button
                onClick={() => setDrawerOpen((o) => !o)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-slate-300 hover:text-slate-500 transition-colors border-t border-slate-50"
                title="Histórico de trajetos"
              >
                {drawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span className="text-[10px] font-bold uppercase tracking-widest">Histórico</span>
              </button>
            )}
          </div>

          {/* Altura animada com o valor MEDIDO do conteúdo (lugaresHeight),
              não um max-height chutado -- fecha exato, sem sobra nem corte. */}
          {enableHistoryDrawer && (
            <div
              style={{ height: drawerOpen ? lugaresHeight : 0, opacity: drawerOpen ? 1 : 0 }}
              className="overflow-hidden transition-all duration-300 ease-out"
            >
              <div ref={lugaresContentRef} className="px-4 sm:px-6 pt-1 pb-4">
                <button
                  onClick={handleHistoryTap}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                  title="Toque: trajetos no mapa · Toque duplo: lista"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-2">
                    <Clock size={11} /> Lugares
                  </p>
                  {recentDestinations.length === 0 ? (
                    <p className="text-[12px] text-slate-400">Nenhum ainda</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-slate-200/70">
                      {recentDestinations.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              d.saved_place_id ? 'bg-amber-50' : 'bg-white'
                            }`}
                          >
                            {d.saved_place_id ? (
                              <Star size={13} className="text-amber-500 fill-amber-500" />
                            ) : (
                              <MapPin size={13} className="text-slate-400" />
                            )}
                          </div>
                          <span className="text-[13px] font-semibold text-slate-700 truncate">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!follow && (
        <button
          onClick={() => setFollow(true)}
          style={{ bottom: footerHeight + (drawerOpen ? lugaresHeight : 0) + 56 }}
          className="absolute right-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-lg text-slate-700 hover:bg-slate-50 transition-all duration-300 ease-out"
          title="Centralizar na posição atual"
        >
          <Locate size={18} />
        </button>
      )}

      {/* FAB "+" -- todas as ações de "adicionar" ficam aqui: rota (destino +
          parada dentro do próprio modal), marcar problema na via (submenu
          aninhado), odômetro parcial, lugar. `bottom` = altura estável do
          rodapé (footerHeight) + altura do drawer só quando aberto
          (lugaresHeight) -- mesma duração de transição do drawer (300ms), os
          dois se movem juntos em vez do botão perseguir a caixa animando. */}
      <div
        className="absolute right-20 flex flex-col-reverse items-end gap-2 transition-all duration-300 ease-out"
        style={{ bottom: footerHeight + (drawerOpen ? lugaresHeight : 0) + 56 }}
      >
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
            <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">Rota</p>
            <button
              onClick={() => {
                setRouteModalOpen(true);
                setFabOpen(false);
              }}
              disabled={!position}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Route size={16} className="text-blue-600" /> Iniciar rota
            </button>
            <button
              onClick={() => {
                setSearchModal('place');
                setFabOpen(false);
              }}
              className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <MapPin size={16} className="text-amber-600" /> Cadastrar novo lugar
            </button>

            <p className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 border-t border-slate-50 mt-1">
              Trajeto
            </p>
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
          {pickMode === 'place' && 'Toque no mapa pra escolher o local'}
          <button onClick={() => setPickMode('none')} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Busca de endereço por texto pra cadastrar lugar salvo -- "ou toque
          no mapa" cai no fluxo antigo (pickMode + modal de nomear). */}
      {searchModal === 'place' && (
        <AddressSearchModal
          title="Cadastrar novo lugar"
          requireNickname
          onClose={() => setSearchModal(null)}
          onPickOnMap={() => {
            setPickMode('place');
            setSearchModal(null);
          }}
          onConfirm={async (result) => {
            setSearchModal(null);
            setBusy(true);
            setActionError(null);
            try {
              await savedPlacesService.create({ name: result.nickname || result.label, lat: result.lat, lon: result.lon });
              await loadSavedPlaces();
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Falha ao processar.');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {/* "Rota" -- escolhe destino (sugestões por mais visitado/recente, ou
          busca), depois mostra km/tempo ao vivo com opção de somar parada. */}
      {routeModalOpen && (
        <RouteModal
          onClose={() => setRouteModalOpen(false)}
          onPickOnMap={() => {
            setPickMode('destination');
            setRouteModalOpen(false);
          }}
        />
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

      {showListModal && <TripHistoryModal trips={trips} onClose={() => setShowListModal(false)} />}

      {!position && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm text-slate-400 text-sm font-medium gap-2">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
          Aguardando sinal de GPS...
        </div>
      )}
    </div>
  );
}
