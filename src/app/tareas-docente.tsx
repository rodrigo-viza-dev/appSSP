import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
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
import { EditTask } from '@/features/tareas/edit-task';
export default function TeacherTasksScreen() { return <StudentLegacyRoute route="/tareas-docente"><TeacherTasksScreenContent /></StudentLegacyRoute>; }
function TeacherTasksScreenContent() {
  const params = useLocalSearchParams<{ aulaId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '';
  const router = useRouter();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [editing, setEditing] = useState('');
  const aula = useDocenteQuery(`tasks-aula:${aulaId}`, useCallback((s: Session, signal: AbortSignal) => getAulaDocente(s, aulaId, signal), [aulaId]), !!aulaId.trim());
  const query = useDocenteQuery(`tasks-teacher:${aulaId}`, useCallback((s: Session, signal: AbortSignal) => getTeacherTasks(s, aulaId, signal), [aulaId]), !!aula.data);
  return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Tareas del aula" subtitle={aula.data?.nombre ?? 'Publicación y consulta'} back={() => router.canGoBack() ? router.back() : router.replace('/docencia')} />
    <Screen><QueryFeedback {...aula} notFound="El aula no está disponible para tu cuenta." /><QueryFeedback {...query} notFound="Este servidor todavía no ofrece la publicación de tareas." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {query.data && aula.data && <>
        {aula.data.estado === 'ACTIVA' ? !editing && <TaskForm aulaId={aulaId} onBusy={setBusy} onSaved={() => { setNotice('Tarea publicada y confirmada por el servidor.'); query.retry(); }} /> : <Text style={typography.body}>El aula está concluida y no admite nuevas tareas.</Text>}
        <Text style={typography.title}>Tareas publicadas</Text>
        {!query.data.length && <Text style={typography.body}>Todavía no hay tareas publicadas.</Text>}
        {query.data.map(t => <Card key={`${t.id}:${t.revision}`}><Text style={typography.title}>{t.titulo}</Text><Text style={typography.body}>{t.descripcion}</Text><Text style={typography.body}>Límite: {academicDate(t.fechaLimite, 'Sin fecha límite')}</Text>
          {editing === t.id ? <><EditTask task={t} onBusy={setBusy} onSaved={() => { setEditing(''); setNotice('Tarea y plazo actualizados; cambio registrado en el historial.'); query.retry(); }} refresh={() => { setEditing(''); query.retry(); }} /><Button title="Cancelar edición de tarea" secondary disabled={busy} onPress={() => setEditing('')} /></> : aula.data?.estado === 'ACTIVA' && <Button title={`Editar o ampliar plazo: ${t.titulo}`} secondary disabled={busy || !!editing} onPress={() => setEditing(t.id)} />}
        </Card>)}
        <Button title="Actualizar tareas publicadas" secondary disabled={busy} onPress={query.retry} />
      </>}
    </Screen>
  </View>;
}
