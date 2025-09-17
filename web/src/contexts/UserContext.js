import { createContext } from 'react';

export const UserContext = createContext({
  user: {
    id: null,
    name: 'Convidado',
    isPremium: false,
    isChampion: false,
    balance: 0,
    titles: 0,
    isRegistered: false,
    status: 'offline',
    currentGameId: null,
    phone: null,
  },
  setUser: () => {},
});