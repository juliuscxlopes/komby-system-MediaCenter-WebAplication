// src/pages/app/Dashboards.tsx
import { useMemo, useState } from 'react';
import { SENSORS } from '../../config/sensors';
import type { XAxisMode } from '../../types/TypesApp/TelemetryTypes';
import { useLiveSensorSeries } from '../../hooks/useLiveSensorSeries';
import { SensorSelector } from '../../components/Dashboard/SensorSelector';
import { XAxisSelector } from '../../components/Dashboard/XAxisSelector';
import { TelemetryChart } from '../../components/Dashboard/TelemetryChart';

const SENSOR_IDS = SENSORS.map((s) => s.id);
const DEFAULT_ACTIVE = new Set(['RPM']);

export function Dashboards() {
  const [activeIds, setActiveIds] = useState<Set<string>>(DEFAULT_ACTIVE);
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('time');
  const history = useLiveSensorSeries(SENSOR_IDS);

  // No modo RPM, RPM vira o eixo X -- não faz sentido plotar RPM contra ele
  // mesmo, então some da lista de sensores selecionáveis (e do que está ativo).
  const selectableSensors = useMemo(
    () => (xAxisMode === 'rpm' ? SENSORS.filter((s) => s.id !== 'RPM') : SENSORS),
    [xAxisMode],
  );

  const activeSensors = useMemo(
    () => selectableSensors.filter((sensor) => activeIds.has(sensor.id)),
    [selectableSensors, activeIds],
  );

  function toggleSensor(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleXAxisChange(mode: XAxisMode) {
    setXAxisMode(mode);
    if (mode === 'rpm') {
      setActiveIds((prev) => {
        if (!prev.has('RPM')) return prev;
        const next = new Set(prev);
        next.delete('RPM');
        // Se RPM era o único sensor marcado, o eixo RPM ficaria sem nenhuma
        // série pra mostrar -- cai pro primeiro sensor selecionável em vez
        // de deixar o gráfico vazio (parecia que o botão não tinha feito nada).
        if (next.size === 0) {
          const fallback = SENSORS.find((s) => s.id !== 'RPM');
          if (fallback) next.add(fallback.id);
        }
        return next;
      });
    }
  }

  return (
    <>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboards</h2>
        <p className="text-slate-500">Telemetria em tempo real -- marque os sensores que quer comparar.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <SensorSelector sensors={selectableSensors} activeIds={activeIds} onToggle={toggleSensor} />
        <XAxisSelector mode={xAxisMode} onChange={handleXAxisChange} />
      </div>

      <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
        <div className="mb-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {xAxisMode === 'rpm' ? 'Sensores × RPM' : 'Sensores × Tempo'}
          </div>
          <div className="text-lg font-bold text-slate-900">
            {xAxisMode === 'rpm'
              ? 'Comportamento de cada sensor pela rotação do motor'
              : 'Variação relativa (cada sensor no próprio range)'}
          </div>
        </div>

        <TelemetryChart sensors={activeSensors} history={history} xAxisMode={xAxisMode} />
      </div>
    </>
  );
}
