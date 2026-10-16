import { Redirect, Tabs } from 'expo-router';
import { TabIcon } from '@/components/ui';
import { colors } from '@/theme';
import { usePractice } from '@/state/practice';

export default function TabsLayout() {
  const { demo, notices } = usePractice();
  if (!demo) return <Redirect href="/" />;
  const unread = notices.filter(notice => !notice.read).length;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 10, marginTop: 3 }, sceneStyle: { backgroundColor: colors.white } }}>
    <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
    <Tabs.Screen name="asistencia" options={{ title: 'Asistencia', tabBarIcon: ({ color }) => <TabIcon name="clock" color={color} /> }} />
    <Tabs.Screen name="bitacora" options={{ title: 'Bitácora', tabBarIcon: ({ color }) => <TabIcon name="book" color={color} /> }} />
    <Tabs.Screen name="avisos" options={{ title: 'Avisos', tabBarBadge: unread || undefined, tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10 }, tabBarIcon: ({ color }) => <TabIcon name="bell" color={color} /> }} />
  </Tabs>;
}
