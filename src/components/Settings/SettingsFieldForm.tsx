// src/components/Settings/SettingsFieldForm.tsx
//
// Form genérico reutilizado por todas as seções simples (Veículo, Motor,
// Uso, Trip Specs, Limites por Sensor) -- modo visualização por padrão,
// "Editar" troca pra inputs, "Salvar" chama onSave só com os campos desse
// schema (não manda o objeto inteiro, evita sobrescrever campo que a seção
// nem mostra).
import { useEffect, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';

export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'number';
  unit?: string;
  step?: number;
}

interface Props {
  fields: FieldSpec[];
  values: object;
  onSave: (changed: Record<string, unknown>) => Promise<void>;
}

export function SettingsFieldForm({ fields, values, onSave }: Props) {
  const v = values as Record<string, unknown>;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(values as Record<string, unknown>);
    setEditing(false);
  }, [values]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const changed: Record<string, unknown> = {};
      for (const field of fields) {
        changed[field.key] = draft[field.key];
      }
      await onSave(changed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4 gap-2">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Pencil size={14} /> Editar
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setDraft(v);
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
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {field.label}
            </label>
            {editing ? (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                step={field.step ?? 'any'}
                value={(draft[field.key] as string | number | undefined) ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [field.key]: field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value,
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            ) : (
              <p className="text-sm font-medium text-slate-800">
                {v[field.key] != null && v[field.key] !== '' ? String(v[field.key]) : '—'}
                {field.unit && v[field.key] != null ? ` ${field.unit}` : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
