// src/pages/app/Dashboards.tsx
import { useMemo, useState } from 'react';
import { SENSORS, SENSORS_BY_SIDE, expandWithPair } from '../../config/sensors';
import type { XAxisMode } from '../../types/TypesApp/TelemetryTypes';
import { useLiveSensorSeries } from '../../hooks/useLiveSensorSeries';
import { useTapOrHoldSelection } from '../../hooks/useTapOrHoldSelection';
import { XAxisSelector } from '../../components/Dashboard/XAxisSelector';
import { TelemetryChart } from '../../components/Dashboard/TelemetryChart';
import { SensorCard } from '../../components/Dashboard/SensorCard';
import { SensorDetailModal } from '../../components/Dashboard/SensorDetailModal';

const SENSOR_IDS = SENSORS.map((s) => s.id);
// Abre já com um grupo que compartilha unidade (°C) -- eixo Y em valor real
// desde o primeiro carregamento, sem precisar marcar nada.
const DEFAULT_ACTIVE = new Set(['OIL_T', 'CHT1', 'CHT2']);

export function Dashboards() {
  const [activeIds, setActiveIds] = useState<Set<string>>(DEFAULT_ACTIVE);
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('time');
  const [detailSensorId, setDetailSensorId] = useState<string | null>(null);
  const { history, latest, latestMetrics } = useLiveSensorSeries(SENSOR_IDS);

  function handleReplace(ids: string[]) {
    setActiveIds(new Set(ids));
  }

  function handleToggle(ids: string[]) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      const allActive = ids.every((id) => next.has(id));
      ids.forEach((id) => (allActive ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  const { getHandlers } = useTapOrHoldSelection(handleReplace, handleToggle);

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

  const detailSensor = detailSensorId ? SENSORS.find((s) => s.id === detailSensorId) : null;

  function handleXAxisChange(mode: XAxisMode) {
    setXAxisMode(mode);
    if (mode === 'rpm') {
      setActiveIds((prev) => {
        if (!prev.has('RPM')) return prev;
        const next = new Set(prev);
        next.delete('RPM');
        // Se RPM era o único sensor marcado, o eixo RPM ficaria sem nenhuma
        // série pra mostrar -- cai pro primeiro sensor selecionável em vez
        // de deixar o gráfico vazio.
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
      <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm mb-6">
        <div className="flex justify-end mb-4">
          <XAxisSelector mode={xAxisMode} onChange={handleXAxisChange} />
        </div>

        <TelemetryChart sensors={activeSensors} history={history} xAxisMode={xAxisMode} />
      </div>

      <div className="p-6 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
        <div className="grid grid-cols-9 gap-2">
          {SENSORS_BY_SIDE.map((sensor) => (
            <SensorCard
              key={sensor.id}
              sensor={sensor}
              reading={latest[sensor.id]}
              active={activeIds.has(sensor.id)}
              handlers={getHandlers(expandWithPair(sensor.id))}
              onOpenDetail={() => setDetailSensorId(sensor.id)}
            />
          ))}
        </div>
      </div>

      {detailSensor && (
        <SensorDetailModal
          sensor={detailSensor}
          reading={latest[detailSensor.id]}
          history={history}
          metrics={latestMetrics}
          onClose={() => setDetailSensorId(null)}
        />
      )}
    </>
  );
}
