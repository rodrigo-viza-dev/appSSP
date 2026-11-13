import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Button, Field, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { StudentRow, studentStyles as s } from '@/features/alumno/components';
import { PageFooter, PagedList } from '@/features/alumno/paged-components';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { TaskForm } from '@/features/tareas/task-form';
import { EditTask } from '@/features/tareas/edit-task';
import { getTaskDetail, getTaskPage, type TaskSummary } from '@/services/staff-pages';
import { getAulaDocente } from '@/services/docencia';
import type { Session } from '@/services/api';
import { academicDate } from '@/utils/date';
import { useStaffData } from '@/features/equipo/data-state';
export default function TeacherTasksScreen() { return <StudentLegacyRoute route="/tareas-docente"><TeacherTasksScreenContent /></StudentLegacyRoute>; }
function TeacherTasksScreenContent() {
  const params = useLocalSearchParams<{ aulaId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '';
  const router = useRouter(), staff = useStaffData(), search = useSearch();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [editing, setEditing] = useState('');
  const revision = staff.revisions['aula:' + aulaId] ?? 0;
  const aula = useDocenteQuery(`tasks-aula:${aulaId}`, useCallback((s: Session, signal: AbortSignal) => getAulaDocente(s, aulaId, signal), [aulaId]), !!aulaId.trim());
  const query = usePagedQuery<TaskSummary>(`staff-tareas:${aulaId}:${revision}:${search.query}`,
    useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getTaskPage(s, aulaId, search.query, signal, cursor), [aulaId, search.query]),
    !!aula.data);
  const detail = useDocenteQuery(`staff-tarea:${aulaId}:${editing}`, useCallback((s: Session, signal: AbortSignal) => getTaskDetail(s, aulaId, editing, signal), [aulaId, editing]), !!editing);
  const active = aula.data?.estado === 'ACTIVA';
  const back = () => router.canGoBack() ? router.back() : router.replace('/docencia');
  const refresh = () => { staff.touch('aula:' + aulaId); query.retry(); };
  const header = <View style={{ gap: 18, paddingBottom: 12 }}>
    <QueryFeedback {...aula} notFound="El aula no está disponible para tu cuenta." />
    {aula.data && <>
      {active && !editing && <TaskForm aulaId={aulaId} onBusy={setBusy} onSaved={() => { staff.touch('aula:' + aulaId); setNotice('Tarea publicada y confirmada por el servidor.'); query.retry(); }} />}
      {!active && <Text style={typography.body}>El aula está concluida y no admite nuevas tareas ni cambios de plazo.</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      <Text style={s.sectionTitle}>Tareas publicadas</Text>
      <Text style={s.muted}>Ordenadas de la más reciente a la más antigua. Abre una tarea para revisar sus instrucciones o ampliar el plazo.</Text>
      <Field label="Buscar tarea" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Título de la tarea" />
      <QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="Las tareas de este servidor todavía no están disponibles." />
    </>}
  </View>;
  return <PagedList title="Tareas del aula" back={back} rows={search.waiting ? [] : query.data?.items ?? []} header={header}
    render={task => {
      const open = editing === task.id;
      return <View style={{ gap: 8 }}>
        <StudentRow title={task.titulo} subtitle={`${task.resumen}${task.resumen.length === 180 ? '…' : ''}\nLímite: ${academicDate(task.fechaLimite, 'Sin fecha límite')} · ${task.entregas} ${task.entregas === 1 ? 'entrega' : 'entregas'}${task.revision ? ` · Revisión ${task.revision}` : ''}`}
          onPress={() => { setNotice(''); setEditing(open ? '' : task.id); }} />
        {open && <View style={{ gap: 12 }}>
          <QueryFeedback {...detail} notFound="La tarea ya no está disponible en esta aula." />
          {detail.data && detail.data.id === task.id && (active ? <><EditTask task={detail.data} onBusy={setBusy} onSaved={() => { staff.touch('aula:' + aulaId); setEditing(''); setNotice('Tarea y plazo actualizados; cambio registrado en el historial.'); query.retry(); }} refresh={() => { detail.retry(); query.retry(); }} /><Button title="Cancelar edición de tarea" secondary disabled={busy} onPress={() => setEditing('')} /></> : <Text style={typography.body}>El aula está concluida. La tarea se puede consultar, pero no modificar.</Text>)}
        </View>}
      </View>;
    }}
    empty={!search.waiting && !query.loading && !query.error ? <Text style={s.muted}>{search.query ? 'No hay tareas que coincidan con la búsqueda.' : 'Todavía no hay tareas publicadas.'}</Text> : null}
    footer={<View style={{ gap: 12 }}><PageFooter query={query} noun="tareas" disabled={search.waiting} /><Button title="Actualizar tareas publicadas" secondary disabled={busy || query.loading || search.waiting} onPress={refresh} /></View>} />;
}
