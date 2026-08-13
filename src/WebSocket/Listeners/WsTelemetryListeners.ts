// src/WebSocket/Listeners/WsTelemetryListeners.ts
//
// [AJUSTE] Tinha atalhos hardcoded (onRpmUpdate, onChtUpdate,
// onVacuumUpdate...) com nomes que não batiam mais com o Core: 'CHT' não
// existe (é CHT1/CHT2), 'VACUUM' foi renomeado pra MAP faz tempo, e não
// tinha nada de Lambda. Trocado por uma função genérica orientada a dado
// (mesmo espírito do registro em config/sensors.ts) -- o nome do sensor é
// sempre o que o Core publica de verdade, sem tradução no meio do caminho.
import { registerTelemetryListener } from '../Rooms/WsRoomTelemetry';

// Mesmo shape que os *_Sensor.js do Core publicam (criarPayload) -- leitura bruta.
export type SensorReading = {
  sensor: string;
  value: number;
  status: string;
  ageMs?: number;
};

// Os módulos de cálculo (ThermalEngineMath, CombustionEngineMath, LoadEngineMath,
// LubricationEngineMath, ElectricalEngineMath) publicam no mesmo barramento --
// ThermalEngineMath inclusive no MESMO nome de canal do sensor bruto (CHT1/
// CHT2/OIL_T), só que com esse shape (tem `metrics`, não tem `value` solto)
// em vez do shape de leitura bruta.
export type MetricReading = {
  sensor?: string;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
};

type SensorCallback = (data: SensorReading) => void;
type MetricCallback = (data: MetricReading) => void;

export function onSensorUpdate(sensorId: string, callback: SensorCallback) {
  registerTelemetryListener(sensorId, callback as (data: Record<string, unknown>) => void);
}

export function onMetricUpdate(field: string, callback: MetricCallback) {
  registerTelemetryListener(field, callback as (data: Record<string, unknown>) => void);
}
