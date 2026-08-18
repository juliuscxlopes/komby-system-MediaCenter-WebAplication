// src/components/Dashboard/FuelHistoryModal.tsx
//
// Histórico de abastecimento -- lista simples (sem painel de detalhe
// separado, diferente do histórico de trajeto: aqui não tem mapa/
// telemetria por registro, só os campos já visíveis na própria linha).
import { X, Fuel } from 'lucide-react';
import type { FuelRefill } from '../../services/maintenanceService';

interface Props {
  refills: FuelRefill[];
  onClose: () => void;
}

const FUEL_TYPE_LABEL: Record<string, string> = { alcool: 'Álcool', gasolina: 'Gasolina', podium: 'Pódium', outro: 'Outro' };

export function FuelHistoryModal({ refills, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Fuel size={16} className="text-amber-600" /> Abastecimentos ({refills.length})
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {refills.length === 0 && <p className="text-xs text-slate-400">Nenhum abastecimento registrado ainda.</p>}
          <div className="flex flex-col">
            {refills.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(r.refilled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {r.fuel_type && <span className="text-slate-400 font-medium"> · {FUEL_TYPE_LABEL[r.fuel_type] || r.fuel_type}</span>}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {r.odometro_km.toFixed(0)}km{r.price_per_liter ? ` · R$${r.price_per_liter.toFixed(2)}/L` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900 tabular-nums">{r.liters}L</p>
                  {r.cost != null && <p className="text-xs text-slate-400 tabular-nums">R${r.cost.toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
