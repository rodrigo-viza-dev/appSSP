import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { FilterChip, PageFooter } from '@/features/alumno/paged-components';
import { asignarDocente, cambiarEstado, establecerMatricula, getAdminAula, getAdminTeachers, getMatriculasPage, type Matricula, type Matriculas } from '@/services/administracion';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

type RosterFilter = 'TODOS' | 'MATRICULADOS' | 'SIN_MATRICULA';
const rosterFilters: { value: RosterFilter; label: string }[] = [{ value: 'TODOS', label: 'Todos los estudiantes' }, { value: 'MATRICULADOS', label: 'Matriculados' }, { value: 'SIN_MATRICULA', label: 'Sin matrícula' }];

export default function AdminClassScreen() { return <StudentLegacyRoute route="/administrar-aula"><AdminClassScreenContent /></StudentLegacyRoute>; }
function AdminClassScreenContent() {
  const router = useRouter(), params = useLocalSearchParams<{ aulaId?: string }>(), { session } = useAuth();
  const id = typeof params.aulaId === 'string' ? params.aulaId : '';
  const admin = session?.user.role === 'ADMIN';
  const query = useSessionQuery(`admin-aula:${id}`, useCallback((s: Session, signal: AbortSignal) => getAdminAula(s, id, signal), [id]), admin && !!id);
  const teachers = useSessionQuery('admin-docentes', useCallback(getAdminTeachers, []), admin);
  const [action, setAction] = useState(''), [busy, setBusy] = useState(false), [filter, setFilter] = useState<RosterFilter>('TODOS'), [notice, setNotice] = useState('');
  const search = useSearch();
  const roster = usePagedQuery<Matricula, Matriculas>(`admin-roster:${id}:${filter}:${search.query}`, useCallback((s, signal, cursor) => getMatriculasPage(s, id, filter, search.query, signal, cursor), [id, filter, search.query]), admin && !!id);
  const aula = query.data, docentes = teachers.data?.items ?? [];
  const refresh = () => { setAction(''); setNotice(''); query.retry(); roster.retry(); };
  const saved = () => { refresh(); setNotice('Cambio guardado y confirmado por el servidor.'); };
  const locked = busy || !!action;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Gestionar aula" subtitle="Responsable, estado y acceso" back={() => router.canGoBack() ? router.back() : router.replace('/administracion')} />
    <Screen>
      {!id && <Text style={typography.error}>Abre el aula desde Administración académica.</Text>}
      <QueryFeedback {...query} notFound="El aula no está disponible." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {aula && <>
        <Card><Text style={typography.title}>{aula.nombre}</Text><Text style={typography.body}>{aula.codigo} · {aula.periodo}</Text><Text style={typography.body}>{aula.descripcion}</Text><Text style={typography.body}>Docente: {aula.profesorNombre}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" /></Card>
        <Button title="Cambiar docente responsable" secondary disabled={locked || docentes.length === 0} onPress={() => setAction('docente')} />
        <Button title={aula.estado === 'ACTIVA' ? 'Concluir aula' : 'Reactivar aula'} secondary disabled={locked} onPress={() => setAction('estado')} />
        <Text style={typography.body}>Concluir un aula conserva el contenido y bloquea nuevas publicaciones y cambios de matrícula. El cierre de una práctica es un proceso diferente.</Text>
        {action === 'docente' && <ContentForm title="Asignar docente responsable" fields={[{ key: 'profesorId', label: 'Nuevo docente responsable', choices: docentes.map(t => ({ value: t.id, label: `${t.nombres} ${t.apellidos} · ${t.email}` })) }]} initial={{ profesorId: aula.profesorId }} confirm="Confirmar docente responsable" validate={v => { if (v.profesorId === aula.profesorId || !docentes.some(t => t.id === v.profesorId)) throw new ApiError(400, 'Selecciona otro docente disponible.'); }} submit={(v, _key, signal) => asignarDocente(session!, aula, v.profesorId, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
        {action === 'estado' && <ContentForm title="Cambiar estado del aula" fields={[{ key: 'aula', label: 'Aula', readOnly: true }, { key: 'estado', label: 'Estado solicitado', readOnly: true }]} initial={{ aula: aula.nombre, estado: aula.estado === 'ACTIVA' ? 'Concluida' : 'Activa' }} confirm={aula.estado === 'ACTIVA' ? 'Confirmar conclusión del aula' : 'Confirmar reactivación del aula'} validate={() => {}} submit={(_v, _key, signal) => cambiarEstado(session!, aula, aula.estado === 'ACTIVA' ? 'CONCLUIDA' : 'ACTIVA', signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
        {!!action && <Button title="Cancelar cambio administrativo" secondary disabled={busy} onPress={() => setAction('')} />}
        <Text style={typography.title}>Matrículas · {roster.data?.matriculados ?? 0} estudiantes</Text>
        <Text style={typography.body}>Retirar una matrícula elimina el acceso y el avance de esa matrícula. Las entregas, asistencias y prácticas históricas se conservan.</Text>
        <Field label="Buscar estudiante para matrícula" value={search.value} editable={!locked} onChangeText={search.setValue} maxLength={120} placeholder="Nombre o correo" />
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{rosterFilters.map(f => <FilterChip key={f.value} title={f.label} selected={filter === f.value} disabled={locked} onPress={() => setFilter(f.value)} />)}</View>
        <QueryFeedback {...roster} loading={search.waiting || roster.loading && !roster.data} notFound="El padrón de matrícula no está disponible para tu cuenta." />
        {roster.data?.items.map(a => <Card key={a.alumnoId}>
          <Text style={typography.title}>{a.alumnoNombre}</Text><Text style={typography.body}>{a.email}</Text><Badge title={a.inscrito ? 'Matriculado' : 'Sin matrícula'} tone={a.inscrito ? 'success' : 'neutral'} />
          {action === `matricula:${a.alumnoId}` ? <ContentForm title={a.inscrito ? 'Retirar matrícula' : 'Matricular estudiante'} fields={[{ key: 'alumno', label: 'Estudiante', readOnly: true }, { key: 'aula', label: 'Aula', readOnly: true }, { key: 'accion', label: 'Operación solicitada', readOnly: true }]} initial={{ alumno: a.alumnoNombre, aula: aula.nombre, accion: a.inscrito ? 'Retirar matrícula' : 'Matricular' }} confirm={a.inscrito ? 'Confirmar retiro de matrícula' : 'Confirmar matrícula'} validate={() => {}} submit={(_v, _key, signal) => establecerMatricula(session!, roster.data!, a.alumnoId, !a.inscrito, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} /> : <Button title={`${a.inscrito ? 'Retirar matrícula' : 'Matricular'}: ${a.alumnoNombre}`} secondary disabled={locked || aula.estado !== 'ACTIVA'} onPress={() => setAction(`matricula:${a.alumnoId}`)} />}
        </Card>)}
        {roster.data && roster.data.items.length === 0 && !roster.loading && <Text style={typography.body}>{search.query ? 'No hay estudiantes que coincidan con la búsqueda.' : filter === 'MATRICULADOS' ? 'El aula no tiene estudiantes matriculados.' : 'No hay cuentas de alumno disponibles.'}</Text>}
        <PageFooter query={roster} noun="estudiantes" disabled={search.waiting || locked} />
        <Button title="Abrir aula docente" secondary disabled={locked} onPress={() => router.push({ pathname: '/aula-docente', params: { id } })} />
      </>}
      <Button title="Actualizar gestión del aula" secondary disabled={busy || query.loading || roster.loading} onPress={refresh} />
    </Screen>
  </View>;
}
