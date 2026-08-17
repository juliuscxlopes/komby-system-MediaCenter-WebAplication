// src/services/statsService.ts
//
// Resumo de deslocamento (semana/mês) -- soma daily_stats, já alimentado a
// cada trip fechada no DataCenter (ver DailyStatsModel.getSummary()).
const API_URL = import.meta.env.VITE_API_URL || '';

export interface DistanceSummary {
  weekKm: number;
  monthKm: number;
}

export const statsService = {
  async getDistance(): Promise<DistanceSummary> {
    const response = await fetch(`${API_URL}/stats/distance`, { credentials: 'include' });
    if (!response.ok) return { weekKm: 0, monthKm: 0 };
    return response.json();
  },
};
