// src/services/peopleService.ts
//
// Pessoas cadastradas + quem está a bordo agora (toggle manual, versão 1 --
// detecção automática por WiFi fica pra uma fase futura). Peso total
// estimado = peso vazio do veículo + soma dos embarcados.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface Person {
  id: string;
  name: string;
  avg_weight_kg: number;
  phone: string | null;
  currently_onboard: boolean;
  boarded_at: string | null;
}

export interface OnboardSummary {
  onboard: Person[];
  peopleWeightKg: number;
  emptyWeightKg: number;
  totalEstimatedKg: number;
  capacityKg: number | null;
  overCapacity: boolean;
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

export const peopleService = {
  list: () => request<Person[]>('/people'),
  create: (data: { name: string; avg_weight_kg?: number; phone?: string }) =>
    request<Person>('/people', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name: string; avg_weight_kg?: number; phone?: string }) =>
    request<Person>(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<null>(`/people/${id}`, { method: 'DELETE' }),
  board: (id: string) => request<Person>(`/people/${id}/board`, { method: 'POST' }),
  unboard: (id: string) => request<Person>(`/people/${id}/unboard`, { method: 'POST' }),
  getOnboardSummary: () => request<OnboardSummary>('/people/onboard-summary'),
};
