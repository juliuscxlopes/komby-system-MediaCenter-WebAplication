// src/pages/app/Dashboards.tsx
import { useMemo, useState } from 'react';
import { SENSORS } from '../../config/sensors';
import { useLiveSensorSeries } from '../../hooks/useLiveSensorSeries';
import { SensorSelector } from '../../components/Dashboard/SensorSelector';
import { TelemetryChart } from '../../components/Dashboard/TelemetryChart';

const SENSOR_IDS = SENSORS.map((s) => s.id);
const DEFAULT_ACTIVE = new Set(['RPM']);

export function Dashboards() {
  const [activeIds, setActiveIds] = useState<Set<string>>(DEFAULT_ACTIVE);
  const history = useLiveSensorSeries(SENSOR_IDS);

  const activeSensors = useMemo(
    () => SENSORS.filter((sensor) => activeIds.has(sensor.id)),
    [activeIds],
  );

  function toggleSensor(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboards</h2>
        <p className="text-slate-500">Telemetria em tempo real -- marque os sensores que quer comparar.</p>
      </header>

      <div className="mb-6">
        <SensorSelector sensors={SENSORS} activeIds={activeIds} onToggle={toggleSensor} />
      </div>

      <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
        <div className="mb-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sensores × Tempo</div>
          <div className="text-lg font-bold text-slate-900">Variação relativa (cada sensor no próprio range)</div>
        </div>

        <TelemetryChart sensors={activeSensors} history={history} />
      </div>
    </>
  );
}
