// src/components/Settings/IntegrationsSection.tsx
//
// Conexões com serviços externos -- hoje só YouTube (playlists/curtidos
// pra aba Music, ver youtubeService.ts). Consentimento incremental à
// parte do login do app, por isso mora em Configurações e não na Music.
import { useEffect, useState } from 'react';
import { Youtube, CheckCircle2 } from 'lucide-react';
import { youtubeService } from '../../services/youtubeService';

export function IntegrationsSection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    youtubeService
      .getStatus()
      .then(({ connected }) => setConnected(connected))
      .catch(() => setConnected(false));
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      await youtubeService.connect();
      const { connected } = await youtubeService.getStatus();
      setConnected(connected);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <Youtube size={20} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">YouTube</p>
          <p className="text-xs text-slate-400">Playlists e vídeos curtidos na aba Music.</p>
        </div>
      </div>

      {connected === true ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={14} /> Conectado
        </span>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting || connected === null}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {connecting ? 'Conectando...' : 'Conectar'}
        </button>
      )}
    </div>
  );
}
