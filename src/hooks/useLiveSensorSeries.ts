// src/hooks/useLiveSensorSeries.ts
//
// Assina os sensores via WS (Core -> Redis pub/sub -> DataCenter -> aqui,
// pipeline que já existe) e devolve duas coisas:
// - `history`: uma amostra por segundo, alinhada no tempo -- é assim que o
//   gráfico consegue desenhar várias linhas de sensores que chegam em
//   instantes diferentes sem ficar quebrado (Recharts precisa de um array
//   só, com todas as séries no mesmo eixo X).
// - `latest`: o valor + status mais recente de cada sensor, atualizado a
//   cada mensagem (sem esperar o tick de amostragem) -- pros cards de
//   sensor, que devem refletir o dado assim que ele chega.
import { useEffect, useRef, useState } from 'react';
import { onSensorUpdate, type SensorReading } from '../WebSocket/Listeners/WsTelemetryListeners';
import { socketService } from '../WebSocket/WsConfig';
import type { LiveSample } from '../types/TypesApp/TelemetryTypes';

const SAMPLE_INTERVAL_MS = 1000;
const WINDOW_SIZE = 300; // 5 minutos de janela a 1 amostra/s

export interface LatestReading {
  value: number;
  status: string;
}

export function useLiveSensorSeries(sensorIds: readonly string[]) {
  const [history, setHistory] = useState<LiveSample[]>([]);
  const [latest, setLatest] = useState<Record<string, LatestReading>>({});
  const latestValues = useRef<Record<string, number>>({});

  useEffect(() => {
    socketService.connect();

    sensorIds.forEach((id) => {
      onSensorUpdate(id, (reading: SensorReading) => {
        const value = Number(reading.value);
        if (Number.isNaN(value)) return;

        latestValues.current[id] = value;
        setLatest((prev) => ({ ...prev, [id]: { value, status: reading.status } }));
      });
    });

    const timer = setInterval(() => {
      setHistory((prev) => {
        const sample: LiveSample = { timestamp: Date.now(), ...latestValues.current };
        const next = [...prev, sample];
        return next.length > WINDOW_SIZE ? next.slice(next.length - WINDOW_SIZE) : next;
      });
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(timer);
    // sensorIds vem de uma constante (SENSORS.map(...)) -- assina uma vez no mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { history, latest };
}
