// src/WebSocket/Listeners/WsTelemetryListeners.ts
//
// [AJUSTE] Tinha atalhos hardcoded (onRpmUpdate, onChtUpdate,
// onVacuumUpdate...) com nomes que não batiam mais com o Core: 'CHT' não
// existe (é CHT1/CHT2), 'VACUUM' foi renomeado pra MAP faz tempo, e não
// tinha nada de Lambda. Trocado por uma função genérica orientada a dado
// (mesmo espírito do registro em config/sensors.ts) -- o nome do sensor é
// sempre o que o Core publica de verdade, sem tradução no meio do caminho.
import { registerTelemetryListener } from '../Rooms/WsRoomTelemetry';

// Mesmo shape que os *_Sensor.js do Core publicam (criarPayload).
export type SensorReading = {
  sensor: string;
  value: number;
  status: string;
  ageMs?: number;
};

type SensorCallback = (data: SensorReading) => void;

export function onSensorUpdate(sensorId: string, callback: SensorCallback) {
  registerTelemetryListener(sensorId, callback as (data: Record<string, unknown>) => void);
}
