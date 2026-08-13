// src/pages/app/Maps.tsx
import { MapComponent } from '../../components/Map/MapComponent';

export function Maps() {
  return (
    <div className="p-4 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm h-[calc(100vh-8rem)]">
      <MapComponent />
    </div>
  );
}
