import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { PracticeProvider } from '@/state/practice';

export default function RootLayout() {
  const { colors } = useTheme();

  return (
    <SafeAreaProvider>
      <PracticeProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </PracticeProvider>
    </SafeAreaProvider>
  );
}
