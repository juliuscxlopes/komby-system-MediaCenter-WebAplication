// src/services/tripsService.ts
//
// Histórico geral de trajetos (trips fechadas, ver TripSegmentationService
// no DataCenter) -- painel do Mapas: toque simples desenha o `path` de
// cada uma no mapa, toque duplo lista dia/hora/duração/km.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface Trip {
  id: string;
  started_at: string;
  ended_at: string;
  // decimal no Postgres -- o driver devolve como string, não number (sem
  // type parser custom registrado). Sempre envolver em Number() antes de
  // .toFixed()/conta -- já mordeu uma vez (TripHistoryModal).
  distance_km: string;
  moving_seconds: number;
  idle_seconds: number;
  avg_speed: string;
  max_speed: string;
  path: { lat: number; lon: number; t: number }[] | null;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  type: string;
  occurred_at: string;
  location: { lat: number; lon: number } | null;
  meta: Record<string, unknown> | null;
}

export const tripsService = {
  async list(): Promise<Trip[]> {
    const response = await fetch(`${API_URL}/trips`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getEvents(tripId: string): Promise<TripEvent[]> {
    const response = await fetch(`${API_URL}/trips/${tripId}/events`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  // series: uma lista por canal (RPM, CHT1...), direto do InfluxDB. summary:
  // médias + quantas vezes passou do range + se algum dano foi considerado
  // durante o trajeto (ver TelemetryHistoryService.js no DataCenter).
  async getTelemetry(tripId: string): Promise<TripTelemetry> {
    const response = await fetch(`${API_URL}/trips/${tripId}/telemetry`, { credentials: 'include' });
    if (!response.ok) return { series: {}, summary: null };
    return response.json();
  },
};

// "80% subida", "70% em carga" -- % de AMOSTRAS do IMU/LOAD classificadas em
// cada categoria (ver TelemetryHistoryService._buildComposition). null num
// campo de % = sem amostra nenhuma pra essa categoria na trip (não 0%).
export interface TripComposition {
  pitchSampleCount: number;
  inclineUpPct: number | null;
  inclineDownPct: number | null;
  flatPct: number | null;
  loadSampleCount: number;
  loadZonePct: {
    MARCHA_LENTA: number | null;
    CRUZEIRO: number | null;
    CARGA_ALTA: number | null;
    CARGA_MAXIMA: number | null;
  };
  damageStatusPct: {
    OPERACIONAL: number | null;
    PRE_DAMAGE_WARNING: number | null;
    PRE_DAMAGE_CRITICAL: number | null;
  };
  riskEntered: boolean;
}

export interface TripTelemetrySummary {
  avgCht: number | null;
  avgOilTemp: number | null;
  avgLambda: number | null;
  avgViscosity: number | null;
  chtLimit: number | null;
  oilLimit: number | null;
  chtExceedCount: number | null;
  oilExceedCount: number | null;
  damageOccurred: boolean;
  damageSampleCount: number;
  composition: TripComposition;
}

export interface TripTelemetry {
  series: Record<string, { t: string; v: number }[]>;
  summary: TripTelemetrySummary | null;
}
