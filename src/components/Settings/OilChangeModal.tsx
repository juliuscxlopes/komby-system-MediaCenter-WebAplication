// src/components/Settings/OilChangeModal.tsx
import { useState } from 'react';
import { X, Droplet } from 'lucide-react';
import { maintenanceService } from '../../services/maintenanceService';

interface Props {
  defaultOdometer: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export function OilChangeModal({ defaultOdometer, onClose, onSaved }: Props) {
  const [odometer, setOdometer] = useState(defaultOdometer != null ? String(defaultOdometer) : '');
  const [oilType, setOilType] = useState('');
  const [brand, setBrand] = useState('');
  const [viscosity, setViscosity] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!odometer) {
      setError('Informe o odômetro.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await maintenanceService.createOilChange({
        odometro_km: Number(odometer),
        oil_type: oilType.trim() || undefined,
        brand: brand.trim() || undefined,
        viscosity: viscosity.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar troca de óleo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-96 max-w-[90vw] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Droplet size={16} className="text-emerald-600" /> Troca de óleo
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <input
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            type="number"
            placeholder="Odômetro (km)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca (ex: Mobil, Castrol...)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={oilType}
              onChange={(e) => setOilType(e.target.value)}
              placeholder="Tipo (ex: Sintético)"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <input
              value={viscosity}
              onChange={(e) => setViscosity(e.target.value)}
              placeholder="Viscosidade (ex: 5W30)"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observação (opcional)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={busy || !odometer}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {busy ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
