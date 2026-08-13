// src/config/sensors.ts
//
// Fonte única dos sensores disponíveis na Dashboard -- a barra de seleção e
// o gráfico são gerados a partir daqui. Pra adicionar um sensor novo (o
// Core já expõe TPS, FUEL_P, CLT, IAT etc no protocolo, só não tem modelo
// dedicado ainda) é só uma linha nova aqui, nada mais muda.
//
// `id` precisa bater exatamente com o nome que o Core publica -- hoje são
// os 9 sensores em SENSOR_MODELS (Telemetry/core/.../EngineController.js).
// Cores validadas com scripts/validate_palette.js da skill de dataviz
// (7 identidades categóricas -- CHT1/CHT2 e LAMBDA1/LAMBDA2 são pares do
// mesmo sensor físico, então dividem cor e se diferenciam por traço).
import type { SensorDefinition } from '../types/TypesApp/TelemetryTypes';

export const SENSORS: SensorDefinition[] = [
  { id: 'RPM', label: 'RPM', unit: 'rpm', color: '#2a78d6' },
  { id: 'LAMBDA1', label: 'Lambda 1', unit: 'λ', color: '#eb6834' },
  { id: 'LAMBDA2', label: 'Lambda 2', unit: 'λ', color: '#eb6834', dashed: true },
  { id: 'OIL_P', label: 'Pressão de Óleo', unit: 'kPa', color: '#1baf7a' },
  { id: 'OIL_T', label: 'Temp. do Óleo', unit: '°C', color: '#eda100' },
  { id: 'BATTERY', label: 'Bateria', unit: 'V', color: '#e87ba4' },
  { id: 'MAP', label: 'MAP', unit: 'kPa', color: '#008300' },
  { id: 'CHT1', label: 'CHT 1', unit: '°C', color: '#4a3aa7' },
  { id: 'CHT2', label: 'CHT 2', unit: '°C', color: '#4a3aa7', dashed: true },
];

// Motor boxer a ar -- CHT1/LAMBDA1 são um lado físico do motor, CHT2/LAMBDA2
// o outro. Clicar em qualquer canal de um sensor de dois lados sempre puxa
// o par junto (não faz sentido olhar só a metade do motor).
const SENSOR_PAIR: Record<string, string> = {
  LAMBDA1: 'LAMBDA2',
  LAMBDA2: 'LAMBDA1',
  CHT1: 'CHT2',
  CHT2: 'CHT1',
};

export function expandWithPair(id: string): string[] {
  const pair = SENSOR_PAIR[id];
  return pair ? [id, pair] : [id];
}

// Ordem de exibição -- lado esquerdo (CHT1/Lambda1) numa ponta, lado
// direito (CHT2/Lambda2) na outra, sensores sem lado no meio. Usada tanto
// no seletor quanto nos cards, pra manter a mesma leitura espacial nos dois.
const DISPLAY_ORDER = ['CHT1', 'LAMBDA1', 'RPM', 'MAP', 'OIL_P', 'OIL_T', 'BATTERY', 'LAMBDA2', 'CHT2'];

export const SENSORS_BY_SIDE: SensorDefinition[] = DISPLAY_ORDER
  .map((id) => SENSORS.find((s) => s.id === id))
  .filter((s): s is SensorDefinition => Boolean(s));
