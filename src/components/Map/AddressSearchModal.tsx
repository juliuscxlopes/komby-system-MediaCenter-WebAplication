// src/components/Map/AddressSearchModal.tsx
//
// Modal de busca de endereço/lugar por texto, reusado por "Adicionar
// destino"/"Adicionar parada"/"Cadastrar novo lugar" -- muda só por props.
// requireNickname=true adiciona um segundo passo (campo de apelido, opcional
// -- em branco usa o próprio texto encontrado como rótulo) antes de confirmar.
import { useEffect, useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { geocodeService, type GeocodeResult } from '../../services/geocodeService';

interface Props {
  title: string;
  requireNickname?: boolean;
  onConfirm: (result: { lat: number; lon: number; label: string; nickname?: string }) => void;
  onClose: () => void;
  onPickOnMap: () => void;
}

export function AddressSearchModal({ title, requireNickname, onConfirm, onClose, onPickOnMap }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [nickname, setNickname] = useState('');

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
    }, 300); // debounce -- não busca a cada tecla

    return () => clearTimeout(timer);
  }, [query]);

  function handlePick(result: GeocodeResult) {
    if (!requireNickname) {
      onConfirm({ lat: result.lat, lon: result.lon, label: result.label });
      return;
    }
    setSelected(result);
    setNickname(result.label);
  }

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="bg-white rounded-2xl shadow-2xl w-[26rem] max-w-[90vw] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {selected ? (
          <div>
            <p className="text-xs text-slate-400 mb-2">{selected.label}</p>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Apelido (opcional)
            </label>
            <input
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={selected.label}
              className="w-full px-3 py-2 mt-1 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() =>
                  onConfirm({
                    lat: selected.lat,
                    lon: selected.lon,
                    label: selected.label,
                    nickname: nickname.trim() || selected.label,
                  })
                }
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite um endereço ou nome de lugar..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="max-h-56 overflow-y-auto -mx-1">
              {searching && <p className="text-xs text-slate-400 px-1 py-2">Buscando...</p>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-slate-400 px-1 py-2">Nada encontrado.</p>
              )}
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handlePick(result)}
                  className="w-full flex items-center gap-2 text-left px-2 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{result.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onPickOnMap}
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-700 mt-3 py-1 transition-colors"
            >
              ou toque num ponto do mapa
            </button>
          </>
        )}
      </div>
    </div>
  );
}
