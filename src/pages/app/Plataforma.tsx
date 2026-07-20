// src/pages/app/Plataforma.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { socketService } from '../../WebSocket/WsConfig';
import { registerWsListener } from '../../WebSocket/Rooms/WsRoomAuth';
import { WsListenersTelemetry, type SensorReading } from '../../WebSocket/Listeners/WsTelemetryListeners';
import { WsEmits } from '../../WebSocket/WsEmits';
import { SensorCard, type AlertStatus } from '../../components/SensorCard/SensorCard';
import { AlertPanel, type AlertItem } from '../../components/AlertPanel/AlertPanel';
import type { WsListenerPayloadMap } from '../../types/TypesApp/AppTypes';
import { ModalCompleteProfile } from '../../components/Auth/ModalCompleteUser';

// Normaliza o status cru do backend (kombi-core) pro union fechado do SensorCard.
// Qualquer coisa fora da lista cai em 'normal' — nunca quebra o componente.
function mapSensorStatus(rawStatus: string | undefined): AlertStatus {
  switch (rawStatus) {
    case 'ALERTA':
      return 'warning';
    case 'CRITICO':
      return 'critical';
    case 'NORMAL':
    default:
      return 'normal';
  }
}

export function Plataforma() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WsListenerPayloadMap['getUserProfile'] | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  // Estado individual por sensor — cada um isolado, fácil de debugar sozinho
  const [rpm, setRpm] = useState<SensorReading | null>(null);
  const [cht, setCht] = useState<SensorReading | null>(null);
  const [vacuum, setVacuum] = useState<SensorReading | null>(null);
  const [oilPressure, setOilPressure] = useState<SensorReading | null>(null);
  const [oilTemp, setOilTemp] = useState<SensorReading | null>(null);

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

  // Sala de telemetria — cada listener só cuida do próprio estado
  useEffect(() => {
    WsListenersTelemetry.onRpmUpdate((data) => {
      console.log('[Telemetry] RPM recebido:', data);
      setRpm(data);
    });
    WsListenersTelemetry.onChtUpdate((data) => {
      console.log('[Telemetry] CHT recebido:', data);
      setCht(data);
    });
    WsListenersTelemetry.onVacuumUpdate((data) => {
      console.log('[Telemetry] VACUUM recebido:', data);
      setVacuum(data);
    });
    WsListenersTelemetry.onOilPressureUpdate((data) => {
      console.log('[Telemetry] OIL_P recebido:', data);
      setOilPressure(data);
    });
    WsListenersTelemetry.onOilTemperatureUpdate((data) => {
      console.log('[Telemetry] OIL_T recebido:', data);
      setOilTemp(data);
    });
  }, []);

  const handleProfileSubmit = (data: { nome: string; telefone: string; password?: string }) => {
    WsEmits.updateProfile(data);
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

      <div className="col-span-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Olá, {profile?.nome ?? user?.nome ?? 'condutor'}</h1>
        <span className={`text-xs font-semibold ${wsConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
          DataCenter: {wsConnected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div className="col-span-2 flex gap-4">
        <SensorCard title="RPM" value={rpm?.value ?? 0} unit="RPM" status={mapSensorStatus(rpm?.status)} />
        <SensorCard title="CHT" value={cht?.value ?? 0} unit="°C" status={mapSensorStatus(cht?.status)} />
        <SensorCard title="VACUUM" value={vacuum?.value ?? 0} unit="mmHg" status={mapSensorStatus(vacuum?.status)} />
        <SensorCard title="OIL_P" value={oilPressure?.value ?? 0} unit="bar" status={mapSensorStatus(oilPressure?.status)} />
        <SensorCard title="OIL_T" value={oilTemp?.value ?? 0} unit="°C" status={mapSensorStatus(oilTemp?.status)} />
      </div>

      <div className="bg-slate-200 rounded-3xl border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="w-full h-full flex items-center justify-center text-slate-400">MAPA ATIVO</div>
      </div>

      <div className="flex flex-col gap-6 h-full">
        <div className="flex-1 min-h-0">
          <AlertPanel alerts={alerts} />
        </div>
        <div className="h-[120px] bg-slate-950 rounded-3xl p-4 text-white flex items-center gap-4">
           <div className="w-16 h-16 bg-slate-800 rounded-2xl" />
           <div>
             <p className="font-bold text-sm">Faixa Atual</p>
             <p className="text-slate-400 text-xs">Artista</p>
           </div>
        </div>
      </div>

      {showCompleteProfile && (
        <ModalCompleteProfile
          currentName={profile?.nome ?? user?.nome}
          onSubmit={handleProfileSubmit}
        />
      )}
    </div>
  );
}