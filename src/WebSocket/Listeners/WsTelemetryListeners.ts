// src/WebSocket/Listeners/WsListenersTelemetry.ts
import { registerTelemetryListener } from '../Rooms/WsRoomTelemetry';

export type SensorReading = {
  value: number;
  status: string;
  isHardwareOk: boolean;
  ts: number;
};

type SensorCallback = (data: SensorReading) => void;

function on(sensor: string, callback: SensorCallback) {
  registerTelemetryListener(sensor, callback as (data: Record<string, unknown>) => void);
}

export const WsListenersTelemetry = {
  onRpmUpdate(callback: SensorCallback) {
    on('RPM', callback);
  },

  onChtUpdate(callback: SensorCallback) {
    on('CHT', callback);
  },

  onVacuumUpdate(callback: SensorCallback) {
    on('VACUUM', callback);
  },

  onOilPressureUpdate(callback: SensorCallback) {
    on('OIL_P', callback);
  },

  onOilTemperatureUpdate(callback: SensorCallback) {
    on('OIL_T', callback);
  },
};