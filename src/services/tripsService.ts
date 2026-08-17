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

export const tripsService = {
  async list(): Promise<Trip[]> {
    const response = await fetch(`${API_URL}/trips`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },
};
