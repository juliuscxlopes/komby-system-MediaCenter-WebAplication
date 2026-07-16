import Cookies from 'js-cookie';
import type { WsRequestPayload } from '../types/TypesApp/AppTypes';
import { socketService } from './WsConfig';

function getAuthToken() {
  return Cookies.get('web_appliance_token') || '';
}

export const WsEmits = {
  getUserProfile() {
    const message: WsRequestPayload<{ token: string }> = {
      entity: 'user',
      action: 'getUserProfile',
      payload: {
        token: getAuthToken(),
      },
    };

    socketService.send(message);
  },

  updateProfile(data: Record<string, unknown>) {
    const message: WsRequestPayload<Record<string, unknown>> = {
      entity: 'user',
      action: 'updateProfile',
      payload: {
        token: getAuthToken(),
        ...data,
      },
    };

    socketService.send(message);
  },
};
