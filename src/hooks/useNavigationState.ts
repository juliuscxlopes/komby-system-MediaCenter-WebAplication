// src/hooks/useNavigationState.ts
//
// Rota ativa de navegação -- busca o estado atual uma vez ao montar (cobre
// o caso de já existir rota em andamento de antes do reload) e depois só
// escuta atualizações ao vivo (sensor 'NAV_STATE', mesmo pipeline de
// telemetria). payload null = sem rota ativa (chegou ou foi cancelada).
import { useEffect, useState } from 'react';
import { onMetricUpdate } from '../WebSocket/Listeners/WsTelemetryListeners';
import { socketService } from '../WebSocket/WsConfig';
import { navigationService, type NavRoute } from '../services/navigationService';

export function useNavigationState() {
  const [route, setRoute] = useState<NavRoute | null>(null);

  useEffect(() => {
    socketService.connect();

    navigationService.getCurrent().then(setRoute).catch(() => {});

    onMetricUpdate('NAV_STATE', (data) => {
      setRoute((data as unknown as NavRoute) ?? null);
    });
  }, []);

  return route;
}
