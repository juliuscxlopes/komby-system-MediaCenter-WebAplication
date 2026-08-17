// src/services/savedPlacesService.ts
//
// Lugares nomeados (Casa, Sítio, Padaria X) -- ponto + raio, usados pelo
// PlaceProximityService no DataCenter pra gerar arrived_at_place/left_place.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radius_m: number;
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

export const savedPlacesService = {
  list: () => request<SavedPlace[]>('/saved-places'),
  create: (data: { name: string; lat: number; lon: number; radius_m?: number }) =>
    request<SavedPlace>('/saved-places', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: string) => request<null>(`/saved-places/${id}`, { method: 'DELETE' }),
};
