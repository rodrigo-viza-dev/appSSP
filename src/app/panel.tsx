import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useNotifications } from '@/state/notificaciones';
import { ApiError, getDashboard, type Dashboard } from '@/services/api';
import { colors } from '@/theme';
const roles = { ALUMNO: 'Practicante', PROFESOR: 'Docente', ADMIN: 'Administración', SUPERVISOR: 'Supervisor de empresa' };
function PanelScreenContent() {
  const router = useAppRouter();
  const { session, signOut, offline } = useAuth();
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
      {offline && <Text style={typography.body}>Sin conexión al servidor. Puedes continuar tus borradores del dispositivo; los permisos y envíos se comprobarán al reconectar.</Text>}
      {session.user.role === 'ALUMNO' && <Button title="Borradores y envíos pendientes" secondary onPress={() => router.push('/borradores')} />}
      <Card><Text style={typography.title}>Avisos de mi cuenta</Text>
        <Text accessibilityLiveRegion="polite" style={typography.body}>{notifications.loading ? 'Consultando avisos…' : notifications.error ? 'No se pudo consultar el estado de tus avisos.' : notifications.unread === null ? 'Avisos por consultar' : notifications.unread === 1 ? '1 aviso sin leer' : `${notifications.unread} avisos sin leer`}</Text>
        <Button title="Mis avisos" secondary onPress={() => router.push('/mis-avisos')} />
      </Card>
      {session.user.role === 'ADMIN' && <Button title="Auditoría de actividad" secondary onPress={() => router.push('/auditoria')} />}
      {session.user.role === 'ADMIN' && <Card><Text style={typography.title}>Operación académica</Text><Text style={typography.body}>Gestiona aulas, responsables y acceso de estudiantes; consulta el estado del programa.</Text><Button title="Administración académica" onPress={() => router.push('/administracion')} /><Button title="Reporte institucional" secondary onPress={() => router.push('/reportes')} /></Card>}
      {(session.user.role === 'PROFESOR' || session.user.role === 'ADMIN') && <Button title="Mis aulas · Docencia" onPress={() => router.push('/docencia')} />}
      {(session.user.role === 'ALUMNO' || session.user.role === 'SUPERVISOR') && <Button title={session.user.role === 'ALUMNO' ? 'Mi bitácora de prácticas' : 'Validar horas de prácticas'} onPress={() => router.push('/mis-horas')} />}
      <Card><Text style={typography.title}>Evaluación y cierre de prácticas</Text><Text style={typography.body}>Consulta los requisitos, la evaluación del supervisor y el expediente de cada práctica.</Text><Button title={session.user.role === 'SUPERVISOR' ? 'Evaluar practicantes y ver expedientes' : session.user.role === 'ALUMNO' ? 'Mi expediente de prácticas' : 'Expedientes y cierre de prácticas'} onPress={() => router.push('/expedientes')} /></Card>
      {(session.user.role === 'ALUMNO' || session.user.role === 'PROFESOR') && <Button title="Mensajes académicos" secondary onPress={() => router.push('/mensajes')} />}
      <Card><Text style={typography.title}>Seguimiento y comunidad</Text><Text style={typography.body}>Consulta objetivos de producción, comunicados y conversaciones de tu aula.</Text>
        <Button title="Metas de prácticas" secondary onPress={() => router.push('/metas')} />
        {session.user.role !== 'SUPERVISOR' && <Button title="Comunidad del aula" secondary onPress={() => router.push('/comunidad')} />}
        <Button title="Guía de prácticas" secondary onPress={() => router.push('/guia')} />
      </Card>
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
      {session.user.role === 'SUPERVISOR' && <Text style={typography.body}>Completa la evaluación desde el expediente del practicante. El cierre lo autoriza el docente después de revisar los requisitos.</Text>}
      <Button title="Actualizar datos" secondary disabled={loading} onPress={() => setAttempt(value => value + 1)} />
      <Text style={typography.body}>En Android conservamos tu sesión de forma segura y la comprobamos al volver a abrir. Al vencer tendrás que ingresar nuevamente.</Text>
      <Button title="Cerrar sesión" onPress={() => signOut()} />
    </Screen>
  </View>;
}

export default function PanelScreen(){return <StudentLegacyRoute route="/panel"><PanelScreenContent /></StudentLegacyRoute>;}
