// src/components/Settings/MaintenanceSection.tsx
//
// Dois botões -- cada um abre um modal próprio (FuelRefillModal/
// OilChangeModal) com o formulário completo. Essa tela só mostra o botão +
// o histórico recente de cada um.
import { useEffect, useState } from 'react';
import { Fuel, Droplet } from 'lucide-react';
import { maintenanceService, type FuelRefill, type OilChange } from '../../services/maintenanceService';
import { settingsService } from '../../services/settingsService';
import { FuelRefillModal } from './FuelRefillModal';
import { OilChangeModal } from './OilChangeModal';

const FUEL_TYPE_LABEL: Record<string, string> = { alcool: 'Álcool', gasolina: 'Gasolina', podium: 'Pódium', outro: 'Outro' };

export function MaintenanceSection() {
  const [currentOdometer, setCurrentOdometer] = useState<number | null>(null);
  const [refills, setRefills] = useState<FuelRefill[]>([]);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [avgConsumption, setAvgConsumption] = useState<number | null>(null);
  const [refillModalOpen, setRefillModalOpen] = useState(false);
  const [oilModalOpen, setOilModalOpen] = useState(false);

  async function refresh() {
    const [bundle, refillList, oilList, summary] = await Promise.all([
      settingsService.getAll(),
      maintenanceService.listRefills(),
      maintenanceService.listOilChanges(),
      maintenanceService.getSummary(),
    ]);
    // odometro_km é `numeric` no Postgres -- o driver devolve como string,
    // não number (mesma pegadinha de trips.distance_km já mordeu antes).
    setCurrentOdometer(bundle.vehicle.odometro_km != null ? Number(bundle.vehicle.odometro_km) : null);
    setRefills(refillList);
    setOilChanges(oilList);
    setAvgConsumption(summary.avgConsumptionKmPerL);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Abastecimento */}
      <div>
        <button
          onClick={() => setRefillModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors mb-4"
        >
          <Fuel size={16} /> Registrar abastecimento
        </button>

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recentes</p>
        <div className="flex flex-col gap-1.5">
          {refills.length === 0 && <p className="text-xs text-slate-400">Nenhum abastecimento registrado ainda.</p>}
          {refills.slice(0, 5).map((r) => (
            <div key={r.id} className="flex justify-between text-xs">
              <span className="text-slate-400">
                {new Date(r.refilled_at).toLocaleDateString('pt-BR')} · {r.odometro_km.toFixed(0)}km
                {r.fuel_type && ` · ${FUEL_TYPE_LABEL[r.fuel_type] || r.fuel_type}`}
              </span>
              <span className="font-semibold text-slate-700">
                {r.liters}L{r.cost ? ` · R$${r.cost.toFixed(2)}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Troca de óleo */}
      <div>
        <button
          onClick={() => setOilModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors mb-4"
        >
          <Droplet size={16} /> Registrar troca de óleo
        </button>

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recentes</p>
        <div className="flex flex-col gap-1.5">
          {oilChanges.length === 0 && <p className="text-xs text-slate-400">Nenhuma troca registrada ainda.</p>}
          {oilChanges.slice(0, 5).map((o) => (
            <div key={o.id} className="flex justify-between text-xs">
              <span className="text-slate-400">
                {new Date(o.changed_at).toLocaleDateString('pt-BR')} · {o.odometro_km.toFixed(0)}km
              </span>
              <span className="font-semibold text-slate-700">
                {[o.brand, o.viscosity].filter(Boolean).join(' ') || o.notes || '—'}
              </span>
            </div>
          ))}
        </div>

        {currentOdometer != null && <p className="text-[10px] text-slate-300 mt-3">Odômetro atual: {currentOdometer.toFixed(0)}km</p>}
      </div>

      {refillModalOpen && (
        <FuelRefillModal
          defaultOdometer={currentOdometer}
          avgConsumptionKmPerL={avgConsumption}
          onClose={() => setRefillModalOpen(false)}
          onSaved={refresh}
        />
      )}
      {oilModalOpen && <OilChangeModal defaultOdometer={currentOdometer} onClose={() => setOilModalOpen(false)} onSaved={refresh} />}
    </div>
  );
}
