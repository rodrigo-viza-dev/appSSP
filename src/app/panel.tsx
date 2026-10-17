import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useNotifications } from '@/state/notificaciones';
import { ApiError, getDashboard, type Dashboard } from '@/services/api';
import { colors } from '@/theme';
const roles = { ALUMNO: 'Practicante', PROFESOR: 'Docente', ADMIN: 'Administración', SUPERVISOR: 'Supervisor de empresa' };
export default function PanelScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const notifications = useNotifications();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    getDashboard(session, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(reason => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) signOut(true);
      else setError(reason instanceof Error ? reason.message : 'No se pudo cargar el panel.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, attempt]);
  if (!session) return null;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title={`Hola, ${session.user.nombres}`} subtitle={roles[session.user.role]} />
    <Screen>
      <Badge title="Cuenta SSP" tone="neutral" /><Text style={typography.body}>{session.user.email}</Text>
      <Card><Text style={typography.title}>Avisos de mi cuenta</Text>
        <Text accessibilityLiveRegion="polite" style={typography.body}>{notifications.loading ? 'Consultando avisos…' : notifications.error ? 'No se pudo consultar el estado de tus avisos.' : notifications.unread === null ? 'Avisos por consultar' : notifications.unread === 1 ? '1 aviso sin leer' : `${notifications.unread} avisos sin leer`}</Text>
        <Button title="Mis avisos" secondary onPress={() => router.push('/mis-avisos')} />
      </Card>
      {session.user.role === 'ADMIN' && <Button title="Auditoría de actividad" secondary onPress={() => router.push('/auditoria')} />}
      {(session.user.role === 'PROFESOR' || session.user.role === 'ADMIN') && <Button title="Mis aulas · Docencia" onPress={() => router.push('/docencia')} />}
      {(session.user.role === 'ALUMNO' || session.user.role === 'SUPERVISOR') && <Button title={session.user.role === 'ALUMNO' ? 'Mi bitácora de prácticas' : 'Validar horas de prácticas'} onPress={() => router.push('/mis-horas')} />}
      {loading && <View accessibilityLiveRegion="polite"><ActivityIndicator color={colors.primary} /><Text style={typography.body}>Consultando tus datos…</Text></View>}
      {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
      {data?.kind === 'ALUMNO' && <>
        <Button title="Mi centro de prácticas" secondary onPress={() => router.push('/centro')} />
        <Text style={typography.title}>Mi práctica</Text>
        {data.practica ? <Card><Text style={typography.title}>{data.practica.aulaNombre}</Text><Text style={typography.body}>Periodo {data.practica.periodo} · {data.practica.estado.replaceAll('_', ' ')}</Text><Text style={typography.body}>{data.practica.horasAcumuladas} h acumuladas según el servidor · Meta: {data.practica.horasMinimas} h</Text><Text style={typography.body}>Este acumulado todavía puede incluir horas pendientes de validación.</Text></Card> : <Text style={typography.body}>No tienes una práctica activa asignada. Consulta con la coordinación.</Text>}
        <Text style={typography.title}>Mis aulas</Text>
        {data.aulas.length === 0 && <Text style={typography.body}>Aún no tienes aulas asignadas.</Text>}
        {data.aulas.map(aula => <Card key={aula.id}><Text style={typography.title}>{aula.nombre}</Text><Text style={typography.body}>{aula.profesorNombre} · {aula.ciclo}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" /><Button title={`Abrir aula: ${aula.nombre}`} secondary onPress={() => router.push({ pathname: '/aula', params: { id: aula.id } })} /></Card>)}
      </>}
      {data && data.kind !== 'ALUMNO' && <><Text style={typography.title}>Resumen</Text>{data.metrics.map(metric => <Card key={metric.label}><Text style={typography.body}>{metric.label}</Text><Text style={typography.title}>{metric.value ?? 'Sin datos'}</Text></Card>)}</>}
      {session.user.role === 'SUPERVISOR' && <Text style={typography.body}>La bitácora permite revisar horas cuando el servidor tiene habilitado el circuito actualizado. La evaluación final sigue pendiente.</Text>}
      <Button title="Actualizar datos" secondary disabled={loading} onPress={() => setAttempt(value => value + 1)} />
      <Text style={typography.body}>Por ahora, cerrar o recargar la app termina la sesión.</Text>
      <Button title="Cerrar sesión" onPress={() => signOut()} />
    </Screen>
  </View>;
}
