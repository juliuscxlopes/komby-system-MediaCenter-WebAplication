// src/services/suspensionService.ts
//
// Balanceamento de carga por curso de suspensão -- indicador RELATIVO, não
// peso calibrado (não existe célula de carga no sistema, ver
// SuspensionService.js no DataCenter). Estado ao vivo chega por WS (sensor
// 'LOAD_BALANCE', ver useLoadBalance.ts) -- getCurrent() é só o fetch
// inicial ao montar a página.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface LoadBalanceState {
  deviations: { FL: number; FR: number; RL: number; RR: number };
  heaviestCorner: 'FL' | 'FR' | 'RL' | 'RR' | null;
  balanced: boolean;
  updatedAt: string;
}

export const suspensionService = {
  async getCurrent(): Promise<LoadBalanceState | null> {
    const response = await fetch(`${API_URL}/suspension/load-balance`, { credentials: 'include' });
    if (!response.ok) return null;
    return response.json(); // null literal se o serviço ainda não recebeu nenhuma leitura
  },
};
