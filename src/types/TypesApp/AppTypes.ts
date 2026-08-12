// src/types/TypesApp/AppTypes.ts

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string;
  telefone: string;
  profileComplete: boolean;
}

export type WsEntity = 'user' | 'telemetry' | 'engine' | 'gps';

// [AJUSTE] `ResUserData` saiu -- era o nome que o front esperava pra
// resposta de getUserProfile, mas o DataCenter nunca manda essa action; ele
// ecoa a action do próprio request (`action: 'getUserProfile'`). `getUserProfile`
// já cobre os dois lados (pedido e resposta), então não precisa de um nome à parte.
export interface WsListenerPayloadMap {
  getUserProfile: UserProfile;
  updateProfile: Record<string, unknown>;
  updateContactRequired: void;
  registrationFinalized: UserProfile;
}

export type WsAction = keyof WsListenerPayloadMap;

export interface WsResponsePayload<T> {
  entity: string;
  action: string;
  status: 'success' | 'error';
  data: T;
  message?: string;
}

// Transformamos em Generic para aceitar tipos específicos sem perder a tipagem
export interface WsRequestPayload<T = Record<string, unknown>> {
  entity: WsEntity;
  action: WsAction;
  payload: T;
}
