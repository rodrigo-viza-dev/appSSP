import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/screen';
import { Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { TaskForm } from '@/features/tareas/task-form';
import { getTeacherTasks } from '@/services/tareas';
import { getAulaDocente } from '@/services/docencia';
import type { Session } from '@/services/api';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';
export default function TeacherTasksScreen() {
  const params = useLocalSearchParams<{ aulaId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '';
  const router = useRouter();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const aula = useDocenteQuery(`tasks-aula:${aulaId}`, useCallback((s: Session, signal: AbortSignal) => getAulaDocente(s, aulaId, signal), [aulaId]), !!aulaId.trim());
  const query = useDocenteQuery(`tasks-teacher:${aulaId}`, useCallback((s: Session, signal: AbortSignal) => getTeacherTasks(s, aulaId, signal), [aulaId]), !!aula.data);
  return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Tareas del aula" subtitle={aula.data?.nombre ?? 'Publicación y consulta'} back={() => router.canGoBack() ? router.back() : router.replace('/docencia')} />
    <Screen><QueryFeedback {...aula} notFound="El aula no está disponible para tu cuenta." /><QueryFeedback {...query} notFound="Este servidor todavía no ofrece la publicación de tareas." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {query.data && aula.data && <>
        {aula.data.estado === 'ACTIVA' ? <TaskForm aulaId={aulaId} onBusy={setBusy} onSaved={() => { setNotice('Tarea publicada y confirmada por el servidor.'); query.retry(); }} /> : <Text style={typography.body}>El aula está concluida y no admite nuevas tareas.</Text>}
        <Text style={typography.title}>Tareas publicadas</Text>
        {!query.data.length && <Text style={typography.body}>Todavía no hay tareas publicadas.</Text>}
        {query.data.map(t => <Card key={t.id}><Text style={typography.title}>{t.titulo}</Text><Text style={typography.body}>{t.descripcion}</Text><Text style={typography.body}>Límite: {academicDate(t.fechaLimite, 'Sin fecha límite')}</Text></Card>)}
        <Button title="Actualizar tareas publicadas" secondary disabled={busy} onPress={query.retry} />
      </>}
    </Screen>
  </View>;
}
