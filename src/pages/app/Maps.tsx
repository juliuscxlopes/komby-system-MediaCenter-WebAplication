// src/pages/app/Maps.tsx
//
// Dois fragmentos: o mapa (MapComponent, vai ser reaproveitado na Home
// depois) e o histórico/estatísticas abaixo dele (MapHistoryPanel -- só
// faz sentido aqui, não na Home). Estado do histórico de trajetos fica
// aqui (não dentro do MapComponent) porque o gatilho é um card do painel,
// mas quem desenha é o mapa -- os dois são irmãos, não pai/filho.
import { useState } from 'react';
import { MapComponent } from '../../components/Map/MapComponent';
import { MapHistoryPanel } from '../../components/Map/MapHistoryPanel';
import { TripHistoryModal } from '../../components/Map/TripHistoryModal';
import { tripsService, type Trip } from '../../services/tripsService';

export function Maps() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showPathsOnMap, setShowPathsOnMap] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  async function ensureTripsLoaded() {
    if (trips.length > 0) return trips;
    const list = await tripsService.list();
    setTrips(list);
    return list;
  }

  return (
    <div className="relative flex flex-col gap-6">
      <div className="p-4 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm h-[70vh]">
        <MapComponent
          historyTrips={showPathsOnMap ? trips : []}
          showHistory={showPathsOnMap}
          onCloseHistory={() => setShowPathsOnMap(false)}
        />
      </div>

      <MapHistoryPanel
        onSingleTap={async () => {
          await ensureTripsLoaded();
          setShowPathsOnMap(true);
        }}
        onDoubleTap={async () => {
          await ensureTripsLoaded();
          setShowListModal(true);
        }}
      />

      {showListModal && <TripHistoryModal trips={trips} onClose={() => setShowListModal(false)} />}
    </div>
  );
}
