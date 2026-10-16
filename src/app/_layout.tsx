import { AuthProvider, useAuth } from '@/state/auth';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { PracticeProvider, usePractice } from '@/state/practice';

function Navigation() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { demo } = usePractice();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!session && !demo}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!!session}><Stack.Screen name="panel" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ALUMNO'}>
      <Stack.Screen name="aula" />
      <Stack.Screen name="tarea" />
      <Stack.Screen name="centro" />
    </Stack.Protected>
    <Stack.Protected guard={demo && !session}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="nueva-actividad" />
    </Stack.Protected>
  </Stack>;
}

export default function RootLayout() {

  return (
    <SafeAreaProvider>
      <AuthProvider><PracticeProvider>
        <StatusBar style="light" />
        <Navigation />
      </PracticeProvider></AuthProvider>
    </SafeAreaProvider>
  );
}
