// src/components/Dashboard/TelemetryChart.tsx
//
// Dois modos de eixo X:
// - 'time' -> LineChart, X = tempo. Pergunta: "esse valor está estável?"
// - 'rpm'  -> ScatterChart, X = RPM. Pergunta: "como esse valor se comporta
//             em cada rotação?" (mesma lógica dos mapas RPM x valor do
//             Core). Não conecta os pontos com linha -- RPM sobe e desce ao
//             longo do tempo, uma linha ligando os pontos na ordem de
//             chegada ficaria uma zigue-zague sem sentido. O ponto mais
//             novo de cada sensor fica maior e sólido -- é o "dado fresco"
//             se destacando da nuvem de pontos mais antigos.
//
// Eixo Y sempre um só (regra: nunca dois eixos-Y). Se todos os sensores
// marcados têm a MESMA unidade (ex: OIL_T + CHT1 + CHT2, todos °C), o eixo
// mostra o valor real direto -- não tem por que normalizar quando a escala
// já é compartilhada de verdade. Só normaliza pra 0-100% quando as unidades
// não combinam (ex: RPM + Lambda juntos).
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { LiveSample, SensorDefinition, XAxisMode } from '../../types/TypesApp/TelemetryTypes';

interface TelemetryChartProps {
  sensors: SensorDefinition[]; // já filtrados pros ativos, na ordem de SENSORS
  history: LiveSample[];
  xAxisMode: XAxisMode;
}

const AXIS_STYLE = { fontSize: 12, fill: '#94a3b8' }; // slate-400
const RPM_SENSOR_ID = 'RPM'; // nome real do canal, ver SENSOR_MODELS em EngineController.js (Core)

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function normalize(value: number | undefined, min: number, max: number): number | null {
  if (value == null) return null;
  if (max === min) return 50; // sinal constante -- fica no meio, não é 0 nem 100 por acaso
  return ((value - min) / (max - min)) * 100;
}

function computeRanges(sensors: SensorDefinition[], history: LiveSample[]) {
  const ranges: Record<string, { min: number; max: number }> = {};
  sensors.forEach((sensor) => {
    const values = history.map((h) => h[sensor.id]).filter((v): v is number => v != null);
    ranges[sensor.id] = values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : { min: 0, max: 0 };
  });
  return ranges;
}

// Se todo mundo selecionado tem a mesma unidade, devolve ela -- é o sinal
// de que o eixo pode mostrar valor real em vez de %.
function getSharedUnit(sensors: SensorDefinition[]): string | null {
  if (sensors.length === 0) return null;
  const first = sensors[0].unit;
  return sensors.every((s) => s.unit === first) ? first : null;
}

export function TelemetryChart({ sensors, history, xAxisMode }: TelemetryChartProps) {
  if (sensors.length === 0) {
    return <div className="h-80 flex items-center justify-center text-slate-400 text-sm">Selecione ao menos um sensor.</div>;
  }

  if (history.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center gap-3 text-slate-400 text-sm">
        <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
        Aguardando dados em tempo real...
      </div>
    );
  }

  if (xAxisMode === 'rpm') {
    return <RpmChart sensors={sensors} history={history} />;
  }

  return <TimeChart sensors={sensors} history={history} />;
}

// ------------------------------------------------------
// Modo Tempo -- linha contínua, eixo X = timestamp
// ------------------------------------------------------
function TimeChart({ sensors, history }: { sensors: SensorDefinition[]; history: LiveSample[] }) {
  const sharedUnit = getSharedUnit(sensors);

  const chartData = useMemo(() => {
    const ranges = computeRanges(sensors, history);
    return history.map((sample) => {
      const point: Record<string, number | null> = { timestamp: sample.timestamp };
      sensors.forEach((sensor) => {
        const raw = sample[sensor.id];
        point[sensor.id] = raw ?? null;
        point[`${sensor.id}__norm`] = normalize(raw, ranges[sensor.id].min, ranges[sensor.id].max);
      });
      return point;
    });
  }, [sensors, history]);

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
          domain={sharedUnit ? ['dataMin', 'dataMax'] : [0, 100]}
          tickFormatter={sharedUnit ? (v) => `${v}${sharedUnit}` : (v) => `${v}%`}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          width={sharedUnit ? 56 : 40}
        />
        <Tooltip content={(props) => <TelemetryTooltip {...props} sensors={sensors} xLabel={formatTime(Number(props.label))} />} />
        {sensors.map((sensor) => (
          <Line
            key={sensor.id}
            type="monotone"
            dataKey={sharedUnit ? sensor.id : `${sensor.id}__norm`}
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

// ------------------------------------------------------
// Modo RPM -- nuvem de pontos, eixo X = RPM. Ponto mais novo de cada
// sensor em destaque (maior, sólido); o resto da nuvem mais apagado.
// ------------------------------------------------------
function RpmChart({ sensors, history }: { sensors: SensorDefinition[]; history: LiveSample[] }) {
  const sharedUnit = getSharedUnit(sensors);
  const yKey = sharedUnit ? 'value' : 'norm';
  const latestTimestamp = history[history.length - 1]?.timestamp;

  const seriesData = useMemo(() => {
    const ranges = computeRanges(sensors, history);
    const result: Record<string, Array<{ rpm: number; value: number; norm: number; timestamp: number }>> = {};

    sensors.forEach((sensor) => {
      // [AJUSTE] Era `h.rpm` (minúsculo) -- a chave real na amostra é 'RPM'
      // (mesmo nome que o Core publica), então o filtro nunca achava nada e
      // a nuvem de pontos ficava sempre vazia, parecendo que o modo RPM não
      // funcionava.
      result[sensor.id] = history
        .filter((h) => h[RPM_SENSOR_ID] != null && h[sensor.id] != null)
        .map((h) => ({
          rpm: h[RPM_SENSOR_ID] as number,
          value: h[sensor.id] as number,
          norm: normalize(h[sensor.id], ranges[sensor.id].min, ranges[sensor.id].max) ?? 0,
          timestamp: h.timestamp,
        }));
    });

    return result;
  }, [sensors, history]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#f1f5f9" />
        <XAxis
          dataKey="rpm"
          type="number"
          name="RPM"
          unit=" rpm"
          domain={['dataMin', 'dataMax']}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          dataKey={yKey}
          type="number"
          domain={sharedUnit ? ['dataMin', 'dataMax'] : [0, 100]}
          tickFormatter={sharedUnit ? (v) => `${v}${sharedUnit}` : (v) => `${v}%`}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          width={sharedUnit ? 56 : 40}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={(props) => <TelemetryTooltip {...props} sensors={sensors} xLabel={props.payload?.[0] ? `${props.payload[0].payload.rpm} rpm` : ''} rpmMode />}
        />
        {sensors.map((sensor) => (
          <Scatter
            key={sensor.id}
            data={seriesData[sensor.id]}
            dataKey={yKey}
            name={sensor.label}
            fill={sensor.color}
            shape={(props: any) => {
              const isLatest = props.payload?.timestamp === latestTimestamp;
              return isLatest ? (
                <circle cx={props.cx} cy={props.cy} r={6} fill={sensor.color} stroke="#fcfcfb" strokeWidth={2} />
              ) : (
                <circle cx={props.cx} cy={props.cy} r={3} fill={sensor.color} fillOpacity={0.3} />
              );
            }}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// Tooltip customizado: mostra o valor REAL (com unidade), não o %
// normalizado que o eixo desenha -- "os valores lideram, o rótulo da série
// vem depois".
function TelemetryTooltip({
  active,
  payload,
  sensors,
  xLabel,
  rpmMode,
}: TooltipContentProps & { sensors: SensorDefinition[]; xLabel: string; rpmMode?: boolean }) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as Record<string, number | null> | undefined;
  if (!point) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-4 text-sm min-w-[180px]">
      <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{xLabel}</div>
      <div className="space-y-1.5">
        {rpmMode
          ? payload.map((entry) => {
              const sensor = sensors.find((s) => s.label === entry.name);
              if (!sensor) return null;
              const raw = (entry.payload as { value: number }).value;
              return (
                <TooltipRow key={sensor.id} sensor={sensor} value={`${raw} ${sensor.unit}`} />
              );
            })
          : sensors.map((sensor) => {
              const value = point[sensor.id];
              return (
                <TooltipRow key={sensor.id} sensor={sensor} value={value != null ? `${value} ${sensor.unit}` : '—'} />
              );
            })}
      </div>
    </div>
  );
}

function TooltipRow({ sensor, value }: { sensor: SensorDefinition; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-slate-500">
        <span
          className="w-4 h-0.5 rounded-full shrink-0"
          style={{ backgroundColor: sensor.color, opacity: sensor.dashed ? 0.6 : 1 }}
        />
        {sensor.label}
      </div>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}
