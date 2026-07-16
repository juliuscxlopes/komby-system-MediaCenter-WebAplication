import { useState, useEffect } from 'react';
import type { AlertStatus } from '../../components/SensorCard/SensorCard';
import { SensorCard } from '../../components/SensorCard/SensorCard';
import { AlertPanel, type AlertItem } from '../../components/AlertPanel/AlertPanel';
// Importe seu menu lateral posteriormente aqui: import { SideMenu } from '../../components/SideMenu/SideMenu';

// Estrutura de dados que espelha o que vem do Redis via WebSocket
interface TelemetryData {
  RPM: number;
  CHT: number;
  VACCUM: number;
  OIL_P: number;
  OIL_T: number;
}

type SensorName = 'RPM' | 'CHT' | 'VACUUM' | 'OIL_PRESSURE' | 'OIL_TEMP';

interface SensorPayload {
  value?: number;
  status?: string;
  ts?: number;
  [key: string]: unknown;
}

type AnalyticsMessage = Partial<Record<SensorName, SensorPayload>>;

const sensorMap: Record<SensorName, keyof TelemetryData> = {
  RPM: 'RPM',
  CHT: 'CHT',
  VACUUM: 'VACCUM',
  OIL_PRESSURE: 'OIL_P',
  OIL_TEMP: 'OIL_T',
};

export default function Home() {
  // Estado dos 5 sensores principais da Kombi
  const [sensors, setSensors] = useState<TelemetryData>({
    RPM: 0,
    CHT: 0,
    VACCUM: 0,
    OIL_P: 0,
    OIL_T: 0,
  });

  // Estado da lista de alertas na direita
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Simulação de Lógica de Cores (Faixas de alerta)
  // Você pode mover essa função para o Backend (Node/Go) se preferir que ele mande a cor pronta, 
  // ou deixar o Front-End calcular baseado nos limites do motor boxer.
  const getStatusForSensor = (sensorName: string, value: number): AlertStatus => {
    if (sensorName === 'OIL_P' && value < 1.5) return 'critical'; // Ex: pressão muito baixa
    if (sensorName === 'CHT' && value > 105) return 'warning';    // Ex: cabeçote esquentando
    return 'normal';
  };

  const ANALYTICS_WS_URL = import.meta.env.VITE_ANALYTICS_WS_URL;
  const [telemetryConnected, setTelemetryConnected] = useState(false);

  useEffect(() => {
    if (!ANALYTICS_WS_URL) {
      console.warn('[Home] VITE_ANALYTICS_WS_URL não configurado. Usando mock local.');
      return undefined;
    }

    const ws = new WebSocket(ANALYTICS_WS_URL);

    ws.onopen = () => {
      console.info('[Home] Conectado ao Analytics WS.');
      setTelemetryConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const incomingData = JSON.parse(event.data) as AnalyticsMessage;
        const sensorName = Object.keys(incomingData)[0] as SensorName | undefined;
        const payload = sensorName ? incomingData[sensorName] : undefined;

        if (!sensorName || !payload || typeof payload !== 'object') return;

        const stateKey = sensorMap[sensorName];

        setSensors((current) => ({
          ...current,
          [stateKey]: Number(payload.value ?? current[stateKey]),
        }));
      } catch (err) {
        console.error('[Home] Erro ao processar mensagem de telemetria:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('[Home] Erro no socket de telemetria:', event);
    };

    ws.onclose = () => {
      console.warn('[Home] Conexão de telemetria fechada.');
      setTelemetryConnected(false);
    };

    return () => ws.close();
  }, [ANALYTICS_WS_URL]);

  useEffect(() => {
    if (telemetryConnected) {
      return undefined;
    }

    const interval = setInterval(() => {
      setSensors({
        RPM: Math.floor(Math.random() * (3000 - 1800) + 1800),
        CHT: Math.floor(Math.random() * (108 - 90) + 90),
        VACCUM: Math.floor(Math.random() * (160 - 120) + 120),
        OIL_P: parseFloat((Math.random() * (3.5 - 2.0) + 2.0).toFixed(1)),
        OIL_T: Math.floor(Math.random() * (115 - 95) + 95),
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [telemetryConnected]);

  useEffect(() => {
    setAlerts([
      {
        id: 1,
        type: sensors.OIL_P < 1.5 ? 'critical' : sensors.OIL_P < 2.0 ? 'warning' : 'info',
        title: 'OIL_P',
        description: `Pressão do óleo atual: ${sensors.OIL_P.toFixed(1)} bar`,
      },
      {
        id: 2,
        type: sensors.CHT > 105 ? 'critical' : sensors.CHT > 100 ? 'warning' : 'info',
        title: 'CHT',
        description: `Temperatura do cabeçote: ${sensors.CHT} °C`,
      },
      {
        id: 3,
        type: 'info',
        title: 'Status',
        description: telemetryConnected ? 'Recebendo telemetria em tempo real.' : 'Aguardando conexão de telemetria.',
      },
    ]);
  }, [sensors, telemetryConnected]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#111827', overflow: 'hidden' }}>
      
      {/* Menu Fixo Esquerdo (Seu desenho) */}
      <div style={{ width: '80px', backgroundColor: '#1f2937', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '20px' }}>
        <span style={{ fontSize: '1.8rem' }}>🏠</span>
        <span style={{ fontSize: '1.8rem' }}>🎵</span>
        <span style={{ fontSize: '1.8rem' }}>📍</span>
      </div>

      {/* Conteúdo Central */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Barra superior (Título HOME e Grade de Sensores) */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <h1 style={{ color: 'white', margin: 0, textAlign: 'center', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '0.1em' }}>HOME</h1>
          
          {/* A Grade dos Quadrados dos Sensores em linha (conforme conversamos) */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <SensorCard 
              title="RPM" 
              value={sensors.RPM} 
              unit="RPM" 
              status={getStatusForSensor('RPM', sensors.RPM)} 
            />
            <SensorCard 
              title="CHT" 
              value={sensors.CHT} 
              unit="°C" 
              status={getStatusForSensor('CHT', sensors.CHT)} 
            />
            <SensorCard 
              title="VACCUM" 
              value={sensors.VACCUM} 
              unit="mmHg" 
              status={getStatusForSensor('VACCUM', sensors.VACCUM)} 
            />
            <SensorCard 
              title="OIL_P" 
              value={sensors.OIL_P} 
              unit="bar" 
              status={getStatusForSensor('OIL_P', sensors.OIL_P)} 
            />
            <SensorCard 
              title="OIL_T" 
              value={sensors.OIL_T} 
              unit="°C" 
              status={getStatusForSensor('OIL_T', sensors.OIL_T)} 
            />
          </div>

        </div>

        {/* Área Central Inferior - Espaço para Mapa ou Música */}
        <div style={{ flex: 1, margin: '0 20px 20px 20px', backgroundColor: '#374151', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#1f2937', padding: '10px', textAlign: 'center', color: 'white', fontWeight: 500 }}>
            FUNÇÃO CENTRAL - MAPA ou MÚSICA
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9ca3af' }}>
            [Simulação de Mapa ou App de Música]
          </div>
        </div>

      </div>

      {/* Painel lateral direito de Alertas */}
      <AlertPanel alerts={alerts} />

    </div>
  );
}