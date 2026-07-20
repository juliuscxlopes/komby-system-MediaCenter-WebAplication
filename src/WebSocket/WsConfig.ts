import type { WsRequestPayload } from '../types/TypesApp/AppTypes';
import { WsRouter } from './WsRouter';

const DATA_CENTER_WS_URL = import.meta.env.VITE_DATACENTER_WS_URL || 'ws://localhost:8080';

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
        const message = JSON.parse(event.data);
        WsRouter.route(message);
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