// src/components/Dashboard/OilHistoryModal.tsx
import { X, Droplet } from 'lucide-react';
import type { OilChange } from '../../services/maintenanceService';

interface Props {
  changes: OilChange[];
  onClose: () => void;
}

export function OilHistoryModal({ changes, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Droplet size={16} className="text-emerald-600" /> Trocas de óleo ({changes.length})
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {changes.length === 0 && <p className="text-xs text-slate-400">Nenhuma troca registrada ainda.</p>}
          <div className="flex flex-col">
            {changes.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(o.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {o.odometro_km.toFixed(0)}km{o.oil_type ? ` · ${o.oil_type}` : ''}
                  </p>
                  {o.notes && <p className="text-xs text-slate-400 mt-0.5">{o.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{[o.brand, o.viscosity].filter(Boolean).join(' ') || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
