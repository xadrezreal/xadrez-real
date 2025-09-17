import { createContext } from 'react';

export const BoardThemeContext = createContext({
  boardTheme: 'classic',
  setBoardTheme: () => {},
});