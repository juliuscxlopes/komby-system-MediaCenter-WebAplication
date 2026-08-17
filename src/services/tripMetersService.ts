// src/services/tripMetersService.ts
//
// Contador parcial nomeado (trip A/trip B do painel, "km desde a troca de
// óleo") -- soma junto com o odômetro principal, reseta independente. Ver
// TripMeterModel.js/TripSegmentationService.js no DataCenter.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface TripMeter {
  id: string;
  name: string;
  km: number;
  created_at: string;
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

export const tripMetersService = {
  list: () => request<TripMeter[]>('/trip-meters'),
  create: (name: string) => request<TripMeter>('/trip-meters', { method: 'POST', body: JSON.stringify({ name }) }),
  reset: (id: string) => request<TripMeter>(`/trip-meters/${id}/reset`, { method: 'POST' }),
  remove: (id: string) => request<null>(`/trip-meters/${id}`, { method: 'DELETE' }),
};
