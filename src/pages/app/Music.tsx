// src/pages/app/Music.tsx
//
// Aba "Music" -- busca/toca vídeo musical via YouTube (embed simples,
// controles nativos do player já vêm prontos no iframe). Busca funciona
// sempre (API key, sem login); playlists/curtidos exigem "Conectar
// YouTube" (consentimento incremental à parte do login do app, ver
// youtubeService.ts). Sem controle de playback do Spotify por trás disso:
// decidimos não seguir com Spotify porque conta free não toca nem controla
// nada via API (só Premium) -- YouTube toca de verdade, sem essa trava.
import { useEffect, useState } from 'react';
import { Search, Music as MusicIcon, ListMusic, Heart } from 'lucide-react';
import { youtubeService, type YouTubeVideo, type YouTubePlaylist } from '../../services/youtubeService';

type View = { kind: 'search' } | { kind: 'playlist'; id: string; title: string } | { kind: 'liked' };

export function Music() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<View>({ kind: 'search' });
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const [nowPlaying, setNowPlaying] = useState<YouTubeVideo | null>(null);

  useEffect(() => {
    youtubeService
      .getStatus()
      .then(({ connected }) => {
        setConnected(connected);
        if (connected) youtubeService.getMyPlaylists().then(setPlaylists).catch(() => {});
      })
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const timer = setTimeout(() => {
      setView({ kind: 'search' });
      youtubeService
        .search(query)
        .then(setVideos)
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  async function openPlaylist(playlist: YouTubePlaylist) {
    setView({ kind: 'playlist', id: playlist.id, title: playlist.title });
    setLoadingVideos(true);
    try {
      setVideos(await youtubeService.getPlaylistItems(playlist.id));
    } finally {
      setLoadingVideos(false);
    }
  }

  async function openLiked() {
    setView({ kind: 'liked' });
    setLoadingVideos(true);
    try {
      setVideos(await youtubeService.getLiked());
    } finally {
      setLoadingVideos(false);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Music</h2>
        <p className="text-slate-500">Busque, ouça playlists e o que você curtiu no YouTube.</p>
        {connected === false && (
          <p className="text-xs text-slate-400 mt-1">
            Conecte sua conta em <span className="font-semibold text-slate-600">Configurações → Integrações</span> pra
            ver playlists e curtidos.
          </p>
        )}
      </header>

      {/* Player -- iframe do próprio YouTube, controles nativos (play/pause/
          volume/seek) já vêm prontos, sem precisar da IFrame Player API. */}
      <div className="mb-8 rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-video max-h-[28rem] flex items-center justify-center">
        {nowPlaying ? (
          <iframe
            key={nowPlaying.videoId}
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${nowPlaying.videoId}?autoplay=1`}
            title={nowPlaying.title}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-3">
            <MusicIcon size={40} />
            <p className="text-sm font-medium">Busque ou escolha algo pra tocar</p>
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar música, artista, clipe..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      {connected && playlists.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Suas playlists</p>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={openLiked}
              className={`shrink-0 w-32 text-left group ${view.kind === 'liked' ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
            >
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Heart size={28} className="text-white" fill="white" />
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-2 truncate">Curtidos</p>
            </button>
            {playlists.map((p) => (
              <button key={p.id} onClick={() => openPlaylist(p)} className="shrink-0 w-32 text-left group">
                <img
                  src={p.thumbnail}
                  alt={p.title}
                  className="w-32 h-32 rounded-2xl object-cover shadow-sm group-hover:shadow-md transition-shadow bg-slate-100"
                />
                <p className="text-xs font-semibold text-slate-700 mt-2 truncate">{p.title}</p>
                <p className="text-[11px] text-slate-400">{p.itemCount} vídeos</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
          {view.kind === 'search' && (
            <>
              <Search size={12} /> Resultados
            </>
          )}
          {view.kind === 'playlist' && (
            <>
              <ListMusic size={12} /> {view.title}
            </>
          )}
          {view.kind === 'liked' && (
            <>
              <Heart size={12} /> Curtidos
            </>
          )}
        </p>

        {(searching || loadingVideos) && <p className="text-xs text-slate-400">Carregando...</p>}
        {!searching && !loadingVideos && videos.length === 0 && (
          <p className="text-xs text-slate-400">
            {view.kind === 'search' ? 'Digite algo pra buscar.' : 'Nada por aqui ainda.'}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {videos.map((v) => (
            <button
              key={v.videoId}
              onClick={() => setNowPlaying(v)}
              className={`text-left group rounded-2xl overflow-hidden transition-shadow ${
                nowPlaying?.videoId === v.videoId ? 'ring-2 ring-slate-900' : ''
              }`}
            >
              <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover bg-slate-100" />
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{v.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{v.channel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
