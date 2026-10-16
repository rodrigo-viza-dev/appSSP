import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Header, typography } from '@/components/ui';
import { usePractice } from '@/state/practice';
import { colors } from '@/theme';

export default function NoticesScreen() {
  const { notices, markRead } = usePractice();
  const unread = notices.filter(item => !item.read).length;
  return <View style={{ flex: 1 }}><Header title="Avisos" subtitle={unread ? `${unread} sin leer` : 'Todos tus avisos al día'} /><Screen>
    <Text style={[typography.body, { fontSize: 12 }]}>Toca un aviso para marcarlo como leído.</Text>
    <View>{notices.map(notice => <Pressable key={notice.id} accessibilityRole="button" accessibilityLabel={`${notice.title}. ${notice.body}. ${notice.read ? 'Leído' : 'Sin leer'}`} onPress={() => markRead(notice.id)} style={({ pressed }) => [s.notice, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={[s.dot, { backgroundColor: notice.read ? colors.border : notice.tone === 'success' ? colors.success : notice.tone === 'warning' ? colors.warning : colors.primary }]} /><View style={{ flex: 1, gap: 6 }}><Text style={[typography.title, { fontSize: 14 }]}>{notice.title}</Text><Text style={typography.body}>{notice.body}</Text><Text style={s.status}>{notice.read ? 'Leído' : 'Nuevo'}</Text></View>
    </Pressable>)}</View>
  </Screen></View>;
}
const s = StyleSheet.create({ notice: { flexDirection: 'row', gap: 13, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.border }, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 }, status: { fontSize: 10, color: colors.muted } });
