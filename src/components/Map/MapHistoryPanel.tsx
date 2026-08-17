// src/components/Map/MapHistoryPanel.tsx
//
// Fragmento 2 da página Mapas -- histórico/estatísticas que só fazem
// sentido aqui (a Home só vai reaproveitar o MapComponent, fragmento 1).
// Tudo com dado que já existia ou acabou de ser criado, sem pipeline novo:
// daily_stats (deslocamento) e saved_places.visit_count/recent_destinations
// (visitados/recentes), os dois últimos já expostos por
// GET /navigation/suggestions (mesmo endpoint que alimenta o RouteModal).
import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { statsService, type DistanceSummary } from '../../services/statsService';
import { navigationService, type RouteSuggestions } from '../../services/navigationService';

const CARD_CLASS =
  'p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm hover:shadow-md transition-all duration-300 text-left cursor-pointer';
const LABEL_CLASS = 'text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5';
const DOUBLE_TAP_WINDOW_MS = 280;

interface Props {
  // Toque simples: desenha todos os trajetos no mapa + resumo no rodapé.
  // Toque duplo: abre a lista dia/hora/duração/km (ver TripHistoryModal.tsx).
  onSingleTap: () => void;
  onDoubleTap: () => void;
}

export function MapHistoryPanel({ onSingleTap, onDoubleTap }: Props) {
  const [distance, setDistance] = useState<DistanceSummary | null>(null);
  const [suggestions, setSuggestions] = useState<RouteSuggestions | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Distingue toque simples de duplo sem depender do threshold nativo do
  // navegador (onClick + onDoubleClick juntos disparam os dois no duplo) --
  // primeiro toque espera a janela; segundo toque dentro dela cancela o
  // simples e dispara o duplo.
  function handleCardTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      onDoubleTap();
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        onSingleTap();
      }, DOUBLE_TAP_WINDOW_MS);
    }
  }

  useEffect(() => {
    statsService.getDistance().then(setDistance);
    navigationService
      .getSuggestions()
      .then(setSuggestions)
      .catch(() => {
        // sem sugestão ainda -- os cards ficam no estado vazio
      });
  }, []);

  const visited = suggestions?.savedPlaces.filter((p) => p.visit_count > 0).slice(0, 4) ?? [];
  const recent = suggestions?.recentDestinations.slice(0, 4) ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <button onClick={handleCardTap} className={`${CARD_CLASS} w-full`} title="Toque: trajetos no mapa · Toque duplo: lista">
        <div className={LABEL_CLASS}>
          <TrendingUp size={12} /> Deslocamento
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 tabular-nums">{(distance?.weekKm ?? 0).toFixed(0)}</span>
          <span className="text-sm font-semibold text-slate-400">km essa semana</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-500 tabular-nums">{(distance?.monthKm ?? 0).toFixed(0)}</span>
          <span className="text-xs font-semibold text-slate-400">km esse mês</span>
        </div>
      </button>

      <button onClick={handleCardTap} className={`${CARD_CLASS} w-full`} title="Toque: trajetos no mapa · Toque duplo: lista">
        <div className={LABEL_CLASS}>
          <MapPin size={12} /> Lugares mais visitados
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {visited.length === 0 && <p className="text-xs text-slate-400">Nenhuma visita registrada ainda.</p>}
          {visited.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700 truncate">{p.name}</span>
              <span className="text-xs font-bold text-slate-400 tabular-nums shrink-0">{p.visit_count}x</span>
            </div>
          ))}
        </div>
      </button>

      <button onClick={handleCardTap} className={`${CARD_CLASS} w-full`} title="Toque: trajetos no mapa · Toque duplo: lista">
        <div className={LABEL_CLASS}>
          <Clock size={12} /> Recentes
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {recent.length === 0 && <p className="text-xs text-slate-400">Nenhuma rota recente.</p>}
          {recent.map((d) => (
            <span key={d.id} className="text-sm font-semibold text-slate-700 truncate">
              {d.label}
            </span>
          ))}
        </div>
      </button>
    </div>
  );
}
