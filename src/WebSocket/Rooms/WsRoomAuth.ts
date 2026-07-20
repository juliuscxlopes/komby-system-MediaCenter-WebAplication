import type { WsAction, WsListenerPayloadMap } from '../../types/TypesApp/AppTypes';
import { WsRouter } from '../WsRouter';

type ListenerFn = (payload: unknown) => void;

const listeners: Record<WsAction, ListenerFn[]> = {
  getUserProfile: [],
  ResUserData: [],
  updateProfile: [],
  updateContactRequired: [],
  registrationFinalized: [],
};

WsRouter.onRoom('auth', (message) => {
  const action = message.action as WsAction | undefined;
  if (!action) return;
  const callbacks = listeners[action] || [];
  callbacks.forEach((cb) => cb(message.data));
});

export function registerWsListener<Action extends WsAction>(
  action: Action,
  callback: (payload: WsListenerPayloadMap[Action]) => void,
) {
  if (!listeners[action]) listeners[action] = [];
  listeners[action].push(callback as ListenerFn);
}