// src/pages/app/Maps.tsx
//
// O histórico (deslocamento/visitados/recentes + lista de trajetos) vive
// dentro da própria barra de baixo do MapComponent agora (enableHistoryDrawer)
// -- essa página só encaixa o mapa cheio na tela.
import { MapComponent } from '../../components/Map/MapComponent';

export function Maps() {
  return (
    <div className="h-[calc(100vh-8rem)] p-4 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
      <MapComponent enableHistoryDrawer />
    </div>
  );
}
