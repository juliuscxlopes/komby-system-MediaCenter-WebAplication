import type { UserProfile } from '../../types/TypesApp/AppTypes';
import { registerWsListener } from '../Rooms/WsRoomAuth';

export const WsListeners = {
  // [AJUSTE] Era 'ResUserData' -- o DataCenter responde ecoando a action do
  // request ('getUserProfile'), nunca manda 'ResUserData'. Esse listener
  // nunca disparava com dado real.
  onUserProfileLoaded(callback: (profile: UserProfile) => void) {
    registerWsListener('getUserProfile', callback);
  },

  onUpdateContactRequired(callback: () => void) {
    registerWsListener('updateContactRequired', callback);
  },

  onRegistrationFinalized(callback: (profile: UserProfile) => void) {
    registerWsListener('registrationFinalized', callback);
  },
};
