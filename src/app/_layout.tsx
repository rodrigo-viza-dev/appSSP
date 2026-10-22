import { AuthProvider, useAuth } from '@/state/auth';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { PracticeProvider, usePractice } from '@/state/practice';
import { NotificationsProvider } from '@/state/notificaciones';
import { Text, View } from 'react-native';
import { Button, typography } from '@/components/ui';

function Navigation() {
  const { colors } = useTheme();
  const { session, restoring, restoreError, restore, signOut } = useAuth();
  const { demo } = usePractice();
  if (restoring || restoreError) return <View style={{ flex: 1, padding: 28, justifyContent: 'center', gap: 20, backgroundColor: colors.background }}>
    <Text style={typography.body}>{restoring ? 'Comprobando tu sesión…' : restoreError}</Text>
    {!!restoreError && <><Button title="Reintentar conexión" onPress={() => void restore()} /><Button title="Ingresar con otra cuenta" secondary onPress={() => signOut()} /></>}
  </View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!session && !demo}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!!session}><Stack.Screen name="panel" /><Stack.Screen name="mis-avisos" /><Stack.Screen name="metas" /><Stack.Screen name="guia" /><Stack.Screen name="expedientes" /><Stack.Screen name="expediente" /></Stack.Protected>
    <Stack.Protected guard={!!session && session.user.role !== 'SUPERVISOR'}><Stack.Screen name="comunidad" /><Stack.Screen name="foro" /><Stack.Screen name="documentos" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ADMIN'}><Stack.Screen name="auditoria" /><Stack.Screen name="administracion" /><Stack.Screen name="administrar-aula" /><Stack.Screen name="reportes" /><Stack.Screen name="asignaciones" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ALUMNO' || session?.user.role === 'PROFESOR'}><Stack.Screen name="mensajes" /><Stack.Screen name="conversacion" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ALUMNO' || session?.user.role === 'SUPERVISOR'}><Stack.Screen name="mis-horas" /></Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'ALUMNO'}>
      <Stack.Screen name="aula" />
      <Stack.Screen name="tarea" />
      <Stack.Screen name="centro" />
      <Stack.Screen name="borradores" />
    </Stack.Protected>
    <Stack.Protected guard={session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN'}>
      <Stack.Screen name="docencia" />
      <Stack.Screen name="tareas-docente" />
      <Stack.Screen name="aula-docente" />
      <Stack.Screen name="revisar-entrega" />
      <Stack.Screen name="asistencia-docente" />
      <Stack.Screen name="seguimiento" />
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
