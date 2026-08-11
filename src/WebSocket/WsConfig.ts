import type { WsRequestPayload, WsAction, WsListenerPayloadMap } from '../types/TypesApp/AppTypes';

type WsResponseMessage = {
  status: 'success' | 'error';
  entity?: string;
  action?: string;
  data?: unknown;
  message?: string;
  errorCode?: string;
};

type ListenerFn = (payload: unknown) => void;

const DATA_CENTER_WS_URL = import.meta.env.VITE_DATACENTER_WS_URL || 'ws://localhost:8080';
const listeners: Record<WsAction, ListenerFn[]> = {
  getUserProfile: [],
  ResUserData: [],
  updateProfile: [],
  updateContactRequired: [],
  registrationFinalized: [],
};

function dispatchMessage(action: WsAction, payload: unknown) {
  const callbacks = listeners[action] || [];
  callbacks.forEach((callback) => {
    try {
      callback(payload);
    } catch (err) {
      console.error('[WS] Erro no listener:', err);
    }
  });
}

export const socketService = {
  ws: null as WebSocket | null,

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(DATA_CENTER_WS_URL);

    this.ws.addEventListener('open', () => {
      console.info('[WS] Conectado ao DataCenter');
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WsResponseMessage;
        if (!message?.action) {
          return;
        }
        dispatchMessage(message.action as WsAction, message.data);
      } catch (error) {
        console.error('[WS] Falha ao processar mensagem do DataCenter:', error);
      }
    });

    this.ws.addEventListener('close', () => {
      console.warn('[WS] Conexão com o DataCenter encerrada.');
    });

    this.ws.addEventListener('error', (error) => {
      console.error('[WS] Erro de socket no DataCenter:', error);
    });
  },

  disconnect() {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  },

  send(message: WsRequestPayload) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify(message));
  },
};

export function registerWsListener<Action extends WsAction>(
  action: Action,
  callback: (payload: WsListenerPayloadMap[Action]) => void,
) {
  if (!listeners[action]) {
    listeners[action] = [];
  }
  listeners[action].push(callback as ListenerFn);
}
