// src/components/Settings/OdometerWidget.tsx
//
// Odômetro principal -- fiel, nunca reduz. Separado do form genérico de
// propósito: os outros campos do veículo aceitam qualquer edição, esse aqui
// só aceita valor maior ou igual ao atual (o backend também valida, isso é
// só a UX de deixar claro que não é um campo comum).
import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { settingsService } from '../../services/settingsService';

interface Props {
  km: number | undefined;
  onSaved: () => Promise<void>;
}

export function OdometerWidget({ km, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = km ?? 0;

  async function handleSave() {
    const value = Number(draft);
    if (Number.isNaN(value)) {
      setError('Valor inválido.');
      return;
    }
    if (value < current) {
      setError(`Não pode ser menor que o valor atual (${current} km).`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await settingsService.updateOdometer(value);
      await onSaved();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Odômetro Principal
        </label>
        {!editing && (
          <button
            onClick={() => {
              setDraft(String(current));
              setEditing(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Pencil size={12} /> Corrigir
          </button>
        )}
      </div>

      {!editing ? (
        <p className="text-2xl font-bold text-slate-900">{current.toLocaleString('pt-BR')} km</p>
      ) : (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number"
            step="any"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-2">
        Só pode ser corrigido pra cima -- é o valor de partida real do veículo (ex: cadastrar com 90.000 km já
        rodados). Nunca reduz, nunca é sobrescrito pela edição normal do veículo.
      </p>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
