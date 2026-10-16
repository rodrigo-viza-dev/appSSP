import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { useNotifications } from '@/state/notificaciones';
import { colors } from '@/theme';
import { academicDate } from '@/utils/date';

export default function MisAvisosScreen() {
  const router = useRouter();
  const notifications = useNotifications();
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'leidos'>('todos');
  const items = notifications.items?.filter(item => filter === 'todos' || (filter === 'leidos' ? item.leida : !item.leida));
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  return <View style={s.root}>
    <Header title="Mis avisos" subtitle="Tu actividad en el SSP" back={back} />
    <Screen>
      <QueryFeedback loading={notifications.loading} error={notifications.error} retry={notifications.refresh} notFound="La bandeja de avisos no está disponible." />
      {notifications.items && <>
        <Text accessibilityLiveRegion="polite" style={typography.title}>{notifications.unread === 1 ? '1 aviso sin leer' : `${notifications.unread} avisos sin leer`}</Text>
        <View style={s.filters}>
          {(['todos', 'pendientes', 'leidos'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.filter, filter === value && s.selected]}>
            <Text style={[s.filterText, filter === value && s.selectedText]}>{value === 'todos' ? 'Todos' : value === 'pendientes' ? 'Sin leer' : 'Leídos'}</Text>
          </Pressable>)}
        </View>
        {!!notifications.mutationError && <Text accessibilityRole="alert" style={typography.error}>{notifications.mutationError}</Text>}
        {!!notifications.notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notifications.notice}</Text>}
        {notifications.unread !== 0 && <Button title={notifications.busy && notifications.target === null ? 'Marcando avisos…' : 'Marcar todos como leídos'} secondary disabled={notifications.busy} onPress={() => { void notifications.markRead(); }} />}
        {items?.length === 0 && <Card><Text style={typography.body}>{notifications.items.length === 0 ? 'Aún no tienes avisos en tu cuenta.' : filter === 'pendientes' ? 'No tienes avisos sin leer.' : 'No hay avisos en este filtro.'}</Text></Card>}
        {items?.map(item => <Card key={item.id}>
          <View style={s.tags}><Badge title={item.tipo === 'TAREA_ASIGNADA' ? 'Nueva tarea' : item.tipo === 'VENCIMIENTO' ? 'Vencimiento' : 'Aviso'} tone="neutral" /><Badge title={item.leida ? 'Leído' : 'Sin leer'} tone={item.leida ? 'neutral' : 'warning'} /></View>
          <Text accessibilityRole="header" style={typography.title}>{item.titulo}</Text><Text style={typography.body}>{item.mensaje}</Text>
          <Text style={s.date}>{academicDate(item.fecha, 'Fecha no disponible')} · hora de Lima</Text>
          {!item.leida && <Button title={notifications.busy && notifications.target === item.id ? 'Marcando aviso…' : `Marcar como leído: ${item.titulo}`} secondary disabled={notifications.busy} onPress={() => { void notifications.markRead(item); }} />}
        </Card>)}
      </>}
      <Text style={typography.body}>Actualiza la bandeja para consultar nuevos avisos.</Text>
      <Button title="Actualizar avisos" secondary disabled={notifications.loading || notifications.busy} onPress={notifications.refresh} />
    </Screen>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white }, filters: { flexDirection: 'row', gap: 8 },
  filter: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 10 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { color: colors.primary, fontSize: 14, fontWeight: '600' }, selectedText: { color: colors.white },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, date: { fontSize: 12, lineHeight: 18, color: colors.muted },
});
