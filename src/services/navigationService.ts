// src/services/navigationService.ts
//
// Navegação com rota real (OSRM, ver NavigationService.js/RouteService.js
// no DataCenter). Estado da rota ativa chega ao vivo por WS (sensor
// 'NAV_STATE', ver useNavigationState.ts) -- esses métodos só disparam a
// ação (iniciar/cancelar), não fazem polling.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface NavRoute {
  destination: { lat: number; lon: number };
  stops: { lat: number; lon: number }[]; // destino final é sempre stops[stops.length - 1]
  geometry: { lat: number; lon: number }[];
  totalDistanceKm: number;
  totalDurationMin: number;
  remainingKm: number;
  remainingMin: number;
  currentPosition: { lat: number; lon: number };
  startedAt: string;
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

  return response.status === 204 ? (null as T) : response.json();
}

export const navigationService = {
  getCurrent: () => request<NavRoute | null>('/navigation/route'),
  start: (lat: number, lon: number) =>
    request<NavRoute>('/navigation/route', { method: 'POST', body: JSON.stringify({ lat, lon }) }),
  addStop: (lat: number, lon: number) =>
    request<NavRoute>('/navigation/stops', { method: 'POST', body: JSON.stringify({ lat, lon }) }),
  cancel: () => request<null>('/navigation/route', { method: 'DELETE' }),
};
