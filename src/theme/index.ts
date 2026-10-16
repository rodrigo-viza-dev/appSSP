import { Platform } from 'react-native';

// Manual de Marca UNSA, pp. 11–12: RGB 94/21/29 y 20/30/66.
export const colors = {
  primary: '#5E151D', accent: '#5E151D', primarySoft: '#F4E9EB',
  navy: '#141E42', text: '#252124', muted: '#746D6A',
  background: '#FFFFFF', surface: '#F7F4F3', border: '#E7DFDC',
  success: '#356520', successSoft: '#EAF3E1',
  warning: '#89550D', warningSoft: '#FAEFD9', white: '#FFFFFF',
};
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
export function useTheme() { return { colors, mode: 'light' as const }; }
