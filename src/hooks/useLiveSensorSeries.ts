// src/hooks/useLiveSensorSeries.ts
//
// Assina os sensores via WS (Core -> Redis pub/sub -> DataCenter -> aqui,
// pipeline que já existe) e devolve três coisas:
// - `history`: uma amostra por segundo, alinhada no tempo -- pro gráfico
//   principal e pros sparklines dos modais de detalhe.
// - `latest`: valor + status mais recente de cada sensor bruto, atualizado
//   a cada mensagem (sem esperar o tick de amostragem) -- pros cards.
// - `latestMetrics`: o resultado mais recente dos módulos de cálculo do
//   Core (ThermalEngineMath, CombustionEngineMath, LoadEngineMath,
//   LubricationEngineMath, ElectricalEngineMath) -- tendência, janela
//   min/max/média, ETA até alerta/crítico, divergência entre canais, etc.
//   Vira o conteúdo do modal de detalhe de cada sensor.
import { useEffect, useRef, useState } from 'react';
import { onSensorUpdate, onMetricUpdate, type SensorReading, type MetricReading } from '../WebSocket/Listeners/WsTelemetryListeners';
import { socketService } from '../WebSocket/WsConfig';
import type { LiveSample } from '../types/TypesApp/TelemetryTypes';

const SAMPLE_INTERVAL_MS = 1000;
const WINDOW_SIZE = 300; // 5 minutos de janela a 1 amostra/s

// [AJUSTE] ThermalEngineMath publica no MESMO nome de canal do sensor bruto
// (CHT1/CHT2/OIL_T) -- por isso não precisa de entrada própria aqui, o
// onSensorUpdate desses 3 já recebe as duas formas de mensagem (bruta e
// métrica) e diferencia pelo shape. Os outros módulos de cálculo usam um
// nome de campo próprio.
const METRIC_FIELDS = ['LOAD', 'LUBRICATION', 'ELETRIC', 'COMBUSTION'];

export interface LatestReading {
  value: number;
  status: string;
}

export function useLiveSensorSeries(sensorIds: readonly string[]) {
  const [history, setHistory] = useState<LiveSample[]>([]);
  const [latest, setLatest] = useState<Record<string, LatestReading>>({});
  const [latestMetrics, setLatestMetrics] = useState<Record<string, MetricReading>>({});
  const latestValues = useRef<Record<string, number>>({});

  useEffect(() => {
    socketService.connect();

    sensorIds.forEach((id) => {
      onSensorUpdate(id, (reading: SensorReading | MetricReading) => {
        // ThermalEngineMath reaproveita o nome do sensor -- mensagem com
        // `metrics` em vez de `value` solto é o resultado calculado, não a
        // leitura bruta.
        if ('metrics' in reading && reading.metrics) {
          setLatestMetrics((prev) => ({ ...prev, [id]: reading }));
          return;
        }

        const value = Number((reading as SensorReading).value);
        if (Number.isNaN(value)) return;

        latestValues.current[id] = value;
        setLatest((prev) => ({ ...prev, [id]: { value, status: (reading as SensorReading).status } }));
      });
    });

    METRIC_FIELDS.forEach((field) => {
      onMetricUpdate(field, (reading) => {
        setLatestMetrics((prev) => ({ ...prev, [field]: reading }));
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

  return { history, latest, latestMetrics };
}
