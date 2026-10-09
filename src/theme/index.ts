import { useColorScheme } from 'react-native';

// Paleta provisional: se sustituirá al revisar los mockups.
const palettes = {
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#172339',
    muted: '#56647A',
    accent: '#245EDB',
    border: '#DCE3ED',
  },
  dark: {
    background: '#101722',
    surface: '#1B2636',
    text: '#F4F7FC',
    muted: '#B5C0D1',
    accent: '#90B5FF',
    border: '#36455A',
  },
};

export function useTheme() {
  const mode = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: palettes[mode], mode };
}
