// src/components/Map/CompassWidget.tsx
//
// Bússola simples -- N/S/L/O fixos, a agulha gira pro rumo atual do GPS
// (heading, 0-360°). Puramente visual, não interage com o mapa.
interface Props {
  heading: number;
}

export function CompassWidget({ heading }: Props) {
  return (
    <div className="relative w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
      <span className="absolute top-0.5 text-[8px] font-bold text-slate-400">N</span>
      <span className="absolute bottom-0.5 text-[8px] font-bold text-slate-300">S</span>
      <span className="absolute left-1 text-[8px] font-bold text-slate-300">O</span>
      <span className="absolute right-1 text-[8px] font-bold text-slate-300">L</span>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        style={{ transform: `rotate(${heading}deg)`, transition: 'transform 0.3s ease-out' }}
      >
        <path d="M12 2 L16 14 L12 11 L8 14 Z" fill="#0f172a" />
        <path d="M12 22 L14 15 L12 17 L10 15 Z" fill="#cbd5e1" />
      </svg>
    </div>
  );
}
