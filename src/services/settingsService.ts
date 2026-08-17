// src/services/settingsService.ts
//
// Tela de configurações (modal no rodapé do sidebar). Sistema é de 1
// veículo só -- sem :id nas rotas, o backend resolve veículo/motor ativos
// direto (ver SettingsController.js).
const API_URL = import.meta.env.VITE_API_URL || '';

export interface VehicleConfig {
  id: string;
  nome_apelido: string;
  marca_modelo_ano?: string;
  placa?: string;
  chassi?: string;
  cor?: string;
  peso_vazio_kg?: number;
  capacidade_carga_kg?: number;
  tipo_refrigeracao?: string;
  odometro_km?: number;
  marker_icon?: string; // 'arrow' | 'van' | 'car' -- avatar do veículo no mapa ao vivo
  marker_color?: string; // hex
}

export interface EngineConfig {
  id: string;
  codigo_motor?: string;
  cilindrada_cc?: number;
  Hp_Horses?: string;
  Capacidade_Oleo_L?: number;
  viscosidade_oleo?: string;
  combustivel?: string;
  Capacidade_Combustivel_L?: number;
  bore_stroke?: string;
  sistema_escape?: string;
}

export interface UsageConfig {
  pneu_frente_psi?: number;
  pneu_tras_psi?: number;
  viscosidade_oleo?: string;
  intervalo_oleo_km?: number;
  alerta_revisao_antes_km?: number;
}

export interface SensorLimit {
  sensor_name?: string;
  unit?: string;
  description?: string;
  frio_max?: number;
  nominal_min?: number;
  nominal_max?: number;
  alerta_threshold?: number;
  critico_threshold?: number;
  carga_alta?: number;
  rica_threshold?: number;
  alerta_rico_threshold?: number;
  critico_rico_threshold?: number;
  alerta_pobre_threshold?: number;
  critico_pobre_threshold?: number;
  critico_baixo?: number;
  alerta_baixo?: number;
  alerta_alto?: number;
  critico_alto?: number;
  cracking_min?: number;
  cracking_max?: number;
  partida_min?: number;
  partida_max?: number;
  marcha_lenta_min?: number;
  marcha_lenta_max?: number;
}

export interface EngineMap {
  axisX: number[];
  axisY: number[];
  table: number[][];
}

export interface TripSpecs {
  movingSpeedKmh: number;
  movingSustainMs: number;
  idleSustainMs: number;
  minSatellites: number;
  maxHdop: number;
  maxPlausibleKmh: number;
  accumulateIntervalMs: number;
  joltThresholdG: number;
  joltDebounceMs: number;
}

export interface SettingsBundle {
  vehicle: VehicleConfig;
  engine: EngineConfig | null;
  usage: UsageConfig | null;
  sensorLimits: Record<string, SensorLimit>;
  engineMaps: Record<string, EngineMap>;
  tripSpecs: TripSpecs;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Falha na requisição (${response.status})`);
  }

  return response.json();
}

export const settingsService = {
  getAll: () => request<SettingsBundle>('/settings'),

  updateVehicle: (data: Partial<VehicleConfig>) =>
    request<VehicleConfig>('/settings/vehicle', { method: 'PUT', body: JSON.stringify(data) }),

  // Endpoint separado de propósito -- só ele pode tocar em odometro_km, e só
  // pra cima (backend rejeita valor menor que o atual).
  updateOdometer: (km: number) =>
    request<VehicleConfig>('/settings/vehicle/odometer', { method: 'PUT', body: JSON.stringify({ km }) }),

  updateEngine: (data: Partial<EngineConfig>) =>
    request<EngineConfig>('/settings/engine', { method: 'PUT', body: JSON.stringify(data) }),

  updateUsage: (data: Partial<UsageConfig>) =>
    request<UsageConfig>('/settings/usage', { method: 'PUT', body: JSON.stringify(data) }),

  updateSensorLimit: (sensorName: string, data: Partial<SensorLimit>) =>
    request<Record<string, SensorLimit>>(`/settings/sensor-limits/${sensorName}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateEngineMap: (mapType: string, table: number[][]) =>
    request<EngineMap>(`/settings/engine-maps/${mapType}`, { method: 'PUT', body: JSON.stringify({ table }) }),

  updateTripSpecs: (data: Partial<TripSpecs>) =>
    request<TripSpecs>('/settings/trip-specs', { method: 'PUT', body: JSON.stringify(data) }),
};
