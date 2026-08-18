// src/components/Dashboard/VehicleStatusCard.tsx
//
// Cinco instrumentos, cinco containers separados (são dados diferentes, não
// faz sentido empacotar num só): horizonte+balanceamento (instrumento único
// -- pitch/roll ao vivo + curso de suspensão por canto, ver
// useAttitude.ts/useLoadBalance.ts/SuspensionService.js), peso total
// estimado (veículo + pessoas a bordo), deslocamento (clica pra abrir o
// histórico de trajetos), combustível e óleo -- os dois últimos com dado de
// verdade agora (Configurações > Manutenção alimenta isso, ver
// maintenanceService.ts). Quantidade ATUAL no tanque continua "—" -- isso
// sim precisa de sensor de nível de verdade, não tem como saber sem ele.
import { useEffect, useState } from 'react';
import { Fuel, Droplet } from 'lucide-react';
import { peopleService, type OnboardSummary } from '../../services/peopleService';
import { statsService, type DistanceSummary } from '../../services/statsService';
import { tripsService, type Trip } from '../../services/tripsService';
import { maintenanceService, type MaintenanceSummary, type FuelRefill, type OilChange } from '../../services/maintenanceService';
import { AttitudeIndicator } from './AttitudeIndicator';
import { TripHistoryModal } from '../Map/TripHistoryModal';
import { FuelHistoryModal } from './FuelHistoryModal';
import { OilHistoryModal } from './OilHistoryModal';
import { useAttitude } from '../../hooks/useAttitude';
import { useLoadBalance } from '../../hooks/useLoadBalance';

const CARD_CLASS = 'p-6 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm';
const CORNER_LABEL = { FL: 'Diant. Esq.', FR: 'Diant. Dir.', RL: 'Tras. Esq.', RR: 'Tras. Dir.' } as const;
const FUEL_TYPE_LABEL: Record<string, string> = { alcool: 'Álcool', gasolina: 'Gasolina', podium: 'Pódium', outro: 'Outro' };

function CornerReading({ corner, value, heaviest, className }: { corner: keyof typeof CORNER_LABEL; value: number; heaviest: boolean; className: string }) {
  return (
    <div className={`absolute text-center ${className}`}>
      <p className="text-[9px] font-semibold text-slate-400">{CORNER_LABEL[corner]}</p>
      <p className={`text-sm tabular-nums ${heaviest ? 'font-bold text-slate-900 underline decoration-2' : 'font-semibold text-slate-500'}`}>
        {value > 0 ? '+' : ''}
        {value}mm
      </p>
    </div>
  );
}

export function VehicleStatusCard() {
  const attitude = useAttitude();
  const balance = useLoadBalance();
  const [summary, setSummary] = useState<OnboardSummary | null>(null);
  const [distance, setDistance] = useState<DistanceSummary | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceSummary | null>(null);
  const [refills, setRefills] = useState<FuelRefill[]>([]);
  const [fuelHistoryOpen, setFuelHistoryOpen] = useState(false);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [oilHistoryOpen, setOilHistoryOpen] = useState(false);

  useEffect(() => {
    peopleService.getOnboardSummary().then(setSummary).catch(() => {});
    statsService.getDistance().then(setDistance).catch(() => {});
    maintenanceService.getSummary().then(setMaintenance).catch(() => {});
  }, []);

  async function handleOpenHistory() {
    if (trips.length === 0) setTrips(await tripsService.list());
    setHistoryOpen(true);
  }

  async function handleOpenFuelHistory() {
    if (refills.length === 0) setRefills(await maintenanceService.listRefills());
    setFuelHistoryOpen(true);
  }

  async function handleOpenOilHistory() {
    if (oilChanges.length === 0) setOilChanges(await maintenanceService.listOilChanges());
    setOilHistoryOpen(true);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Horizonte + balanceamento -- um instrumento só, sem título (é
          autoexplicativo pelo desenho). Dial no centro, cantos da
          suspensão nos 4 cantos ao redor. */}
      <div className={`${CARD_CLASS} flex flex-col items-center justify-center`}>
        <div className="relative w-36 h-36">
          <div className="absolute inset-0 flex items-center justify-center">
            <AttitudeIndicator pitch={attitude.pitch} roll={attitude.roll} size={92} />
          </div>
          {balance && (
            <>
              <CornerReading corner="FL" value={balance.deviations.FL} heaviest={balance.heaviestCorner === 'FL'} className="top-0 left-0" />
              <CornerReading corner="FR" value={balance.deviations.FR} heaviest={balance.heaviestCorner === 'FR'} className="top-0 right-0" />
              <CornerReading corner="RL" value={balance.deviations.RL} heaviest={balance.heaviestCorner === 'RL'} className="bottom-0 left-0" />
              <CornerReading corner="RR" value={balance.deviations.RR} heaviest={balance.heaviestCorner === 'RR'} className="bottom-0 right-0" />
            </>
          )}
        </div>
        {balance && !balance.balanced && (
          <p className="text-xs font-semibold text-slate-500 mt-2">Mais carregado: {CORNER_LABEL[balance.heaviestCorner!]}</p>
        )}
      </div>

      {/* Peso total estimado */}
      <div className={CARD_CLASS}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Peso Total Estimado</p>
        {!summary ? (
          <p className="text-xs text-slate-400">Carregando...</p>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{summary.totalEstimatedKg.toFixed(0)}</span>
              <span className="text-sm font-semibold text-slate-400">kg</span>
            </div>
            <div className="mt-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Kombi</span>
                <span className="font-bold text-slate-700 tabular-nums">{summary.emptyWeightKg.toFixed(0)}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Passageiros</span>
                <span className="font-bold text-slate-700 tabular-nums">{summary.peopleWeightKg.toFixed(0)}kg</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-50">
                <span className="text-slate-500 font-semibold">Total</span>
                <span className="font-bold text-slate-900 tabular-nums">{summary.totalEstimatedKg.toFixed(0)}kg</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Deslocamento -- toca pra abrir o histórico de trajetos (dia/hora/
          duração/km, cada um abre o detalhe com mapa+eventos, ver
          TripHistoryModal.tsx, lista+detalhe no mesmo modal). */}
      <button onClick={handleOpenHistory} className={`${CARD_CLASS} text-left hover:shadow-md transition-shadow`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Deslocamento</p>
        {!distance ? (
          <p className="text-xs text-slate-400">Carregando...</p>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{distance.weekKm.toFixed(0)}</span>
              <span className="text-sm font-semibold text-slate-400">km/semana</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 mt-1">{distance.monthKm.toFixed(0)} km esse mês</p>
            <p className="text-[10px] text-slate-400 mt-2 underline decoration-dotted">ver histórico de trajetos</p>
          </>
        )}
      </button>

      {/* Combustível -- quantidade ATUAL no tanque continua "—" (precisa de
          sensor de nível de verdade), resto vem do log real de abastecimento
          (Configurações > Manutenção). */}
      <button onClick={handleOpenFuelHistory} className={`${CARD_CLASS} text-left hover:shadow-md transition-shadow`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
          <Fuel size={11} /> Combustível
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-slate-300 tabular-nums">—</span>
          <span className="text-sm font-semibold text-slate-400">/ {maintenance?.tankCapacityL ?? '—'}L</span>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Último abastecimento</span>
            <span className="font-semibold text-slate-700">
              {maintenance?.lastRefill
                ? `${maintenance.lastRefill.liters}L${maintenance.lastRefill.fuel_type ? ` (${FUEL_TYPE_LABEL[maintenance.lastRefill.fuel_type] || maintenance.lastRefill.fuel_type})` : ''} · ${new Date(maintenance.lastRefill.refilled_at).toLocaleDateString('pt-BR')}`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Consumo médio</span>
            <span className="font-semibold text-slate-700">
              {maintenance?.avgConsumptionKmPerL != null ? `${maintenance.avgConsumptionKmPerL.toFixed(1)} km/L` : '—'}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 underline decoration-dotted">ver histórico de abastecimento</p>
      </button>

      {/* Óleo -- viscosidade em si continua "—" (sem sensor real), mas "km
          desde a troca" já usa o odômetro real do veículo (fiel, ver
          VehicleModel) contra o odometro_km salvo na última troca. */}
      <button onClick={handleOpenOilHistory} className={`${CARD_CLASS} text-left hover:shadow-md transition-shadow`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
          <Droplet size={11} /> Óleo
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-slate-900 tabular-nums">
            {maintenance?.kmSinceOilChange != null ? maintenance.kmSinceOilChange.toFixed(0) : '—'}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            km{maintenance?.oilChangeIntervalKm ? ` / ${maintenance.oilChangeIntervalKm}` : ''}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Última troca</span>
            <span className="font-semibold text-slate-700">
              {maintenance?.lastOilChange
                ? `${maintenance.lastOilChange.odometro_km.toFixed(0)}km · ${new Date(maintenance.lastOilChange.changed_at).toLocaleDateString('pt-BR')}`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Viscosidade</span>
            <span className="font-semibold text-slate-700">
              {[maintenance?.lastOilChange?.brand, maintenance?.lastOilChange?.viscosity].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 underline decoration-dotted">ver histórico de trocas</p>
      </button>

      {historyOpen && <TripHistoryModal trips={trips} onClose={() => setHistoryOpen(false)} />}
      {fuelHistoryOpen && <FuelHistoryModal refills={refills} onClose={() => setFuelHistoryOpen(false)} />}
      {oilHistoryOpen && <OilHistoryModal changes={oilChanges} onClose={() => setOilHistoryOpen(false)} />}
    </div>
  );
}
