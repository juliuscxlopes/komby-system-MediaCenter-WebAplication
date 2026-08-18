// src/services/roadEventsService.ts
//
// Eventos de via pra pin no mapa: buraco/lombada que o RoadEventService do
// DataCenter detecta sozinho pelo IMU (type 'bump'/'pothole'), inclinação
// sustentada (type 'incline', meta.direction 'uphill'/'downhill', mesmo
// serviço via IMU_PITCH), mais alerta manual que o motorista registra na
// hora (type 'hazard', subtipo livre em meta.category -- ver migration
// 08_TripEventHazard no DataCenter).
const API_URL = import.meta.env.VITE_API_URL || '';

export type RoadEventType = 'bump' | 'pothole' | 'hazard' | 'incline';
export type HazardCategory = 'buraco' | 'lombada' | 'perigo' | 'alagamento' | 'outro';

export interface RoadEvent {
  id: string;
  trip_id: string | null;
  type: RoadEventType;
  occurred_at: string;
  location: { lat: number; lon: number } | null;
  meta: Record<string, unknown> | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Falha na requisição (${response.status})`);
  }

  return response.json();
}

export const roadEventsService = {
  // Não filtra por bbox (backend não tem PostGIS) -- pega os eventos
  // recentes e o mapa decide o que cabe no viewport atual.
  list: () => request<RoadEvent[]>('/road-events'),

  // Posição vem do worker no DataCenter (GPS embarcado), não do navegador --
  // por isso só manda type/meta, igual ao botão manual de bump/pothole.
  reportHazard: (category: HazardCategory) =>
    request<RoadEvent>('/trip-events', {
      method: 'POST',
      body: JSON.stringify({ type: 'hazard', meta: { category } }),
    }),
};
