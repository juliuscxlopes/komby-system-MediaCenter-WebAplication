// src/components/Settings/FuelRefillModal.tsx
//
// Abastecimento misto (álcool + gasolina/pódium na mesma parada) -- cada
// "linha" vira um registro à parte no banco (mesmo km/data, tipo/preço
// diferentes), por isso o formulário deixa somar mais de uma linha antes
// de salvar. Litros calcula sozinho quando valor pago + preço/L estão
// preenchidos, mas continua editável (nem todo posto informa o preço certo
// na hora). Nota fiscal é opcional, anexada ao primeiro registro da sessão.
import { useState } from 'react';
import { X, Plus, Trash2, Fuel, Camera } from 'lucide-react';
import { maintenanceService, type FuelType } from '../../services/maintenanceService';

interface Line {
  fuelType: FuelType;
  cost: string;
  pricePerLiter: string;
  liters: string;
}

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'alcool', label: 'Álcool' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'podium', label: 'Pódium' },
  { value: 'outro', label: 'Outro' },
];

function emptyLine(): Line {
  return { fuelType: 'alcool', cost: '', pricePerLiter: '', liters: '' };
}

function computedLiters(line: Line): number {
  if (line.liters) return Number(line.liters);
  const cost = Number(line.cost);
  const price = Number(line.pricePerLiter);
  return cost > 0 && price > 0 ? cost / price : 0;
}

interface Props {
  defaultOdometer: number | null;
  avgConsumptionKmPerL: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export function FuelRefillModal({ defaultOdometer, avgConsumptionKmPerL, onClose, onSaved }: Props) {
  const [odometer, setOdometer] = useState(defaultOdometer != null ? String(defaultOdometer) : '');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalLiters: number } | null>(null);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    const odometroKm = Number(odometer);
    if (!odometroKm) {
      setError('Informe o odômetro.');
      return;
    }
    const validLines = lines.filter((l) => computedLiters(l) > 0);
    if (validLines.length === 0) {
      setError('Informe ao menos uma linha com litros ou (valor + preço/L).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let firstId: string | null = null;
      let totalLiters = 0;
      for (const line of validLines) {
        const liters = computedLiters(line);
        const refill = await maintenanceService.createRefill({
          liters,
          cost: line.cost ? Number(line.cost) : undefined,
          odometro_km: odometroKm,
          fuel_type: line.fuelType,
          price_per_liter: line.pricePerLiter ? Number(line.pricePerLiter) : undefined,
        });
        totalLiters += liters;
        if (!firstId) firstId = refill.id;
      }
      if (receipt && firstId) {
        await maintenanceService.uploadReceipt(firstId, receipt).catch(() => {
          // nota fiscal é um extra -- não desfaz o abastecimento já salvo se o upload falhar
        });
      }
      setResult({ totalLiters });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar abastecimento.');
    } finally {
      setBusy(false);
    }
  }

  const estimatedRangeKm = result && avgConsumptionKmPerL != null ? result.totalLiters * avgConsumptionKmPerL : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-96 max-w-[90vw] max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Fuel size={16} className="text-amber-600" /> Abastecimento
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold text-slate-700">Abastecimento registrado!</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-3">{result.totalLiters.toFixed(1)}L</p>
            {estimatedRangeKm != null ? (
              <p className="text-xs text-slate-400 mt-1">
                autonomia estimada: <span className="font-bold text-slate-600">~{estimatedRangeKm.toFixed(0)} km</span> (baseado no
                consumo médio)
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Autonomia estimada aparece a partir do 2º abastecimento.</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <input
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              type="number"
              placeholder="Odômetro (km)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
            />

            <div className="flex flex-col gap-3">
              {lines.map((line, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <select
                      value={line.fuelType}
                      onChange={(e) => updateLine(i, { fuelType: e.target.value as FuelType })}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                    >
                      {FUEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {lines.length > 1 && (
                      <button
                        onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-slate-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={line.cost}
                      onChange={(e) => updateLine(i, { cost: e.target.value })}
                      type="number"
                      placeholder="R$"
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      value={line.pricePerLiter}
                      onChange={(e) => updateLine(i, { pricePerLiter: e.target.value })}
                      type="number"
                      placeholder="R$/L"
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      value={line.liters || (computedLiters(line) ? computedLiters(line).toFixed(2) : '')}
                      onChange={(e) => updateLine(i, { liters: e.target.value })}
                      type="number"
                      placeholder="Litros"
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 mt-2 transition-colors"
            >
              <Plus size={13} /> Outro combustível (abastecimento misto)
            </button>

            <label className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 transition-colors">
              <Camera size={14} />
              {receipt ? receipt.name : 'Anexar nota fiscal (opcional)'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
            </label>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {busy ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
