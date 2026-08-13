// src/hooks/useTapOrHoldSelection.ts
//
// Gesto pra display touch: toque rápido troca a seleção (só esse sensor
// fica ativo); segurar marca (adiciona sem tirar o resto); segurar um e
// tocar outro enquanto isso deixa os dois ativos. Um `Set` de ids (ex: o
// par CHT1+CHT2) é tratado como uma unidade -- sempre entra/sai junto.
import { useRef } from 'react';

const LONG_PRESS_MS = 400;

export function useTapOrHoldSelection(onReplace: (ids: string[]) => void, onToggle: (ids: string[]) => void) {
  const heldCount = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const longPressed = useRef<Record<string, boolean>>({});

  function getHandlers(ids: string[]) {
    const key = ids.join('+');

    return {
      onPointerDown: () => {
        heldCount.current += 1;
        longPressed.current[key] = false;
        timers.current[key] = setTimeout(() => {
          longPressed.current[key] = true;
          onToggle(ids);
        }, LONG_PRESS_MS);
      },
      onPointerUp: () => {
        clearTimeout(timers.current[key]);
        const wasLongPress = longPressed.current[key];
        const otherPointerStillHeld = heldCount.current > 1;
        heldCount.current = Math.max(0, heldCount.current - 1);

        if (wasLongPress) return; // já disparou o toggle no timer

        if (otherPointerStillHeld) {
          onToggle(ids); // segurando um e tocou noutro -- os dois ficam ativos
        } else {
          onReplace(ids); // toque solto -- troca a seleção
        }
      },
      onPointerCancel: () => {
        clearTimeout(timers.current[key]);
        heldCount.current = Math.max(0, heldCount.current - 1);
      },
      onPointerLeave: () => {
        clearTimeout(timers.current[key]);
      },
    };
  }

  return { getHandlers };
}
