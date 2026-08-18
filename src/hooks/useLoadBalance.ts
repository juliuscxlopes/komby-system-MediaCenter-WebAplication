// src/hooks/useLoadBalance.ts
//
// Mesmo padrão de useNavigationState.ts: busca o estado atual uma vez ao
// montar, depois só escuta atualizações ao vivo (sensor 'LOAD_BALANCE').
import { useEffect, useState } from 'react';
import { onMetricUpdate } from '../WebSocket/Listeners/WsTelemetryListeners';
import { socketService } from '../WebSocket/WsConfig';
import { suspensionService, type LoadBalanceState } from '../services/suspensionService';

export function useLoadBalance() {
  const [state, setState] = useState<LoadBalanceState | null>(null);

  useEffect(() => {
    socketService.connect();

    suspensionService.getCurrent().then(setState).catch(() => {});

    onMetricUpdate('LOAD_BALANCE', (data) => {
      setState((data as unknown as LoadBalanceState) ?? null);
    });
  }, []);

  return state;
}
