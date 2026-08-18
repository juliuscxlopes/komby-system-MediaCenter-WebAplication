// src/hooks/useAttitude.ts
//
// Pitch/roll ao vivo (sensor 'ATTITUDE', broadcast contínuo do
// RoadEventService a cada leitura de IMU -- sem fetch inicial porque não é
// persistido em lugar nenhum, só o estado do instante). Alimenta o
// horizonte artificial do dashboard (ver AttitudeIndicator.tsx).
import { useEffect, useState } from 'react';
import { onMetricUpdate } from '../WebSocket/Listeners/WsTelemetryListeners';
import { socketService } from '../WebSocket/WsConfig';

export interface Attitude {
  pitch: number;
  roll: number;
}

export function useAttitude() {
  const [attitude, setAttitude] = useState<Attitude>({ pitch: 0, roll: 0 });

  useEffect(() => {
    socketService.connect();
    onMetricUpdate('ATTITUDE', (data) => {
      setAttitude(data as unknown as Attitude);
    });
  }, []);

  return attitude;
}
