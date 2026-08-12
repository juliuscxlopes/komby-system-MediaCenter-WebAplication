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

    // [AJUSTE] Antes despachava por um mapa de listeners próprio deste
    // arquivo (dispatchMessage/registerWsListener), que nada mais no projeto
    // usava -- quem os pages realmente chamam (WsAuthListeners/WsRoomAuth,
    // WsRoomTelemetry) registra no WsRouter, cujo `route()` nunca era
    // chamado daqui. As duas pontas existiam mas não estavam ligadas; agora
    // é um sistema só. Também não filtra mais por `message.action` antes de
    // rotear -- mensagens de telemetria chegam com `room`/`sensor`, sem
    // `action`, e eram descartadas aqui antes de chegar no WsRouter.
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
