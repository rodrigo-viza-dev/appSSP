import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Header, Hours, Label, typography } from '@/components/ui';
import { usePractice } from '@/state/practice';
import { colors } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { activities, logout } = usePractice();
  const total = activities.reduce((sum, item) => sum + item.hours, 0);
  const validated = activities.filter(item => item.validated).reduce((sum, item) => sum + item.hours, 0);
  return <View style={{ flex: 1 }}><Header title="Hola, Piero" subtitle="Prácticas Pre-Profesionales I · 2026-I" /><Screen>
    <Badge title="Vista de demostración" tone="neutral" />
    <Hours total={total} validated={validated} />
    <Card><Label>CENTRO DE PRÁCTICAS</Label><Text style={typography.title}>Radio Yaraví S.A.C.</Text><Text style={typography.body}>Supervisora: Marisol Chávez</Text></Card>
    <Card><Label>PRÓXIMA ENTREGA</Label><Text style={typography.title}>Informe Semanal N.° 9</Text><Badge title="Entrega pendiente" tone="warning" /></Card>
    <Button title="Marcar asistencia" onPress={() => router.push('/(tabs)/asistencia')} />
    <Button title="Registrar nueva actividad" secondary onPress={() => router.push('/nueva-actividad')} />
    <View style={{ flex: 1 }} />
    <Pressable accessibilityRole="button" onPress={() => { logout(); router.replace('/'); }} style={{ padding: 12, alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 12 }}>Salir de la demo</Text></Pressable>
  </Screen></View>;
}
