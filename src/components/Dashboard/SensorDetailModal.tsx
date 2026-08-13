// src/components/Dashboard/SensorDetailModal.tsx
//
// Aberto com duplo-clique/duplo-toque no card. Mostra o valor atual, um
// sparkline dos últimos 5 minutos (reaproveita o `history` que o gráfico
// principal já mantém em memória -- sem chamada nova) e a análise
// específica desse sensor (o que os módulos de cálculo do Core já publicam
// no mesmo barramento WS).
import { X } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { SENSOR_METRIC_KEYS } from '../../config/sensors';
import type { LiveSample, SensorDefinition } from '../../types/TypesApp/TelemetryTypes';
import type { LatestReading } from '../../hooks/useLiveSensorSeries';
import type { MetricReading } from '../../WebSocket/Listeners/WsTelemetryListeners';
import { MetricsTree } from './MetricsTree';

interface SensorDetailModalProps {
  sensor: SensorDefinition;
  reading: LatestReading | undefined;
  history: LiveSample[];
  metrics: Record<string, MetricReading>;
  onClose: () => void;
}

export function SensorDetailModal({ sensor, reading, history, metrics, onClose }: SensorDetailModalProps) {
  const metricKeys = SENSOR_METRIC_KEYS[sensor.id] ?? [];
  const sparkData = history.map((h) => ({ timestamp: h.timestamp, value: h[sensor.id] ?? null }));
  const hasSpark = sparkData.some((p) => p.value != null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sensor.label}</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{reading ? reading.value : '—'}</span>
              <span className="text-sm font-semibold text-slate-400">{sensor.unit}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {hasSpark && (
          <div className="p-6 border-b border-slate-100 shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Últimos 5 minutos</div>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={sparkData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={sensor.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {metricKeys.length > 0 && (
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise</div>
            {metricKeys.map((key) => {
              const metric = metrics[key];
              if (!metric) {
                return (
                  <div key={key} className="text-sm text-slate-300 italic">
                    Aguardando cálculo...
                  </div>
                );
              }
              // ThermalEngineMath vem embrulhado em `metrics`; os outros
              // módulos já publicam o objeto raiz direto.
              const data = (metric.metrics ?? metric) as Record<string, unknown>;
              return <MetricsTree key={key} data={data} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
