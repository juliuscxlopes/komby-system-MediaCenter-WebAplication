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

export interface WsListenerPayloadMap {
  getUserProfile: { token: string };
  ResUserData: UserProfile;
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
