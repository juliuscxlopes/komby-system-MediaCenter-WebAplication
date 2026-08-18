// src/services/maintenanceService.ts
//
// Abastecimento e troca de óleo -- log de verdade (odometro_km de cada
// linha é o valor NO MOMENTO do evento, ver FuelRefillModel/OilChangeModel
// no DataCenter). Abastecimento misto (álcool + pódium na mesma parada)
// vira uma linha por tipo de combustível, mesmo km/data.
const API_URL = import.meta.env.VITE_API_URL || '';

export type FuelType = 'alcool' | 'gasolina' | 'podium' | 'outro';

export interface FuelRefill {
  id: string;
  liters: number;
  cost: number | null;
  odometro_km: number;
  refilled_at: string;
  fuel_type: FuelType | null;
  price_per_liter: number | null;
}

export interface OilChange {
  id: string;
  odometro_km: number;
  changed_at: string;
  notes: string | null;
  oil_type: string | null;
  brand: string | null;
  viscosity: string | null;
}

export interface FuelReceipt {
  id: string;
  url: string;
  nome_original: string;
}

export interface MaintenanceSummary {
  lastRefill: FuelRefill | null;
  avgConsumptionKmPerL: number | null;
  tankCapacityL: number | null;
  lastOilChange: OilChange | null;
  kmSinceOilChange: number | null;
  oilChangeIntervalKm: number | null;
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

export const maintenanceService = {
  getSummary: () => request<MaintenanceSummary>('/maintenance/summary'),
  listRefills: () => request<FuelRefill[]>('/fuel-refills'),
  createRefill: (data: {
    liters: number;
    cost?: number;
    odometro_km: number;
    refilled_at?: string;
    fuel_type?: FuelType;
    price_per_liter?: number;
  }) => request<FuelRefill>('/fuel-refills', { method: 'POST', body: JSON.stringify(data) }),

  async uploadReceipt(refillId: string, file: File): Promise<FuelReceipt> {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_URL}/fuel-refills/${refillId}/receipt`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!response.ok) throw new Error('Falha ao anexar nota fiscal.');
    return response.json();
  },

  listOilChanges: () => request<OilChange[]>('/oil-changes'),
  createOilChange: (data: { odometro_km: number; changed_at?: string; notes?: string; oil_type?: string; brand?: string; viscosity?: string }) =>
    request<OilChange>('/oil-changes', { method: 'POST', body: JSON.stringify(data) }),
};
