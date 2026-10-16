import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/screen';
import { Badge, Button, Header, Label, typography } from '@/components/ui';
import { usePractice } from '@/state/practice';
import { colors, serif } from '@/theme';

export default function AttendanceScreen() {
  const router = useRouter();
  const { entry, exit, startAttendance, finishAttendance } = usePractice();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!entry || exit) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [entry, exit]);
  const seconds = entry ? Math.max(0, Math.floor(((exit ?? now) - entry) / 1000)) : 0;
  const elapsed = `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}`;
  const date = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = (value: number) => new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return <View style={{ flex: 1 }}><Header title="Asistencia" subtitle={date} /><Screen>
    <Badge title="Asistencia de demostración" tone="neutral" />
    <View style={s.center}><View style={s.ring}><View style={s.ringInner}><Text style={s.timer}>{elapsed}</Text><Label>{exit ? 'JORNADA FINALIZADA' : entry ? 'EN CURSO' : 'LISTO PARA EMPEZAR'}</Label></View></View>
      <Badge title="Radio Yaraví · ubicación sin verificar" tone="warning" />
      <Text style={[typography.body, { textAlign: 'center' }]}>{entry ? `Entrada registrada a las ${time(entry)}` : 'Registra tu entrada al iniciar la jornada.'}{exit ? `\nSalida registrada a las ${time(exit)}` : ''}</Text>
    </View>
    <Text style={[typography.body, { textAlign: 'center', fontSize: 12 }]}>En esta demo no se captura tu ubicación ni se envían registros al centro de prácticas.</Text>
    {!entry || exit ? <Button title={exit ? 'Iniciar otra jornada' : 'Marcar entrada'} onPress={() => { startAttendance(); setNow(Date.now()); }} /> : <Button title="Marcar salida" onPress={finishAttendance} />}
    {exit && <Button title="Registrar actividad" secondary onPress={() => router.push('/nueva-actividad')} />}
  </Screen></View>;
}
const s = StyleSheet.create({
  center: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 22 }, ring: { width: 220, height: 220, borderRadius: 110, borderWidth: 7, borderColor: colors.primarySoft, borderTopColor: colors.primary, borderRightColor: colors.primary, borderBottomColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ringInner: { gap: 10, alignItems: 'center' }, timer: { fontSize: 49, fontFamily: serif, color: colors.text, fontVariant: ['tabular-nums'] },
});
