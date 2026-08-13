// src/components/Dashboard/SensorCard.tsx
//
// Cartão compacto de sensor: valor + unidade + status (ícone, sem texto --
// espaço é curto pra caber os 9 numa linha só). O status não é calculado
// aqui -- vem pronto do Core (cada *_Sensor.js já classifica contra
// Operation_Limits.json e publica junto com o valor). Mesmo gesto de
// toque/segurar do seletor -- também controla o que aparece no gráfico.
import { AlertOctagon, AlertTriangle, CheckCircle2, Snowflake, WifiOff, type LucideIcon } from 'lucide-react';
import type { SensorDefinition } from '../../types/TypesApp/TelemetryTypes';
import type { LatestReading } from '../../hooks/useLiveSensorSeries';

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  OPERACIONAL: { label: 'Operacional', color: '#0ca30c', icon: CheckCircle2 },
  FRIO: { label: 'Frio', color: '#2a78d6', icon: Snowflake },
  ALERTA: { label: 'Alerta', color: '#fab219', icon: AlertTriangle },
  CRITICO: { label: 'Crítico', color: '#d03b3b', icon: AlertOctagon },
  IsHardwareIsOff: { label: 'Sem sinal', color: '#898781', icon: WifiOff },
};

const FALLBACK_STATUS: StatusConfig = { label: 'Aguardando', color: '#c3c2b7', icon: WifiOff };

interface PointerHandlers {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
}

interface SensorCardProps {
  sensor: SensorDefinition;
  reading: LatestReading | undefined;
  active: boolean;
  handlers: PointerHandlers;
}

export function SensorCard({ sensor, reading, active, handlers }: SensorCardProps) {
  const status = reading ? STATUS_CONFIG[reading.status] ?? FALLBACK_STATUS : FALLBACK_STATUS;
  const StatusIcon = status.icon;

  return (
    <button
      {...handlers}
      aria-pressed={active}
      title={`${sensor.label} -- ${status.label}`}
      className={`flex flex-col items-start p-3 rounded-2xl border transition-all select-none touch-none text-left min-w-0 ${
        active ? 'border-slate-200 bg-white shadow-sm opacity-100' : 'border-slate-100 bg-white opacity-40 hover:opacity-70'
      }`}
    >
      <div className="flex items-center justify-between w-full mb-2 gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{sensor.label}</span>
        <StatusIcon size={13} style={{ color: status.color }} className="shrink-0" />
      </div>

      <div className="flex items-baseline gap-1 min-w-0">
        <span className="text-lg font-bold text-slate-900 tabular-nums truncate">
          {reading ? reading.value : '—'}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 shrink-0">{sensor.unit}</span>
      </div>
    </button>
  );
}
