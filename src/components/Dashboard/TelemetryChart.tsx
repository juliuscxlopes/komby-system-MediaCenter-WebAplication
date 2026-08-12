// src/components/Dashboard/TelemetryChart.tsx
//
// Um eixo Y só (regra: nunca dois eixos-Y numa mesma área de plot -- RPM e
// Lambda têm escalas incompatíveis demais pra dividir eixo). Cada sensor
// ativo é normalizado pro próprio range observado na janela atual (0-100%),
// o valor real com a unidade certa fica no tooltip -- o eixo mostra
// variação relativa, não o número cru.
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { LiveSample, SensorDefinition } from '../../types/TypesApp/TelemetryTypes';

interface TelemetryChartProps {
  sensors: SensorDefinition[]; // já filtrados pros ativos, na ordem de SENSORS
  history: LiveSample[];
}

const AXIS_STYLE = { fontSize: 12, fill: '#94a3b8' }; // slate-400

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function normalize(value: number | undefined, min: number, max: number): number | null {
  if (value == null) return null;
  if (max === min) return 50; // sinal constante -- fica no meio, não é 0 nem 100 por acaso
  return ((value - min) / (max - min)) * 100;
}

export function TelemetryChart({ sensors, history }: TelemetryChartProps) {
  const chartData = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};

    sensors.forEach((sensor) => {
      const values = history
        .map((h) => h[sensor.id])
        .filter((v): v is number => v != null);
      ranges[sensor.id] = values.length
        ? { min: Math.min(...values), max: Math.max(...values) }
        : { min: 0, max: 0 };
    });

    return history.map((sample) => {
      const point: Record<string, number | null> = { timestamp: sample.timestamp };
      sensors.forEach((sensor) => {
        const raw = sample[sensor.id];
        point[sensor.id] = raw ?? null; // valor real, usado só pelo tooltip
        point[`${sensor.id}__norm`] = normalize(raw, ranges[sensor.id].min, ranges[sensor.id].max);
      });
      return point;
    });
  }, [sensors, history]);

  if (sensors.length === 0) {
    return <div className="h-80 flex items-center justify-center text-slate-400 text-sm">Selecione ao menos um sensor.</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center gap-3 text-slate-400 text-sm">
        <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
        Aguardando dados em tempo real...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatTime}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          minTickGap={50}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          width={40}
        />
        <Tooltip content={(props) => <TelemetryTooltip {...props} sensors={sensors} />} />
        {sensors.map((sensor) => (
          <Line
            key={sensor.id}
            type="monotone"
            dataKey={`${sensor.id}__norm`}
            name={sensor.label}
            stroke={sensor.color}
            strokeWidth={2}
            strokeDasharray={sensor.dashed ? '5 5' : undefined}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fcfcfb' }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Tooltip customizado: mostra o valor REAL (com unidade), não o % normalizado
// que o eixo desenha -- "os valores lideram, o rótulo da série vem depois".
function TelemetryTooltip({
  active,
  payload,
  label,
  sensors,
}: TooltipContentProps & { sensors: SensorDefinition[] }) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as Record<string, number | null> | undefined;
  if (!point) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-4 text-sm min-w-[180px]">
      <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
        {formatTime(Number(label))}
      </div>
      <div className="space-y-1.5">
        {sensors.map((sensor) => {
          const value = point[sensor.id];
          return (
            <div key={sensor.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-500">
                <span
                  className="w-4 h-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: sensor.color, opacity: sensor.dashed ? 0.6 : 1 }}
                />
                {sensor.label}
              </div>
              <span className="font-bold text-slate-900">
                {value != null ? `${value} ${sensor.unit}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
