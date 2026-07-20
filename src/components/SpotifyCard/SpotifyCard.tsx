export function SpotifyCard() {
  return (
    <div className="w-full h-full bg-slate-900 rounded-3xl p-4 flex items-center gap-4 text-white shadow-lg">
      <div className="w-12 h-12 bg-emerald-500 rounded-xl shrink-0" />
      <div className="overflow-hidden">
        <p className="text-sm font-bold truncate">Nome da Música</p>
        <p className="text-xs text-slate-400 truncate">Artista</p>
      </div>
    </div>
  );
}