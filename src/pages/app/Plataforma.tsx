// src/pages/app/Plataforma.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { socketService, registerWsListener } from '../../WebSocket/WsConfig';
import { WsEmits } from '../../WebSocket/WsEmits';
import { SensorCard } from '../../components/SensorCard/SensorCard';
import { AlertPanel, type AlertItem } from '../../components/AlertPanel/AlertPanel';
import type { WsListenerPayloadMap } from '../../types/TypesApp/AppTypes';

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

  const alerts: AlertItem[] = [
    {
      id: 1,
      type: wsConnected ? 'info' : 'warning',
      title: 'Status',
      description: wsConnected ? 'Conectado ao DataCenter.' : 'Aguardando conexão com o DataCenter.',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {profile?.nome ?? user?.nome ?? 'condutor'}
        </h1>
        <span className={`text-xs font-semibold ${wsConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
          DataCenter: {wsConnected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div className="flex gap-4 flex-wrap">
        <SensorCard title="RPM" value={0} unit="RPM" status="normal" />
        <SensorCard title="CHT" value={0} unit="°C" status="normal" />
        <SensorCard title="VACUUM" value={0} unit="mmHg" status="normal" />
        <SensorCard title="OIL_P" value={0} unit="bar" status="normal" />
        <SensorCard title="OIL_T" value={0} unit="°C" status="normal" />
      </div>

      <AlertPanel alerts={alerts} />

      {showCompleteProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Complete seu cadastro</h2>
            <p className="text-sm text-slate-500 mb-4">
              Precisamos do seu telefone pra continuar. (Modal completo — plugar aqui.)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}