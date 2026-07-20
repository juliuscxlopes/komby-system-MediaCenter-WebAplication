import type { UserProfile } from '../../types/TypesApp/AppTypes';
import { registerWsListener } from '../Rooms/WsRoomAuth';

export const WsListeners = {
  onUserProfileLoaded(callback: (profile: UserProfile) => void) {
    registerWsListener('ResUserData', callback);
  },

  onUpdateContactRequired(callback: () => void) {
    registerWsListener('updateContactRequired', callback);
  },

  onRegistrationFinalized(callback: (profile: UserProfile) => void) {
    registerWsListener('registrationFinalized', callback);
  },
};
