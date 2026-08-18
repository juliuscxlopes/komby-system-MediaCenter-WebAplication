// src/services/peopleService.ts
//
// Pessoas cadastradas + quem está a bordo agora (toggle manual, versão 1 --
// detecção automática por WiFi fica pra uma fase futura). Peso total
// estimado = peso vazio do veículo + soma dos embarcados.
const API_URL = import.meta.env.VITE_API_URL || '';

export interface Person {
  id: string;
  name: string;
  avg_weight_kg: number;
  phone: string | null;
  currently_onboard: boolean;
  boarded_at: string | null;
  avatar_url: string | null;
  avatar_id: string | null;
}

export interface GoogleProfile {
  name: string;
  email: string | null;
  avatar_url: string | null;
  avatar_id: string | null;
}

export interface OnboardSummary {
  onboard: Person[];
  peopleWeightKg: number;
  emptyWeightKg: number;
  totalEstimatedKg: number;
  capacityKg: number | null;
  overCapacity: boolean;
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

  return response.status === 204 ? (null as T) : response.json();
}

interface PersonInput {
  name: string;
  avg_weight_kg?: number;
  phone?: string;
  avatar_url?: string | null;
  avatar_id?: string | null;
}

export const peopleService = {
  list: () => request<Person[]>('/people'),
  create: (data: PersonInput) => request<Person>('/people', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: PersonInput) => request<Person>(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<null>(`/people/${id}`, { method: 'DELETE' }),
  board: (id: string) => request<Person>(`/people/${id}/board`, { method: 'POST' }),
  unboard: (id: string) => request<Person>(`/people/${id}/unboard`, { method: 'POST' }),
  getOnboardSummary: () => request<OnboardSummary>('/people/onboard-summary'),

  // Popup + postMessage, mesmo padrão de youtubeService.connect() -- não
  // gera sessão nem guarda token, só devolve o perfil (nome/foto) pro modal
  // de cadastro pré-preencher.
  connectGoogle(): Promise<GoogleProfile> {
    const width = 480;
    const height = 640;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    return new Promise((resolve, reject) => {
      function handleMessage(event: MessageEvent) {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'PERSON_GOOGLE_PROFILE') {
          window.removeEventListener('message', handleMessage);
          resolve(event.data.profile as GoogleProfile);
        }
      }
      window.addEventListener('message', handleMessage);

      fetch(`${API_URL}/auth/person-google`, { credentials: 'include' })
        .then((r) => r.json())
        .then(({ url }) => {
          window.open(url, 'PersonGoogleConnect', `width=${width},height=${height},top=${top},left=${left}`);
        })
        .catch((err) => {
          window.removeEventListener('message', handleMessage);
          reject(err);
        });
    });
  },
};
