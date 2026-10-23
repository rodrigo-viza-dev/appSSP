import { Stack } from 'expo-router';
import { studentColors as c } from '@/theme/student';
export const unstable_settings={initialRouteName:'index'};
export default function StudentStack(){return <Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:c.background}}}><Stack.Screen name="index"/><Stack.Screen name="[vista]"/></Stack>;}
