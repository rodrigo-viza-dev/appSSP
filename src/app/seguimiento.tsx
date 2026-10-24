import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getSeguimiento } from '@/services/seguimiento';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export default function StudentFollowupScreen() { return <StudentLegacyRoute route="/seguimiento"><StudentFollowupScreenContent /></StudentLegacyRoute>; }
function StudentFollowupScreenContent() {
  const router = useRouter(), { session } = useAuth(), params = useLocalSearchParams<{ aulaId?: string; alumnoId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', alumnoId = typeof params.alumnoId === 'string' ? params.alumnoId : '';
  const query = useSessionQuery(`seguimiento:${aulaId}:${alumnoId}`, useCallback((s: Session, signal: AbortSignal) => getSeguimiento(s, aulaId, alumnoId, signal), [aulaId, alumnoId]), !!aulaId && !!alumnoId && (session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN'));
  const data = query.data;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Seguimiento individual" subtitle={data?.aulaNombre ?? 'Ficha académica del practicante'} back={() => router.canGoBack() ? router.back() : router.replace('/docencia')} />
    <Screen>
      {(!aulaId || !alumnoId) && <Text style={typography.error}>Abre la ficha desde la lista de estudiantes del aula.</Text>}
      <QueryFeedback {...query} notFound="El alumno no está disponible en esta aula." />
      {data && <>
        <Card><Text style={typography.title}>{data.practicanteNombre}</Text><Text style={typography.body}>{data.practicanteEmail}</Text><Text style={typography.body}>{data.aulaNombre}</Text><Text style={typography.body}>Centro: {data.empresaNombre || 'Sin centro registrado'}</Text><Badge title={data.estadoPractica?.replaceAll('_', ' ') ?? 'Sin práctica asignada'} tone="neutral" /></Card>
        <Card><Text style={typography.title}>Horas y progreso académico</Text><Text style={typography.title}>{data.estadoPractica ? `${data.horasAcumuladas} h validadas · Meta: ${data.horasMinimas} h` : 'Sin práctica para consultar horas'}</Text><Text style={typography.body}>Progreso académico: {data.progreso}%</Text><Text style={typography.body}>Asistencia académica: {data.asistenciaPct === null ? 'Sin registros' : `${data.asistenciaPct}%`}</Text><Text style={typography.body}>Promedio: {data.promedio === null ? 'Sin calificaciones' : `${data.promedio} / 20`}</Text></Card>
        <Text style={typography.title}>Puntos para seguimiento</Text>
        {data.motivosRiesgo.length ? <Card>{data.motivosRiesgo.map((m, i) => <Text key={i} style={typography.body}>• {m}</Text>)}<Text style={typography.body}>Revisa estos indicadores con el estudiante y contrástalos con su situación académica.</Text></Card> : <Text style={typography.body}>El servidor no señala indicadores pendientes de seguimiento.</Text>}
        <Text style={typography.title}>Entregas y retroalimentación</Text>
        {data.entregas.length === 0 && <Text style={typography.body}>Todavía no hay tareas definidas para esta aula.</Text>}
        {data.entregas.map((e, i) => <Card key={i}><Text style={typography.title}>{e.tareaTitulo}</Text><Badge title={e.estado.replaceAll('_', ' ')} tone={e.nota === null ? 'warning' : 'success'} /><Text style={typography.body}>Nota: {e.nota === null ? 'Sin calificar' : `${e.nota} / 20`}</Text><Text style={typography.body}>{e.retroalimentacion || 'Sin retroalimentación registrada.'}</Text></Card>)}
        <Button title="Consultar metas de prácticas" secondary onPress={() => router.push('/metas')} />
        <Button title="Consultar evaluación y cierre de prácticas" onPress={() => router.push({ pathname: '/expedientes', params: { aulaId, alumnoId } })} />
      </>}
      <Button title="Actualizar seguimiento" secondary disabled={query.loading} onPress={query.retry} />
    </Screen>
  </View>;
}
