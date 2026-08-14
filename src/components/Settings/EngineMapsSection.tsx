// src/components/Settings/EngineMapsSection.tsx
//
// Editor de grid pros 4 mapas 2D (RPM x MAP -> carga, RPM x Temp -> pressão
// de óleo, RPM x MAP -> lambda alvo, CHT x OIL_T -> estresse térmico). Eixos
// não são editáveis aqui (mudar eixo muda o que o mapa significa) -- só os
// valores da tabela. Salva a tabela inteira de uma vez (é uma unidade só,
// não faz sentido salvar célula por célula).
import { useEffect, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { EngineMap } from '../../services/settingsService';
import { settingsService } from '../../services/settingsService';

const MAP_LABELS: Record<string, { label: string; axisXLabel: string; axisYLabel: string }> = {
  LOAD_MAP: { label: 'Carga do Motor', axisXLabel: 'RPM', axisYLabel: 'MAP (kPa)' },
  OIL_PRESSURE_MAP: { label: 'Pressão de Óleo Ideal', axisXLabel: 'RPM', axisYLabel: 'Temp. Óleo (°C)' },
  COMBUSTION_LAMBDA_MAP: { label: 'Lambda Alvo', axisXLabel: 'RPM', axisYLabel: 'MAP (kPa)' },
  THERMAL_STRESS_MAP: { label: 'Estresse Térmico', axisXLabel: 'CHT (°C)', axisYLabel: 'Óleo (°C)' },
};

interface Props {
  engineMaps: Record<string, EngineMap>;
  onRefresh: () => Promise<void>;
}

export function EngineMapsSection({ engineMaps, onRefresh }: Props) {
  const mapTypes = Object.keys(engineMaps);
  const [selected, setSelected] = useState(mapTypes[0] ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number[][]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const map = engineMaps[selected];

  useEffect(() => {
    setDraft(map ? map.table.map((row) => [...row]) : []);
    setEditing(false);
    setError(null);
  }, [selected, map]);

  if (mapTypes.length === 0) {
    return <p className="text-sm text-slate-400">Nenhum mapa cadastrado ainda.</p>;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await settingsService.updateEngineMap(selected, draft);
      await onRefresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const meta = MAP_LABELS[selected] || { label: selected, axisXLabel: 'X', axisYLabel: 'Y' };

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {mapTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selected === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {(MAP_LABELS[type] || { label: type }).label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">
          Linhas: {meta.axisXLabel} · Colunas: {meta.axisYLabel}
        </p>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Pencil size={14} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDraft(map.table.map((row) => [...row]));
                setEditing(false);
                setError(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Check size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {map && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 bg-slate-50 text-slate-400 font-semibold sticky left-0">{meta.axisXLabel} \ {meta.axisYLabel}</th>
                {map.axisY.map((y) => (
                  <th key={y} className="p-2 bg-slate-50 text-slate-500 font-semibold whitespace-nowrap">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {map.axisX.map((x, i) => (
                <tr key={x} className="border-t border-slate-100">
                  <td className="p-2 bg-slate-50 text-slate-500 font-semibold whitespace-nowrap sticky left-0">{x}</td>
                  {map.axisY.map((_, j) => (
                    <td key={j} className="p-1 text-center">
                      {editing ? (
                        <input
                          type="number"
                          step="any"
                          value={draft[i]?.[j] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : Number(e.target.value);
                            setDraft((d) => {
                              const next = d.map((row) => [...row]);
                              next[i][j] = value as number;
                              return next;
                            });
                          }}
                          className="w-16 px-1 py-1 rounded-lg border border-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      ) : (
                        <span className="text-slate-700">{map.table[i]?.[j] ?? '—'}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
