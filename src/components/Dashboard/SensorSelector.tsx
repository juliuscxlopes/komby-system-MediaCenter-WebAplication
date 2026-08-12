// src/components/Dashboard/SensorSelector.tsx
//
// Barra de seleção multi-sensor -- marca/desmarca quais sensores aparecem
// no gráfico. Também funciona como legenda (cada item já mostra a cor da
// própria série), satisfazendo a regra de "identidade nunca só por cor":
// o nome do sensor sempre acompanha o swatch.
import type { SensorDefinition } from '../../types/TypesApp/TelemetryTypes';

interface SensorSelectorProps {
  sensors: SensorDefinition[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
}

export function SensorSelector({ sensors, activeIds, onToggle }: SensorSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 rounded-2xl">
      {sensors.map((sensor) => {
        const active = activeIds.has(sensor.id);
        return (
          <button
            key={sensor.id}
            onClick={() => onToggle(sensor.id)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: active ? sensor.color : '#cbd5e1',
                ...(sensor.dashed ? { border: `1.5px dashed ${active ? sensor.color : '#cbd5e1'}`, backgroundColor: 'transparent' } : {}),
              }}
            />
            {sensor.label}
          </button>
        );
      })}
    </div>
  );
}
