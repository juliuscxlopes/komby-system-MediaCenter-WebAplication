// src/pages/app/Plataforma.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { socketService, registerWsListener } from '../../WebSocket/WsConfig';
import { WsEmits } from '../../WebSocket/WsEmits';
import { SensorCard } from '../../components/SensorCard/SensorCard';
import { AlertPanel, type AlertItem } from '../../components/AlertPanel/AlertPanel';
import type { WsListenerPayloadMap } from '../../types/TypesApp/AppTypes';
import { ModalCompleteProfile } from '../../components/Auth/ModalCompleteUser';

export function Plataforma() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WsListenerPayloadMap['getUserProfile'] | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  useEffect(() => {
    socketService.connect();

    const handleOpen = () => setWsConnected(true);
    const handleClose = () => setWsConnected(false);

    socketService.ws?.addEventListener('open', handleOpen);
    socketService.ws?.addEventListener('close', handleClose);

    return () => {
      socketService.ws?.removeEventListener('open', handleOpen);
      socketService.ws?.removeEventListener('close', handleClose);
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!wsConnected) return;
    WsEmits.getUserProfile();
  }, [wsConnected]);

  useEffect(() => {
    registerWsListener('getUserProfile', (payload) => {
      setProfile(payload);
      if (payload && 'profileComplete' in payload && !payload.profileComplete) {
        setShowCompleteProfile(true);
      }
    });
  }, []);
  
  const handleProfileSubmit = (data: any) => {
    console.log("Dados do formulário:", data);
    // Aqui você chamaria seu WsEmits.saveProfile(data) ou similar
    setShowCompleteProfile(false); 
  };

  const alerts: AlertItem[] = [
    {
      id: 1,
      type: wsConnected ? 'info' : 'warning',
      title: 'Status',
      description: wsConnected ? 'Conectado ao DataCenter.' : 'Aguardando conexão com o DataCenter.',
    },
  ];

  return (
    <div className="h-full grid grid-cols-[1fr_350px] grid-rows-[auto_1fr_auto] gap-6">
      
      {/* Cabeçalho */}
      <div className="col-span-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Olá, {profile?.nome ?? user?.nome ?? 'condutor'}</h1>
        <span className={`text-xs font-semibold ${wsConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
          DataCenter: {wsConnected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      {/* Linha de Sensores */}
      <div className="col-span-2 flex gap-4">
        <SensorCard title="RPM" value={0} unit="RPM" status="normal" />
        <SensorCard title="CHT" value={0} unit="°C" status="normal" />
        <SensorCard title="VACUUM" value={0} unit="mmHg" status="normal" />
        <SensorCard title="OIL_P" value={0} unit="bar" status="normal" />
        <SensorCard title="OIL_T" value={0} unit="°C" status="normal" />
      </div>

      {/* Área Central: Mapa */}
      <div className="bg-slate-200 rounded-3xl border border-slate-200 overflow-hidden min-h-[400px]">
        {/* Adicione aqui seu componente de Mapa */}
        <div className="w-full h-full flex items-center justify-center text-slate-400">MAPA ATIVO</div>
      </div>

      {/* Sidebar Direita: Alertas + Spotify */}
      <div className="flex flex-col gap-6 h-full">
        <div className="flex-1 min-h-0">
          <AlertPanel alerts={alerts} />
        </div>
        <div className="h-[120px] bg-slate-950 rounded-3xl p-4 text-white flex items-center gap-4">
           {/* Componente Spotify Mini */}
           <div className="w-16 h-16 bg-slate-800 rounded-2xl" />
           <div>
             <p className="font-bold text-sm">Faixa Atual</p>
             <p className="text-slate-400 text-xs">Artista</p>
           </div>
        </div>
      </div>
      
      {/* 2. Renderização condicional do Modal */}
      {showCompleteProfile && (
        <ModalCompleteProfile 
          currentName={profile?.nome ?? user?.nome}
          onSubmit={handleProfileSubmit}
        />
      )}
    </div>
  );
}