import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { Badge, Button, Field, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { StudentGroup, StudentRow, studentStyles as s } from '@/features/alumno/components';
import { FilterChip, ListHeading, PageFooter, PagedList } from '@/features/alumno/paged-components';
import { useAppRouter } from '@/features/alumno/navigation';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { getAulaDocente } from '@/services/docencia';
import { getClassroomPage, getDeliveryPage, getGradePage, getPracticePage, getStudentPage, type GradePage, type GradeSummary, type StudentSummary, type DeliverySummary } from '@/services/staff-pages';
import type { Session } from '@/services/api';
import { academicDate } from '@/utils/date';
import { useAuth } from '@/state/auth';
import { useStaffData } from './data-state';

function useSearch() {
  const [value, setValue] = useState(''), [query, setQuery] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(value.trim()), 350); return () => clearTimeout(timer); }, [value]);
  return { value, setValue, query, waiting: value.trim() !== query };
}
const gap = { gap: 12 };

export function StaffClassrooms() {
  const { session } = useAuth(), router = useAppRouter(), search = useSearch();
  const query = usePagedQuery(`staff-aulas:${search.query}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getClassroomPage(s, search.query, signal, cursor), [search.query]), session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN');
  return <PagedList title="Mis aulas · Docencia" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} rows={search.waiting ? [] : query.data?.items ?? []}
    header={<><Text style={s.muted}>Aulas a tu cargo, ordenadas por nombre.</Text><Field label="Buscar aula" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Nombre, código, periodo o docente" /><QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="Las aulas no están disponibles para tu cuenta." /></>}
    render={aula => <StudentRow title={aula.nombre} subtitle={`${aula.codigo} · ${aula.periodo}\n${aula.profesorNombre} · ${aula.inscritos} inscritos · ${aula.estado === 'ACTIVA' ? 'Activa' : 'Concluida'}`} onPress={() => router.push({ pathname: '/aula-docente', params: { id: aula.id } })} />}
    empty={!query.loading && !query.error && !search.waiting ? <Text style={s.muted}>{search.query ? 'No hay aulas que coincidan con la búsqueda.' : 'Todavía no tienes aulas asignadas. Consulta con la coordinación.'}</Text> : null}
    footer={<><PageFooter query={query} noun="aulas" disabled={search.waiting} /><Button title="Actualizar aulas" secondary disabled={query.loading || search.waiting} onPress={query.retry} /></>} />;
}

export function StaffPracticeList() {
  const { session } = useAuth(), router = useAppRouter(), search = useSearch();
  const supervisor = session?.user.role === 'SUPERVISOR';
  const [state, setState] = useState('TODAS');
  const query = usePagedQuery(`staff-practices:${state}:${search.query}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getPracticePage(s, state, search.query, signal, cursor), [state, search.query]), !!session && ['PROFESOR', 'ADMIN', 'SUPERVISOR'].includes(session.user.role));
  return <PagedList title={supervisor ? 'Mis practicantes' : 'Seguimiento'} back={() => router.canGoBack() ? router.back() : router.replace('/panel')} rows={search.waiting ? [] : query.data?.items ?? []}
    header={<><Text style={s.muted}>Prácticas asignadas, ordenadas por apellidos. Solo cuentan las horas validadas.</Text>{!supervisor && <Field label="Buscar practicante" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Nombre, aula o periodo" />}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['TODAS', 'Todas'], ['ABIERTAS', 'Abiertas'], ['CERRADAS', 'Cerradas']] as const).map(([value, label]) => <FilterChip key={value} title={label} selected={state === value} onPress={() => setState(value)} />)}</View><QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="Tus prácticas asignadas no están disponibles." /></>}
    render={p => <StudentRow title={p.practicanteNombre} subtitle={`${p.aulaNombre} · ${p.periodo}\n${p.horasAcumuladas} de ${p.horasMinimas} h validadas · ${p.estado === 'CERRADA' ? 'Cerrada' : 'En curso'}`} onPress={() => router.push(supervisor ? { pathname: '/expediente', params: { practicaId: p.id } } : { pathname: '/seguimiento', params: { aulaId: p.aulaId, alumnoId: p.practicanteId } })} />}
    empty={!query.loading && !query.error && !search.waiting ? <Text style={s.muted}>{search.query || state !== 'TODAS' ? 'No hay prácticas que coincidan con los filtros.' : supervisor ? 'Todavía no hay practicantes vinculados a tus centros.' : 'Aún no hay prácticas asignadas. Puedes consultar alumnos sin práctica desde Aulas.'}</Text> : null}
    footer={<><PageFooter query={query} noun="prácticas" disabled={search.waiting} /><Button title="Actualizar prácticas" secondary disabled={query.loading || search.waiting} onPress={query.retry} /></>} />;
}

type Section = 'entregas' | 'alumnos' | 'notas' | 'recursos';
export function StaffClassroom() {
  const { session } = useAuth(), router = useAppRouter(), params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '', { revisions } = useStaffData();
  const [section, setSection] = useState<Section>('entregas'), [pending, setPending] = useState(true);
  const deliverySearch = useSearch(), studentSearch = useSearch(), gradeSearch = useSearch();
  const search = section === 'alumnos' ? studentSearch : section === 'notas' ? gradeSearch : deliverySearch;
  const revision = revisions['aula:' + id] ?? 0, base = `${id}:${revision}`;
  const aula = useDocenteQuery(`staff-aula:${id}`, useCallback((s: Session, signal: AbortSignal) => getAulaDocente(s, id, signal), [id]), !!id);
  const active = !!aula.data && (session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN');
  const deliveries = usePagedQuery(`staff-entregas:${base}:${pending}:${deliverySearch.query}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getDeliveryPage(s, id, pending, deliverySearch.query, signal, cursor), [id, pending, deliverySearch.query]), active && section === 'entregas');
  const students = usePagedQuery(`staff-padron:${base}:${studentSearch.query}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getStudentPage(s, id, studentSearch.query, signal, cursor), [id, studentSearch.query]), active && section === 'alumnos');
  const grades = usePagedQuery(`staff-notas:${base}:${gradeSearch.query}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getGradePage(s, id, gradeSearch.query, signal, cursor), [id, gradeSearch.query]), active && section === 'notas');
  const q = section === 'alumnos' ? students : section === 'notas' ? grades : deliveries;
  const rows = section === 'alumnos' ? students.data?.items : section === 'notas' ? grades.data?.items : deliveries.data?.items;
  const back = () => router.canGoBack() ? router.back() : router.replace('/docencia');
  const follow = (alumnoId: string) => router.push({ pathname: '/seguimiento', params: { aulaId: id, alumnoId } });
  const resource = (title: string, subtitle: string, pathname: string) => <StudentRow key={pathname} title={title} subtitle={subtitle} onPress={() => router.push({ pathname, params: { aulaId: id } } as never)} />;
  const header = <View style={{ gap: 18, paddingBottom: 12 }}>
    {!id && <Text accessibilityRole="alert" style={typography.error}>Abre el aula desde Mis aulas.</Text>}
    <QueryFeedback {...aula} notFound="El aula no está disponible para tu cuenta." />
    {aula.data && <><View style={gap}><Badge title={aula.data.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" /><Text style={s.muted}>{aula.data.codigo} · {aula.data.periodo} · {aula.data.inscritos} inscritos</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['entregas', 'Entregas'], ['alumnos', 'Alumnos'], ['notas', 'Notas'], ['recursos', 'Recursos']] as const).map(([value, label]) => <FilterChip key={value} title={label} selected={section === value} onPress={() => setSection(value)} />)}</View>
      {section === 'recursos' ? <><Text style={s.sectionTitle}>Trabajo y comunicación del aula</Text><StudentGroup>{resource('Publicar y consultar tareas', 'Instrucciones, plazos y entregas', '/tareas-docente')}{resource('Tomar asistencia académica', 'Consultar el padrón y registrar el día', '/asistencia-docente')}{session?.user.role === 'PROFESOR' && resource('Mensajes con estudiantes', 'Conversaciones privadas de esta aula', '/mensajes')}{resource('Anuncios y foros del aula', 'Indicaciones y conversaciones del grupo', '/comunidad')}{resource('Documentos y materiales del aula', 'Archivos privados y materiales de estudio', '/documentos')}<StudentRow title="Gestionar metas de prácticas" subtitle="Producción y objetivos revisados" onPress={() => router.push('/metas')} /></StudentGroup></> : <>
        <Field label={section === 'entregas' ? 'Buscar estudiante o tarea' : 'Buscar estudiante'} value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Nombre o correo; en entregas, nombre o tarea" />
        {section === 'entregas' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><FilterChip title="Sin calificar" selected={pending} onPress={() => setPending(true)} /><FilterChip title="Todas las entregas" selected={!pending} onPress={() => setPending(false)} /></View>}
        {section === 'notas' && grades.data && <View style={s.notice}><Text style={s.eyebrow}>Promedio del aula</Text><Text style={s.number}>{(grades.data as GradePage).promedioGeneral ?? 'Sin calificaciones'}</Text><Text style={s.muted}>Promedio de los promedios de estudiantes con nota. Incluye todo el padrón, aunque filtres esta lista.</Text></View>}
        <QueryFeedback {...q} loading={search.waiting || q.loading && !q.data} notFound="La lista no está disponible en esta aula." />
      </>}
    </>}
  </View>;
  return <View style={s.page}><ListHeading title={aula.data?.nombre ?? 'Aula docente'} back={back} /><FlatList<DeliverySummary | StudentSummary | GradeSummary>
    data={active && section !== 'recursos' && !search.waiting ? rows ?? [] : []} keyExtractor={row => row.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}
    ListHeaderComponent={header} renderItem={({ item }) => {
      if ('tareaId' in item) return <StudentRow title={item.tareaTitulo} subtitle={`${item.alumnoNombre}\n${academicDate(item.createdAt)} · ${item.nota === null ? 'Sin calificar' : `Nota: ${item.nota} / 20`}`} onPress={() => router.push({ pathname: '/revisar-entrega', params: { aulaId: id, entregaId: item.id } })} />;
      if ('promedio' in item) return <StudentRow title={item.alumnoNombre} subtitle={`Promedio: ${item.promedio ?? 'Sin calificaciones'}\nAsistencia: ${item.asistenciaPct === null ? 'Sin registros' : `${item.asistenciaPct}%`} · ${item.horasValidadas} h validadas`} onPress={() => follow(item.alumnoId)} />;
      return <StudentRow title={item.alumnoNombre} subtitle={`${item.alumnoEmail}\n${item.progreso}% de avance · Semana ${item.semanaActual} de ${item.semanasTotales}\n${item.tareasEntregadas} de ${item.tareasTotal} tareas entregadas`} onPress={() => follow(item.alumnoId)} />;
    }}
    ListEmptyComponent={active && section !== 'recursos' && !q.loading && !q.error && !search.waiting ? <Text style={s.muted}>No hay {section === 'entregas' ? 'entregas' : 'estudiantes'} que coincidan con esta consulta.</Text> : null}
    ListFooterComponent={active && section !== 'recursos' ? <View style={gap}><PageFooter query={q} noun={section === 'entregas' ? 'entregas' : 'estudiantes'} disabled={search.waiting} /><Button title={section === 'entregas' ? 'Actualizar entregas' : section === 'notas' ? 'Actualizar notas' : 'Actualizar estudiantes'} secondary disabled={q.loading || search.waiting} onPress={q.retry} /></View> : null} /></View>;
}
