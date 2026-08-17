// src/components/Settings/AvatarSection.tsx
//
// Escolha de ícone + cor do marcador do veículo no mapa ao vivo. Salva
// direto em veiculos.marker_icon/marker_color via PUT /settings/vehicle
// (endpoint genérico já existente, sem rota nova) e avisa o MapComponent
// (se estiver montado por baixo do modal) via evento de window, pra
// atualizar o marcador sem precisar recarregar a página.
import { useState } from 'react';
import { Check } from 'lucide-react';
import { settingsService, type VehicleConfig } from '../../services/settingsService';
import {
  VEHICLE_MARKER_ICONS,
  VEHICLE_MARKER_COLORS,
  VEHICLE_MARKER_UPDATED_EVENT,
  buildVehicleMarkerSvg,
  type VehicleMarkerIcon,
} from '../../config/vehicleMarker';

interface Props {
  vehicle: VehicleConfig;
  onRefresh: () => Promise<void>;
}

export function AvatarSection({ vehicle, onRefresh }: Props) {
  const [icon, setIcon] = useState<VehicleMarkerIcon>((vehicle.marker_icon as VehicleMarkerIcon) || 'arrow');
  const [color, setColor] = useState(vehicle.marker_color || '#0f172a');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = icon !== (vehicle.marker_icon || 'arrow') || color !== (vehicle.marker_color || '#0f172a');

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await settingsService.updateVehicle({ marker_icon: icon, marker_color: color });
      window.dispatchEvent(new CustomEvent(VEHICLE_MARKER_UPDATED_EVENT, { detail: { icon, color } }));
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar avatar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-6 mb-8">
        <div
          className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0"
          dangerouslySetInnerHTML={{ __html: buildVehicleMarkerSvg(icon, color, 44) }}
        />
        <div>
          <p className="text-sm font-bold text-slate-900">Avatar no mapa</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            É o ícone que representa o veículo se movendo no mapa ao vivo, girando conforme a direção do GPS.
          </p>
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Ícone</p>
      <div className="flex gap-3 mb-6">
        {VEHICLE_MARKER_ICONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setIcon(opt.value)}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors ${
              icon === opt.value ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div dangerouslySetInnerHTML={{ __html: buildVehicleMarkerSvg(opt.value, color, 26) }} />
            <span className="text-[11px] font-semibold text-slate-600">{opt.label}</span>
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Cor</p>
      <div className="flex items-center gap-2 mb-8">
        {VEHICLE_MARKER_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-100"
            style={{ backgroundColor: c }}
          >
            {color === c && <Check size={14} className="text-white" />}
          </button>
        ))}
        <label className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden relative">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span className="text-[9px] font-bold text-slate-400">+</span>
        </label>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-40"
      >
        <Check size={14} /> {saving ? 'Salvando...' : 'Salvar avatar'}
      </button>
    </div>
  );
}
