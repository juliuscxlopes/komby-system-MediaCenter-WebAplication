// src/components/Settings/SettingsModal.tsx
//
// Modal de configurações -- menu lateral + painel de conteúdo. Carrega o
// bundle inteiro (GET /settings) uma vez ao abrir; cada seção salva só o
// que edita e dispara refresh() pra recarregar o bundle inteiro (mantém
// tudo consistente sem cada seção gerenciar seu próprio cache).
import { useEffect, useState } from 'react';
import { X, Car, Cog, Gauge, SlidersHorizontal, Grid3x3, Route } from 'lucide-react';
import { settingsService, type SettingsBundle } from '../../services/settingsService';
import { SettingsFieldForm, type FieldSpec } from './SettingsFieldForm';
import { SensorLimitsSection } from './SensorLimitsSection';
import { EngineMapsSection } from './EngineMapsSection';

const VEHICLE_FIELDS: FieldSpec[] = [
  { key: 'nome_apelido', label: 'Apelido' },
  { key: 'marca_modelo_ano', label: 'Marca/Modelo/Ano' },
  { key: 'placa', label: 'Placa' },
  { key: 'chassi', label: 'Chassi' },
  { key: 'cor', label: 'Cor' },
  { key: 'peso_vazio_kg', label: 'Peso Vazio', type: 'number', unit: 'kg' },
  { key: 'capacidade_carga_kg', label: 'Capacidade de Carga', type: 'number', unit: 'kg' },
  { key: 'tipo_refrigeracao', label: 'Refrigeração' },
];

const ENGINE_FIELDS: FieldSpec[] = [
  { key: 'codigo_motor', label: 'Código do Motor' },
  { key: 'cilindrada_cc', label: 'Cilindrada', type: 'number', unit: 'cc' },
  { key: 'Hp_Horses', label: 'Potência' },
  { key: 'Capacidade_Oleo_L', label: 'Capacidade de Óleo', type: 'number', unit: 'L' },
  { key: 'viscosidade_oleo', label: 'Viscosidade do Óleo' },
  { key: 'combustivel', label: 'Combustível' },
  { key: 'Capacidade_Combustivel_L', label: 'Capacidade de Combustível', type: 'number', unit: 'L' },
  { key: 'bore_stroke', label: 'Bore x Stroke' },
  { key: 'sistema_escape', label: 'Sistema de Escape' },
];

const USAGE_FIELDS: FieldSpec[] = [
  { key: 'pneu_frente_psi', label: 'Pneu Dianteiro', type: 'number', unit: 'psi' },
  { key: 'pneu_tras_psi', label: 'Pneu Traseiro', type: 'number', unit: 'psi' },
  { key: 'viscosidade_oleo', label: 'Viscosidade do Óleo' },
  { key: 'intervalo_oleo_km', label: 'Intervalo de Troca de Óleo', type: 'number', unit: 'km' },
  { key: 'alerta_revisao_antes_km', label: 'Alertar Revisão Antes de', type: 'number', unit: 'km' },
];

const TRIP_SPECS_FIELDS: FieldSpec[] = [
  { key: 'movingSpeedKmh', label: 'Velocidade p/ Considerar "Em Movimento"', type: 'number', unit: 'km/h' },
  { key: 'movingSustainMs', label: 'Sustentação p/ Abrir Trip', type: 'number', unit: 'ms' },
  { key: 'idleSustainMs', label: 'Sustentação Parado p/ Fechar Trip', type: 'number', unit: 'ms' },
  { key: 'minSatellites', label: 'Satélites Mínimos (sinal confiável)', type: 'number' },
  { key: 'maxHdop', label: 'HDOP Máximo (sinal confiável)', type: 'number' },
  { key: 'maxPlausibleKmh', label: 'Velocidade Máxima Plausível', type: 'number', unit: 'km/h' },
  { key: 'accumulateIntervalMs', label: 'Intervalo de Acumulação de KM', type: 'number', unit: 'ms' },
  { key: 'joltThresholdG', label: 'Limiar de Solavanco', type: 'number', unit: 'G', step: 0.01 },
  { key: 'joltDebounceMs', label: 'Debounce de Solavanco', type: 'number', unit: 'ms' },
];

const SECTIONS = [
  { key: 'vehicle', label: 'Veículo', icon: Car },
  { key: 'engine', label: 'Motor', icon: Cog },
  { key: 'usage', label: 'Config. de Uso', icon: Gauge },
  { key: 'sensorLimits', label: 'Limites Operacionais', icon: SlidersHorizontal },
  { key: 'tripSpecs', label: 'Trip Specs', icon: Route },
  { key: 'engineMaps', label: 'Mapas 2D', icon: Grid3x3 },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [active, setActive] = useState<SectionKey>('vehicle');
  const [bundle, setBundle] = useState<SettingsBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await settingsService.getAll();
      setBundle(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Falha ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden">
        {/* Menu lateral */}
        <aside className="w-56 border-r border-slate-100 p-4 flex flex-col gap-1 shrink-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 px-3 mb-2">Configurações</p>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActive(section.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors ${
                  active === section.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <h2 className="text-base font-bold text-slate-900">
              {SECTIONS.find((s) => s.key === active)?.label}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {loading && !bundle && <p className="text-sm text-slate-400">Carregando...</p>}
            {loadError && <p className="text-sm text-red-500">{loadError}</p>}

            {bundle && (
              <>
                {active === 'vehicle' && (
                  <SettingsFieldForm
                    fields={VEHICLE_FIELDS}
                    values={bundle.vehicle}
                    onSave={async (changed) => {
                      await settingsService.updateVehicle(changed);
                      await refresh();
                    }}
                  />
                )}

                {active === 'engine' && bundle.engine && (
                  <SettingsFieldForm
                    fields={ENGINE_FIELDS}
                    values={bundle.engine}
                    onSave={async (changed) => {
                      await settingsService.updateEngine(changed);
                      await refresh();
                    }}
                  />
                )}
                {active === 'engine' && !bundle.engine && (
                  <p className="text-sm text-slate-400">Nenhum motor ativo cadastrado ainda.</p>
                )}

                {active === 'usage' && (
                  <SettingsFieldForm
                    fields={USAGE_FIELDS}
                    values={bundle.usage || {}}
                    onSave={async (changed) => {
                      await settingsService.updateUsage(changed);
                      await refresh();
                    }}
                  />
                )}

                {active === 'sensorLimits' && (
                  <SensorLimitsSection sensorLimits={bundle.sensorLimits} onRefresh={refresh} />
                )}

                {active === 'tripSpecs' && (
                  <SettingsFieldForm
                    fields={TRIP_SPECS_FIELDS}
                    values={bundle.tripSpecs}
                    onSave={async (changed) => {
                      await settingsService.updateTripSpecs(changed);
                      await refresh();
                    }}
                  />
                )}

                {active === 'engineMaps' && (
                  <EngineMapsSection engineMaps={bundle.engineMaps} onRefresh={refresh} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
