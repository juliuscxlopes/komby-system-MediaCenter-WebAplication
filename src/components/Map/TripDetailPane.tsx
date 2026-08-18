// src/components/Map/TripDetailPane.tsx
//
// Conteúdo de detalhe de UM trajeto -- mini-mapa com o caminho percorrido +
// pins dos eventos, estatísticas, telemetria (InfluxDB, ver
// TelemetryHistoryService.js) reaproveitando o MESMO TelemetryChart do
// Dashboard ao vivo, e o resumo de médias/alertas. Sem casca de modal
// própria -- vive dentro do painel direito de TripHistoryModal.tsx (lista +
// detalhe no mesmo modal, sem empilhar um segundo por cima).
import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Clock, Gauge, TrendingUp, ShieldAlert, Droplet, Mountain, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { buildMapStyle } from '../../config/mapStyle';
import { tripsService, type Trip, type TripEvent, type TripTelemetrySummary } from '../../services/tripsService';
import { TelemetryChart } from '../Dashboard/TelemetryChart';
import { XAxisSelector } from '../Dashboard/XAxisSelector';
import { SENSORS_BY_SIDE, expandWithPair } from '../../config/sensors';
import type { LiveSample, XAxisMode } from '../../types/TypesApp/TelemetryTypes';

interface Props {
  trip: Trip;
}

const EVENT_COLOR: Record<string, string> = {
  bump: '#b45309',
  pothole: '#1e293b',
  hazard: '#dc2626',
  incline: '#0891b2',
  damage: '#dc2626',
};

const EVENT_LABEL: Record<string, string> = {
  bump: 'Lombada',
  pothole: 'Buraco',
  hazard: 'Alerta',
  incline: 'Inclinação',
  damage: 'Dano',
  arrived_at_place: 'Chegada',
  left_place: 'Saída',
};

interface DamageRule {
  id: string;
  description?: string;
  grau?: number;
  tag?: string;
  etaMinutos?: number;
  nivelDescricao?: string;
}

// Uma barra segmentada simples (label + % + cor) -- reaproveitada pros dois
// grupos de composição (relevo do trajeto e carga do motor). Segmentos sem
// amostra (pct null) não entram na barra nem na legenda.
function CompositionBar({ segments }: { segments: { label: string; pct: number | null; color: string }[] }) {
  const visible = segments.filter((s) => s.pct != null && s.pct > 0);
  if (visible.length === 0) return <p className="text-xs text-slate-400">Sem amostra suficiente.</p>;

  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
        {visible.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label}: ${s.pct}%`} />
        ))}
      </div>
      <div className="flex gap-x-4 gap-y-1 flex-wrap mt-2">
        {visible.map((s) => (
          <span key={s.label} className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
            {s.label} <span className="text-slate-900 tabular-nums">{s.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

export function TripDetailPane({ trip }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [telemetry, setTelemetry] = useState<Record<string, { t: string; v: number }[]>>({});
  const [summary, setSummary] = useState<TripTelemetrySummary | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('time');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const eventMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    tripsService.getEvents(trip.id).then(setEvents);
    setLoadingTelemetry(true);
    tripsService
      .getTelemetry(trip.id)
      .then(({ series, summary }) => {
        setTelemetry(series);
        setSummary(summary);
        // Começa com os canais que a Dashboard ao vivo mostra por padrão --
        // se a trip não tiver leitura de algum, o toggle continua disponível,
        // só não entra marcado sozinho.
        const defaults = ['RPM', 'OIL_T', 'CHT1'].filter((id) => series[id]?.length);
        setActiveIds(new Set(defaults.length ? defaults : Object.keys(series).slice(0, 3)));
      })
      .finally(() => setLoadingTelemetry(false));
  }, [trip.id]);

  // Uma série por canal (timestamps próprios, não alinhados entre canais --
  // grupos de sensor diferentes gravam em instantes diferentes) vira uma
  // única lista de amostras esparsas: mesmo formato que useLiveSensorSeries
  // já produz pro gráfico ao vivo (TelemetryChart tolera valor ausente por
  // amostra, `connectNulls` desenha a linha só com os pontos reais).
  const history = useMemo<LiveSample[]>(() => {
    const byTime = new Map<number, LiveSample>();
    for (const [field, points] of Object.entries(telemetry)) {
      for (const { t, v } of points) {
        const ts = new Date(t).getTime();
        if (!byTime.has(ts)) byTime.set(ts, { timestamp: ts });
        byTime.get(ts)![field] = v;
      }
    }
    return Array.from(byTime.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [telemetry]);

  // Sempre os 9 sensores, igual à Dashboard ao vivo (SENSORS_BY_SIDE) -- antes
  // filtrava pra só quem tinha dado nessa trip específica, e sensor sem
  // leitura sumia da lista inteira (parecia que nem existia). Agora o chip
  // continua ali, só desabilitado quando não tem leitura pra essa trip. Modo
  // RPM some do próprio eixo X, mesma regra da Dashboard.
  const availableSensors = xAxisMode === 'rpm' ? SENSORS_BY_SIDE.filter((s) => s.id !== 'RPM') : SENSORS_BY_SIDE;
  const activeSensors = availableSensors.filter((s) => activeIds.has(s.id));
  const hasAnyTelemetry = Object.keys(telemetry).length > 0;

  // Eventos de via (chip wall) vs alertas de dano (lista separada, com
  // detalhe de regra + clique pra localizar no mapa) -- misturados como
  // "Dano" x28 numa trip só virava ruído (ver handleDamageReading no
  // RoadEventService, que agora também deduplica por escalada de rank).
  const roadEvents = events.filter((e) => e.type !== 'damage');
  // Danos com regra específica (ver RoadEventService.handleDamageReading) --
  // só existe pra trips gravadas DEPOIS desse recurso; trips antigas mostram
  // só o status agregado do Influx (summary.damageOccurred), sem detalhe.
  const damageEvents = events.filter((e) => e.type === 'damage');

  function toggleSensor(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      const ids = expandWithPair(id);
      const allActive = ids.every((i) => next.has(i));
      ids.forEach((i) => (allActive ? next.delete(i) : next.add(i)));
      return next;
    });
  }

  // Clique num alerta da lista: centraliza o mini-mapa exatamente naquele
  // pino e abre o popup dele, pra ficar claro qual dos alertas é qual no mapa.
  function selectAlert(event: TripEvent) {
    setSelectedAlertId(event.id);
    const map = mapRef.current;
    if (!map || !event.location) return;
    map.flyTo({ center: [event.location.lon, event.location.lat], zoom: 16, duration: 600 });
    eventMarkersRef.current.get(event.id)?.togglePopup();
  }

  // Sem guarda de "já existe mapa" de propósito -- esse painel fica vivo
  // trocando de trip (lista à esquerda em TripHistoryModal), não remonta a
  // cada seleção. O cleanup do efeito anterior já derruba o mapa velho
  // antes de criar o novo quando `trip` muda.
  useEffect(() => {
    if (!containerRef.current || !trip.path || trip.path.length < 2) return;

    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(),
      center: [trip.path[0].lon, trip.path[0].lat],
      zoom: 12,
      attributionControl: { compact: true },
    });

    map.on('load', () => {
      map.addSource('trip-detail-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: trip.path!.map((p) => [p.lon, p.lat]) },
        },
      });
      map.addLayer({
        id: 'trip-detail-path',
        type: 'line',
        source: 'trip-detail-path',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.85 },
      });

      const start = trip.path![0];
      const bounds = trip.path!.reduce(
        (b, p) => b.extend([p.lon, p.lat]),
        new maplibregl.LngLatBounds([start.lon, start.lat], [start.lon, start.lat]),
      );
      map.fitBounds(bounds, { padding: 48, duration: 0 });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [trip]);

  // Efeito separado dos pins -- eventos chegam de um fetch assíncrono à
  // parte, o mapa já pode estar pronto antes ou depois deles. Guarda num Map
  // por id (não array) pra selectAlert() conseguir achar o pino certo e
  // centralizar/abrir o popup dele quando o usuário clica na lista.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || events.length === 0) return;

    const markers = new Map<string, maplibregl.Marker>();
    function addMarkers() {
      events.forEach((event) => {
        if (!event.location) return;
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '50%';
        el.style.background = EVENT_COLOR[event.type] || '#64748b';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        el.title = EVENT_LABEL[event.type] || event.type;
        const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
          `<div style="font: 600 11px sans-serif; color: #1e293b;">${EVENT_LABEL[event.type] || event.type} · ${new Date(event.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>`,
        );
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([event.location.lon, event.location.lat])
          .setPopup(popup)
          .addTo(map!);
        markers.set(event.id, marker);
      });
      eventMarkersRef.current = markers;
    }

    if (map.loaded()) addMarkers();
    else map.once('load', addMarkers);

    return () => markers.forEach((m) => m.remove());
  }, [events]);

  return (
    <div>
      <div ref={containerRef} className="h-64" />

      <div className="grid grid-cols-4 gap-4 px-6 py-5 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={11} /> Distância
          </p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{Number(trip.distance_km).toFixed(1)} km</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <Clock size={11} /> Duração
          </p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{formatDuration(trip.moving_seconds)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <Gauge size={11} /> Vel. Média
          </p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{Number(trip.avg_speed).toFixed(0)} km/h</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <Gauge size={11} /> Vel. Máx
          </p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{Number(trip.max_speed).toFixed(0)} km/h</p>
        </div>
      </div>

      {roadEvents.length > 0 && (
        <div className="px-6 pb-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{roadEvents.length} evento(s) no trajeto</p>
          <div className="flex gap-2 flex-wrap">
            {roadEvents.map((e) => (
              <span key={e.id} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                {EVENT_LABEL[e.type] || e.type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de dano -- lista fechada por padrão (puxa pra baixo pra
          ver), cada linha clicável centraliza o mapinha exatamente naquele
          pino (ver selectAlert). Separado dos eventos de via de propósito --
          "Dano" x28 misturado ali virava ruído, ver comentário em
          roadEvents/damageEvents acima. */}
      {damageEvents.length > 0 && (
        <div className="px-6 pb-5">
          <button
            onClick={() => setAlertsOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
              <ShieldAlert size={11} /> {damageEvents.length} alerta{damageEvents.length > 1 ? 's' : ''} de dano
            </p>
            {alertsOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              alertsOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex flex-col divide-y divide-slate-100">
              {damageEvents.map((e) => {
                const rules = ((e.meta?.rules as DamageRule[]) || []).filter((r) => r.description);
                const isCritical = (e.meta?.status as string) === 'PRE_DAMAGE_CRITICAL';
                return (
                  <button
                    key={e.id}
                    onClick={() => selectAlert(e)}
                    className={`text-left py-2.5 px-2 -mx-2 rounded-lg flex items-start gap-2.5 transition-colors hover:bg-slate-50 ${
                      selectedAlertId === e.id ? 'bg-red-50' : ''
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 tabular-nums ${
                        isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {new Date(e.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-slate-600 flex-1 min-w-0">
                      {rules.length > 0 ? rules.map((r) => r.description).join(' · ') : isCritical ? 'Crítico' : 'Alerta'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pb-6 pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Telemetria do trajeto</p>
          {hasAnyTelemetry && <XAxisSelector mode={xAxisMode} onChange={setXAxisMode} />}
        </div>

        {loadingTelemetry ? (
          <p className="text-xs text-slate-400">Consultando InfluxDB...</p>
        ) : !hasAnyTelemetry ? (
          <p className="text-xs text-slate-400">Sem telemetria gravada pra esse trajeto.</p>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap mb-4">
              {availableSensors.map((sensor) => {
                const hasData = (telemetry[sensor.id]?.length ?? 0) > 0;
                const active = hasData && activeIds.has(sensor.id);
                return (
                  <button
                    key={sensor.id}
                    onClick={() => toggleSensor(sensor.id)}
                    disabled={!hasData}
                    title={hasData ? undefined : 'Sem leitura nesse trajeto'}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      !hasData
                        ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                        : active
                          ? 'text-white border-transparent'
                          : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                    style={active ? { backgroundColor: sensor.color } : undefined}
                  >
                    {sensor.label}
                  </button>
                );
              })}
            </div>
            <TelemetryChart sensors={activeSensors} history={history} xAxisMode={xAxisMode} />
          </>
        )}
      </div>

      {/* Médias + quantas vezes passou do range + se algum dano foi
          considerado -- mesma consulta acima, resumida no backend (ver
          TelemetryHistoryService._buildSummary). Limite "fora do range"
          usa sensor_operational_limits de verdade (Configurações > Limites
          Operacionais), não um valor inventado -- sem limite ativo pro
          sensor, o card correspondente não aparece. */}
      {summary && (
        <div className="px-6 pb-6 pt-1 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Médias e alertas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {summary.avgCht != null && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">CHT média</p>
                <p className="text-base font-bold text-slate-900 tabular-nums">{summary.avgCht.toFixed(0)}°C</p>
              </div>
            )}
            {summary.avgOilTemp != null && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Óleo média</p>
                <p className="text-base font-bold text-slate-900 tabular-nums">{summary.avgOilTemp.toFixed(0)}°C</p>
              </div>
            )}
            {summary.avgLambda != null && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Lambda média</p>
                <p className="text-base font-bold text-slate-900 tabular-nums">{summary.avgLambda.toFixed(2)}λ</p>
              </div>
            )}
            {summary.avgViscosity != null && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Droplet size={10} /> Viscosidade média
                </p>
                <p className="text-base font-bold text-slate-900 tabular-nums">{summary.avgViscosity.toFixed(1)}</p>
              </div>
            )}
            {summary.chtExceedCount != null && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">CHT fora do range</p>
                <p className={`text-base font-bold tabular-nums ${summary.chtExceedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {summary.chtExceedCount}x
                </p>
              </div>
            )}
            {summary.oilExceedCount != null && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Óleo fora do range</p>
                <p className={`text-base font-bold tabular-nums ${summary.oilExceedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {summary.oilExceedCount}x
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <ShieldAlert size={10} /> Entrou em risco
              </p>
              <p className={`text-base font-bold tabular-nums ${summary.composition.riskEntered ? 'text-red-600' : 'text-emerald-600'}`}>
                {summary.composition.riskEntered ? `Sim (${summary.damageSampleCount}x)` : 'Não'}
              </p>
            </div>
          </div>

          {/* Detalhe da regra fica na lista de alertas logo acima (clicável,
              localiza no mapa) -- aqui só o resumo numérico. Trip antiga sem
              o recurso de regra específica (ver damageEvents) só tem esse
              "Sim/Não" mesmo, sem detalhe pra mostrar. */}
          {summary.composition.riskEntered && damageEvents.length === 0 && (
            <p className="text-xs text-slate-400 mt-3">
              Essa trip não tem o detalhe da regra específica registrado (recurso adicionado depois dela).
            </p>
          )}
        </div>
      )}

      {/* Composição do trajeto -- % de amostras do IMU/LOAD em cada
          classificação (relevo/carga do motor). Ver
          TelemetryHistoryService._buildComposition. */}
      {summary && summary.composition.pitchSampleCount + summary.composition.loadSampleCount > 0 && (
        <div className="px-6 pb-6 pt-1 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Composição do trajeto</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {summary.composition.pitchSampleCount > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Mountain size={12} /> Relevo
                </p>
                <CompositionBar
                  segments={[
                    { label: 'Subida', pct: summary.composition.inclineUpPct, color: '#d97706' },
                    { label: 'Plano', pct: summary.composition.flatPct, color: '#cbd5e1' },
                    { label: 'Descida', pct: summary.composition.inclineDownPct, color: '#0284c7' },
                  ]}
                />
              </div>
            )}
            {summary.composition.loadSampleCount > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Activity size={12} /> Carga do motor
                </p>
                <CompositionBar
                  segments={[
                    { label: 'Marcha lenta', pct: summary.composition.loadZonePct.MARCHA_LENTA, color: '#cbd5e1' },
                    { label: 'Cruzeiro', pct: summary.composition.loadZonePct.CRUZEIRO, color: '#059669' },
                    { label: 'Carga alta', pct: summary.composition.loadZonePct.CARGA_ALTA, color: '#d97706' },
                    { label: 'Carga máxima', pct: summary.composition.loadZonePct.CARGA_MAXIMA, color: '#dc2626' },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
