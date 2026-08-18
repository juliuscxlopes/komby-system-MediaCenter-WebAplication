// src/components/Dashboard/LoadBalanceCard.tsx
//
// Balanceamento de carga -- indicador RELATIVO por curso de suspensão, não
// peso calibrado (sem célula de carga no sistema). Layout 2x2 espelha a
// posição física das rodas (FL/FR na frente, RL/RR atrás), canto mais
// carregado destacado.
import { Scale } from 'lucide-react';
import { useLoadBalance } from '../../hooks/useLoadBalance';

const CORNER_LABEL = { FL: 'Diant. Esq.', FR: 'Diant. Dir.', RL: 'Tras. Esq.', RR: 'Tras. Dir.' } as const;

export function LoadBalanceCard() {
  const state = useLoadBalance();

  return (
    <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
        <Scale size={12} /> Balanceamento de Carga
      </div>

      {!state ? (
        <p className="text-xs text-slate-400 mt-4">Sem leitura de suspensão ainda.</p>
      ) : (
        <>
          <p className={`text-sm font-bold mt-3 ${state.balanced ? 'text-emerald-600' : 'text-amber-600'}`}>
            {state.balanced ? 'Equilibrado' : `Mais carregado: ${CORNER_LABEL[state.heaviestCorner!]}`}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {(['FL', 'FR', 'RL', 'RR'] as const).map((corner) => (
              <div
                key={corner}
                className={`rounded-2xl p-3 text-center border ${
                  state.heaviestCorner === corner ? 'border-amber-300 bg-amber-50' : 'border-slate-100'
                }`}
              >
                <p className="text-[10px] font-semibold text-slate-400">{CORNER_LABEL[corner]}</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums mt-0.5">
                  {state.deviations[corner] > 0 ? '+' : ''}
                  {state.deviations[corner]}
                  <span className="text-xs text-slate-400 font-semibold"> mm</span>
                </p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 mt-3">Indicador relativo (curso de suspensão), não peso calibrado.</p>
        </>
      )}
    </div>
  );
}
