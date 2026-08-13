// src/components/Dashboard/MetricsTree.tsx
//
// Renderizador genérico pro resultado dos módulos de cálculo do Core
// (ThermalEngineMath, CombustionEngineMath, etc) -- os formatos variam
// bastante entre sensores, então em vez de montar uma tela sob medida pra
// cada um, isso aqui percorre o objeto e desenha rótulo: valor, indentando
// sub-blocos. Sensores com layout que merecer algo mais bonito depois dá
// pra destacar à parte.
const LABELS: Record<string, string> = {
  valorAtual: 'Valor atual',
  tendencia: 'Tendência',
  txtDelta: 'Variação',
  delta: 'Delta',
  min: 'Mínimo',
  max: 'Máximo',
  media: 'Média',
  desvio: 'Desvio',
  confiavel: 'Confiável',
  distanciaAlerta: 'Distância p/ alerta',
  distanciaCritico: 'Distância p/ crítico',
  dentroFaixaNominal: 'Dentro da faixa nominal',
  jaEmAlerta: 'Em alerta',
  jaEmCritico: 'Em crítico',
  alerta: 'Alerta',
  critico: 'Crítico',
  segundos: 'Segundos',
  txt: 'ETA',
  stressIndex: 'Índice de estresse',
  chtScore: 'Score CHT',
  oilScore: 'Score óleo',
  gradientScore: 'Score gradiente',
  heatSoakScore: 'Score heat soak',
  isHeatSoak: 'Heat soak?',
  chtReference: 'CHT ref.',
  oilReference: 'Óleo ref.',
  diff: 'Diferença',
  diffAbs: 'Diferença abs.',
  maisQuente: 'Mais quente',
  maisPobre: 'Mais pobre',
  cht1: 'CHT 1',
  cht2: 'CHT 2',
  cht1Tendencia: 'Tendência CHT1',
  cht2Tendencia: 'Tendência CHT2',
  dentroDaTolerancia: 'Dentro da tolerância',
  curvasDivergem: 'Curvas divergindo?',
  engineLoad: 'Carga do motor',
  zone: 'Zona',
  lubrication: 'Lubrificação',
  viscosity: 'Viscosidade',
  expectedPressure: 'Pressão esperada',
  status: 'Status',
  batteryHealth: 'Saúde da bateria',
  chargingState: 'Estado de carga',
  electricalStability: 'Estabilidade elétrica',
  targetLambda: 'Lambda alvo',
  currentLambda: 'Lambda atual',
  combustionQuality: 'Qualidade da combustão',
  fuelEconomy: 'Economia de combustível',
  idleQuality: 'Qualidade de marcha lenta',
  mixtureType: 'Tipo de mistura',
  channelDiff: 'Diferença entre canais',
  pontual: 'Pontual',
  curta: 'Janela curta',
  longa: 'Janela longa',
  eta: 'ETA',
  posicaoFisica: 'Posição na faixa',
  crossState: 'Cruzamento térmico',
  lambda1: 'Lambda 1',
  lambda2: 'Lambda 2',
};

function humanizeKey(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

export function MetricsTree({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => {
        if (key === 'sensor') return null; // já mostrado no cabeçalho do modal

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return (
            <div key={key}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{humanizeKey(key)}</div>
              <div className="pl-3 border-l-2 border-slate-100">
                <MetricsTree data={value as Record<string, unknown>} />
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="flex items-center justify-between text-sm gap-4">
            <span className="text-slate-500">{humanizeKey(key)}</span>
            <span className="font-semibold text-slate-900 text-right">
              {Array.isArray(value) ? (value.length ? value.join(', ') : '—') : formatValue(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
