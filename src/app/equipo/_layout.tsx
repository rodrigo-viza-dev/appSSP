import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/state/auth';
import { useNotifications } from '@/state/notificaciones';
import { isStaff, staffLabels } from '@/features/shared/navigation-map';
import { StudentAppearance, studentColors as c } from '@/theme/student';
import { TabIcon } from '@/components/ui';

export default function StaffLayout() {
  const role = useAuth().session?.user.role, notices = useNotifications(), insets = useSafeAreaInsets();
  const labels = staffLabels[isStaff(role) ? role : 'PROFESOR'];
  return <StudentAppearance.Provider value={true}><StatusBar style="dark" /><Tabs initialRouteName="inicio" backBehavior="history" screenOptions={{ headerShown: false, lazy: true, tabBarHideOnKeyboard: true, popToTopOnBlur: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted, tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.border, paddingTop: 7, height: 72 + insets.bottom, paddingBottom: Math.max(10, insets.bottom) }, tabBarLabelStyle: { fontSize: 10, paddingBottom: 3 }, sceneStyle: { backgroundColor: c.background } }}>
    <Tabs.Screen name="index" options={{ href: null }} />
    <Tabs.Screen name="inicio" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
    <Tabs.Screen name="trabajo" options={{ title: labels.work, tabBarIcon: ({ color }) => <TabIcon name="aulas" color={color} /> }} />
    <Tabs.Screen name="revision" options={{ title: labels.review, tabBarIcon: ({ color }) => <TabIcon name={role === 'SUPERVISOR' ? 'clock' : 'book'} color={color} /> }} />
    <Tabs.Screen name="avisos" options={{ title: 'Avisos', tabBarBadge: notices.unread || undefined, tabBarBadgeStyle: { backgroundColor: c.primary }, tabBarIcon: ({ color }) => <TabIcon name="bell" color={color} /> }} />
    <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: ({ color }) => <TabIcon name="more" color={color} /> }} />
  </Tabs></StudentAppearance.Provider>;
}
