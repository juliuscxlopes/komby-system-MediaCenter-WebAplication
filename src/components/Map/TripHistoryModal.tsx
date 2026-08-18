// src/components/Map/TripHistoryModal.tsx
//
// Histórico de trajetos -- lista (dia/hora/duração/km) na esquerda,
// detalhe (mapa + eventos + telemetria + médias, ver TripDetailPane.tsx) na
// direita, os dois no MESMO modal. Antes eram dois modais empilhados (lista
// abria detalhe por cima) -- consolidado num só, sem precisar fechar um pra
// ver o outro. Abre já com o trajeto mais recente selecionado.
import { useState } from 'react';
import { X } from 'lucide-react';
import type { Trip } from '../../services/tripsService';
import { TripDetailPane } from './TripDetailPane';

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
  const [selectedId, setSelectedId] = useState<string | null>(trips[0]?.id ?? null);
  const selected = trips.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[88vh] flex overflow-hidden">
        {/* Lista */}
        <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-bold text-slate-900">Trajetos ({trips.length})</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {trips.length === 0 && <p className="text-xs text-slate-400 px-5 py-4">Nenhum trajeto registrado ainda.</p>}
            {trips.map((trip) => {
              const started = new Date(trip.started_at);
              const active = trip.id === selectedId;
              return (
                <button
                  key={trip.id}
                  onClick={() => setSelectedId(trip.id)}
                  className={`w-full flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-50 text-left transition-colors ${
                    active ? 'bg-slate-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-800'}`}>
                      {started.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      {started.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {formatDuration(trip.moving_seconds)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${active ? 'text-white' : 'text-slate-900'}`}>
                    {Number(trip.distance_km).toFixed(1)} km
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalhe */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <TripDetailPane key={selected.id} trip={selected} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">Escolha um trajeto na lista.</div>
          )}
        </div>
      </div>
    </div>
  );
}
