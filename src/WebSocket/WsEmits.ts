import type { WsRequestPayload } from '../types/TypesApp/AppTypes';
import { socketService } from './WsConfig';

export const WsEmits = {
  getUserProfile() {
    const message: WsRequestPayload<Record<string, never>> = {
      entity: 'user',
      action: 'getUserProfile',
      payload: {},
    };
    socketService.send(message);
  },

  updateProfile(data: Record<string, unknown>) {
    const message: WsRequestPayload<Record<string, unknown>> = {
      entity: 'user',
      action: 'updateProfile',
      payload: data,
    };
    socketService.send(message);
  },
};