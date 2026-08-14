// src/components/Settings/SensorLimitsSection.tsx
//
// Lista os sensores que têm limite configurado, escolhe um por vez pra
// ver/editar -- mesmo formulário genérico dos outros. Campos mostrados
// variam por sensor (RPM tem CRACKING/PARTIDA/MARCHA_LENTA, LAMBDA tem
// RICA/POBRE, etc) -- não faz sentido só um schema fixo pra todos.
import { useState } from 'react';
import type { SensorLimit } from '../../services/settingsService';
import { settingsService } from '../../services/settingsService';
import { SettingsFieldForm, type FieldSpec } from './SettingsFieldForm';

const COMMON_FIELDS: FieldSpec[] = [
  { key: 'unit', label: 'Unidade' },
  { key: 'frio_max', label: 'Frio (máx)', type: 'number' },
  { key: 'nominal_min', label: 'Nominal (mín)', type: 'number' },
  { key: 'nominal_max', label: 'Nominal (máx)', type: 'number' },
  { key: 'alerta_threshold', label: 'Alerta', type: 'number' },
  { key: 'critico_threshold', label: 'Crítico', type: 'number' },
];

// Campos extras específicos de cada sensor, além dos comuns acima.
const EXTRA_FIELDS: Record<string, FieldSpec[]> = {
  MAP: [{ key: 'carga_alta', label: 'Carga Alta', type: 'number' }],
  LAMBDA: [
    { key: 'rica_threshold', label: 'Rica', type: 'number' },
    { key: 'alerta_rico_threshold', label: 'Alerta Rico', type: 'number' },
    { key: 'critico_rico_threshold', label: 'Crítico Rico', type: 'number' },
    { key: 'alerta_pobre_threshold', label: 'Alerta Pobre', type: 'number' },
    { key: 'critico_pobre_threshold', label: 'Crítico Pobre', type: 'number' },
  ],
  BATTERY: [
    { key: 'critico_baixo', label: 'Crítico Baixo', type: 'number' },
    { key: 'alerta_baixo', label: 'Alerta Baixo', type: 'number' },
    { key: 'alerta_alto', label: 'Alerta Alto', type: 'number' },
    { key: 'critico_alto', label: 'Crítico Alto', type: 'number' },
  ],
  RPM: [
    { key: 'cracking_min', label: 'Cracking (mín)', type: 'number' },
    { key: 'cracking_max', label: 'Cracking (máx)', type: 'number' },
    { key: 'partida_min', label: 'Partida (mín)', type: 'number' },
    { key: 'partida_max', label: 'Partida (máx)', type: 'number' },
    { key: 'marcha_lenta_min', label: 'Marcha Lenta (mín)', type: 'number' },
    { key: 'marcha_lenta_max', label: 'Marcha Lenta (máx)', type: 'number' },
  ],
};

interface Props {
  sensorLimits: Record<string, SensorLimit>;
  onRefresh: () => Promise<void>;
}

export function SensorLimitsSection({ sensorLimits, onRefresh }: Props) {
  const sensorNames = Object.keys(sensorLimits).sort();
  const [selected, setSelected] = useState(sensorNames[0] ?? '');

  if (sensorNames.length === 0) {
    return <p className="text-sm text-slate-400">Nenhum limite operacional cadastrado ainda.</p>;
  }

  const fields = [...COMMON_FIELDS, ...(EXTRA_FIELDS[selected] || [])];

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {sensorNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selected === name ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <SettingsFieldForm
        key={selected}
        fields={fields}
        values={sensorLimits[selected] || {}}
        onSave={async (changed) => {
          await settingsService.updateSensorLimit(selected, changed);
          await onRefresh();
        }}
      />
    </div>
  );
}
