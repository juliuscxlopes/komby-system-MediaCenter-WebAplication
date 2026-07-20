import { WsRouter } from '../WsRouter';

type TelemetryListenerFn = (data: Record<string, unknown>) => void;

const sensorListeners: Record<string, TelemetryListenerFn[]> = {};

WsRouter.onRoom('telemetry', (message) => {
  const sensor = message.sensor as string | undefined;
  if (!sensor) return;
  const callbacks = sensorListeners[sensor] || [];
  callbacks.forEach((cb) => cb(message.data as Record<string, unknown>));
});

export function registerTelemetryListener(sensor: string, callback: TelemetryListenerFn) {
  if (!sensorListeners[sensor]) sensorListeners[sensor] = [];
  sensorListeners[sensor].push(callback);
}