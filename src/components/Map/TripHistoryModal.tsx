// src/components/Map/TripHistoryModal.tsx
//
// Toque duplo nos cards do painel do Mapas (ver MapHistoryPanel.tsx) --
// lista dia/hora/duração/km de cada trip fechada, mais recente primeiro.
import { X } from 'lucide-react';
import type { Trip } from '../../services/tripsService';

interface Props {
  trips: Trip[];
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

export function TripHistoryModal({ trips, onClose }: Props) {
  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-20">
      <div className="bg-white rounded-2xl shadow-2xl w-[28rem] max-w-[90vw] max-h-[80vh] flex flex-col p-5">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-sm font-bold text-slate-900">Trajetos ({trips.length})</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto -mx-1 flex-1">
          {trips.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">Nenhum trajeto registrado ainda.</p>}
          {trips.map((trip) => {
            const started = new Date(trip.started_at);
            return (
              <div key={trip.id} className="flex items-center justify-between gap-3 px-2 py-3 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {started.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {started.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {formatDuration(trip.moving_seconds)}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">{trip.distance_km.toFixed(1)} km</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
