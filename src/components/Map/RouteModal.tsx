// src/components/Map/RouteModal.tsx
//
// Substitui os antigos "Adicionar destino"/"Adicionar parada" separados do
// FAB por um fluxo só: escolhe o destino (sugestões por mais visitado/
// recente, ou busca) -- a rota já começa (o resto do app já reage a ela via
// NAV_STATE/bottom bar) e o modal passa a mostrar km/tempo ao vivo, com
// opção de somar parada sem fechar. "toque no mapa" só cobre a escolha
// inicial do destino (ver onPickOnMap) -- somar parada é só por busca aqui.
import { useEffect, useState } from 'react';
import { Search, X, MapPin, Star, Clock, Plus } from 'lucide-react';
import { geocodeService, type GeocodeResult } from '../../services/geocodeService';
import { navigationService, type NavRoute, type RouteSuggestions } from '../../services/navigationService';

interface Props {
  onClose: () => void;
  onPickOnMap: () => void;
}

export function RouteModal({ onClose, onPickOnMap }: Props) {
  const [suggestions, setSuggestions] = useState<RouteSuggestions | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [addingStop, setAddingStop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigationService
      .getSuggestions()
      .then(setSuggestions)
      .catch(() => {
        // sem sugestão ainda (banco vazio) -- só fica com a busca
      });
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      geocodeService
        .search(query)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function pick(lat: number, lon: number, label: string, savedPlaceId?: string) {
    setBusy(true);
    setError(null);
    try {
      const next = route ? await navigationService.addStop(lat, lon) : await navigationService.start(lat, lon, { label, savedPlaceId });
      setRoute(next);
      setQuery('');
      setResults([]);
      setAddingStop(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao calcular rota.');
    } finally {
      setBusy(false);
    }
  }

  const showPicker = !route || addingStop;

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="bg-white rounded-2xl shadow-2xl w-[26rem] max-w-[90vw] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">{addingStop ? 'Adicionar parada' : 'Rota'}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {route && !showPicker && (
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{route.totalDistanceKm.toFixed(1)} km</span>
              <span className="text-sm font-semibold text-slate-400">~{Math.max(1, Math.round(route.totalDurationMin))} min</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {route.stops.length} parada{route.stops.length > 1 ? 's' : ''} no trajeto
            </p>
          </div>
        )}

        {showPicker && (
          <>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pra onde vamos?"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="max-h-64 overflow-y-auto -mx-1">
              {query.trim().length >= 2 ? (
                <>
                  {searching && <p className="text-xs text-slate-400 px-1 py-2">Buscando...</p>}
                  {!searching && results.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">Nada encontrado.</p>}
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pick(r.lat, r.lon, r.label)}
                      disabled={busy}
                      className="w-full flex items-center gap-2 text-left px-2 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                    >
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{r.label}</span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {!!suggestions?.savedPlaces.length && (
                    <div className="mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 px-2 mb-1">
                        Mais visitados
                      </p>
                      {suggestions.savedPlaces.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => pick(p.lat, p.lon, p.name, p.id)}
                          disabled={busy}
                          className="w-full flex items-center gap-2 text-left px-2 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                        >
                          <Star size={14} className="text-amber-500 shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!!suggestions?.recentDestinations.length && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 px-2 mb-1">Recentes</p>
                      {suggestions.recentDestinations.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => pick(d.lat, d.lon, d.label, d.saved_place_id ?? undefined)}
                          disabled={busy}
                          className="w-full flex items-center gap-2 text-left px-2 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                        >
                          <Clock size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!suggestions?.savedPlaces.length && !suggestions?.recentDestinations.length && (
                    <p className="text-xs text-slate-400 px-1 py-2">Digite pra buscar um endereço ou lugar.</p>
                  )}
                </>
              )}
            </div>

            {!route && (
              <button
                onClick={onPickOnMap}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-700 mt-3 py-1 transition-colors"
              >
                ou toque num ponto do mapa
              </button>
            )}
            {addingStop && (
              <button
                onClick={() => setAddingStop(false)}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-700 mt-3 py-1 transition-colors"
              >
                cancelar parada
              </button>
            )}
          </>
        )}

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        {route && !showPicker && (
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setAddingStop(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Plus size={14} /> Adicionar parada
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
