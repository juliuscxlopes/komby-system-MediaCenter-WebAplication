// src/components/Dashboard/SensorSelector.tsx
//
// Toque rápido troca a seleção; segurar marca (adiciona); segurar um e
// tocar outro deixa os dois. Sensor de dois lados (CHT/Lambda) sempre puxa
// o par -- ver expandWithPair em config/sensors.ts. Também funciona como
// legenda: cada item já mostra a cor da própria série.
import { expandWithPair } from '../../config/sensors';
import type { SensorDefinition } from '../../types/TypesApp/TelemetryTypes';

interface PointerHandlers {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
}

interface SensorSelectorProps {
  sensors: SensorDefinition[];
  activeIds: Set<string>;
  getHandlers: (ids: string[]) => PointerHandlers;
}

export function SensorSelector({ sensors, activeIds, getHandlers }: SensorSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 rounded-2xl">
      {sensors.map((sensor) => {
        const active = activeIds.has(sensor.id);
        return (
          <button
            key={sensor.id}
            {...getHandlers(expandWithPair(sensor.id))}
            aria-pressed={active}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all select-none touch-none ${
              active ? 'bg-white text-slate-900 shadow-sm opacity-100' : 'text-slate-400 opacity-40 hover:opacity-70'
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
