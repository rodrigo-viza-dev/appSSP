import { AuthProvider, useAuth } from '@/state/auth';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { PracticeProvider, usePractice } from '@/state/practice';
import { NotificationsProvider } from '@/state/notificaciones';

function Navigation() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { demo } = usePractice();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!session && !demo}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!!session}><Stack.Screen name="panel" /><Stack.Screen name="mis-avisos" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ADMIN'}><Stack.Screen name="auditoria" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ALUMNO' || session?.user.role === 'SUPERVISOR'}><Stack.Screen name="mis-horas" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ALUMNO'}>
      <Stack.Screen name="aula" />
      <Stack.Screen name="tarea" />
      <Stack.Screen name="centro" />
    </Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN'}>
      <Stack.Screen name="docencia" />
      <Stack.Screen name="tareas-docente" />
      <Stack.Screen name="aula-docente" />
      <Stack.Screen name="revisar-entrega" />
      <Stack.Screen name="asistencia-docente" />
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
      <AuthProvider><NotificationsProvider><PracticeProvider>
        <StatusBar style="light" />
        <Navigation />
      </PracticeProvider></NotificationsProvider></AuthProvider>
    </SafeAreaProvider>
  );
}
