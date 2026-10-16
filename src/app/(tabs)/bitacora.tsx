import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Header, Hours, Label, typography } from '@/components/ui';
import { usePractice } from '@/state/practice';
import { colors, serif } from '@/theme';

export default function LogScreen() {
  const { activities } = usePractice();
  const router = useRouter();
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const groups = [...new Set(sorted.map(item => item.date.slice(0, 7)))];
  const total = activities.reduce((sum, item) => sum + item.hours, 0);
  const validated = activities.filter(item => item.validated).reduce((sum, item) => sum + item.hours, 0);
  return <View style={{ flex: 1 }}><Header title="Mi bitácora" subtitle={`${activities.length} registros · 2026-I`} /><Screen>
    <Button title="+ Nueva actividad" secondary onPress={() => router.push('/nueva-actividad')} />
    {groups.map(group => <View key={group} style={{ gap: 12 }}><Label>{new Date(`${group}-01T12:00:00`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()}</Label>
      {sorted.filter(item => item.date.startsWith(group)).map(item => <View key={item.id} style={s.row}>
        <View style={s.date}><Text style={s.day}>{item.date.slice(8)}</Text><Text style={s.month}>{new Date(`${item.date}T12:00:00`).toLocaleDateString('es-PE', { month: 'short' })}</Text></View>
        <View style={{ flex: 1, gap: 8 }}><Text style={[typography.title, { fontSize: 14, lineHeight: 21 }]}>{item.description}</Text><Badge title={item.validated ? 'Validado' : 'Por validar'} tone={item.validated ? 'success' : 'warning'} /></View><Text style={s.hour}>{item.hours} h</Text>
      </View>)}
    </View>)}
    <View style={{ flex: 1, minHeight: 15 }} /><Hours total={total} validated={validated} />
  </Screen></View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', gap: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, date: { width: 35, alignItems: 'center' }, day: { fontFamily: serif, fontSize: 25, color: colors.primary }, month: { fontSize: 10, color: colors.muted, marginTop: 3 }, hour: { color: colors.primary, fontWeight: '600', fontSize: 13, paddingTop: 4 } });
