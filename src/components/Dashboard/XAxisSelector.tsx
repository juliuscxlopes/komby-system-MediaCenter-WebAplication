// src/components/Dashboard/XAxisSelector.tsx
//
// Escolhe o que vai no eixo X: Tempo (estabilidade) ou RPM (leitura
// clássica -- como o sensor se comporta em cada rotação).
import type { XAxisMode } from '../../types/TypesApp/TelemetryTypes';

const OPTIONS: { mode: XAxisMode; label: string }[] = [
  { mode: 'time', label: 'Tempo' },
  { mode: 'rpm', label: 'RPM' },
];

interface XAxisSelectorProps {
  mode: XAxisMode;
  onChange: (mode: XAxisMode) => void;
}

export function XAxisSelector({ mode, onChange }: XAxisSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl">
      {OPTIONS.map((option) => {
        const active = option.mode === mode;
        return (
          <button
            key={option.mode}
            onClick={() => onChange(option.mode)}
            aria-pressed={active}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
