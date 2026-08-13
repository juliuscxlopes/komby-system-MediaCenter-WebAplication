// src/components/Dashboard/SensorCard.tsx
//
// Cartão pequeno de sensor: valor + unidade + status. O status não é
// calculado aqui -- vem pronto do Core (cada *_Sensor.js já classifica
// contra Operation_Limits.json e publica junto com o valor).
import { AlertOctagon, AlertTriangle, CheckCircle2, Snowflake, WifiOff, type LucideIcon } from 'lucide-react';
import type { SensorDefinition } from '../../types/TypesApp/TelemetryTypes';
import type { LatestReading } from '../../hooks/useLiveSensorSeries';

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

// Cores de status reservadas -- nunca usadas pra identidade de série no
// gráfico, só pra severidade (mesmo princípio da paleta categórica dos
// sensores no gráfico, mas outra paleta).
const STATUS_CONFIG: Record<string, StatusConfig> = {
  OPERACIONAL: { label: 'Operacional', color: '#0ca30c', icon: CheckCircle2 },
  FRIO: { label: 'Frio', color: '#2a78d6', icon: Snowflake },
  ALERTA: { label: 'Alerta', color: '#fab219', icon: AlertTriangle },
  CRITICO: { label: 'Crítico', color: '#d03b3b', icon: AlertOctagon },
  IsHardwareIsOff: { label: 'Sem sinal', color: '#898781', icon: WifiOff },
};

const FALLBACK_STATUS: StatusConfig = { label: 'Aguardando...', color: '#c3c2b7', icon: WifiOff };

interface SensorCardProps {
  sensor: SensorDefinition;
  reading: LatestReading | undefined;
}

export function SensorCard({ sensor, reading }: SensorCardProps) {
  const status = reading ? STATUS_CONFIG[reading.status] ?? FALLBACK_STATUS : FALLBACK_STATUS;
  const StatusIcon = status.icon;

  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate">{sensor.label}</span>
        <StatusIcon size={14} style={{ color: status.color }} className="shrink-0" />
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">
          {reading ? reading.value : '—'}
        </span>
        <span className="text-xs font-semibold text-slate-400">{sensor.unit}</span>
      </div>

      <div className="text-[11px] font-bold mt-1.5" style={{ color: status.color }}>
        {status.label}
      </div>
    </div>
  );
}
