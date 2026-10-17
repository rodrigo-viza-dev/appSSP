import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { asignarDocente, cambiarEstado, establecerMatricula, getAdminAula } from '@/services/administracion';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export default function AdminClassScreen() {
  const router = useRouter(), params = useLocalSearchParams<{ aulaId?: string }>(), { session } = useAuth();
  const id = typeof params.aulaId === 'string' ? params.aulaId : '';
  const query = useSessionQuery(`admin-aula:${id}`, useCallback((s: Session, signal: AbortSignal) => getAdminAula(s, id, signal), [id]), session?.user.role === 'ADMIN' && !!id);
  const [action, setAction] = useState(''), [busy, setBusy] = useState(false), [search, setSearch] = useState(''), [filter, setFilter] = useState<'all' | 'in' | 'out'>('all'), [notice, setNotice] = useState('');
  const data = query.data, aula = data?.aula, teachers = data?.users.filter(u => u.role === 'PROFESOR') ?? [];
  const refresh = () => { setAction(''); setNotice(''); query.retry(); };
  const saved = () => { refresh(); setNotice('Cambio guardado y confirmado por el servidor.'); };
  const locked = busy || !!action;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Gestionar aula" subtitle="Responsable, estado y acceso" back={() => router.canGoBack() ? router.back() : router.replace('/administracion')} />
    <Screen>
      {!id && <Text style={typography.error}>Abre el aula desde Administración académica.</Text>}
      <QueryFeedback {...query} notFound="El aula no está disponible." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {data && aula && <>
        <Card><Text style={typography.title}>{aula.nombre}</Text><Text style={typography.body}>{aula.codigo} · {aula.periodo}</Text><Text style={typography.body}>{aula.descripcion}</Text><Text style={typography.body}>Docente: {aula.profesorNombre}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" /></Card>
        <Button title="Cambiar docente responsable" secondary disabled={locked || teachers.length === 0} onPress={() => setAction('docente')} />
        <Button title={aula.estado === 'ACTIVA' ? 'Concluir aula' : 'Reactivar aula'} secondary disabled={locked} onPress={() => setAction('estado')} />
        <Text style={typography.body}>Concluir un aula conserva el contenido y bloquea nuevas publicaciones y cambios de matrícula. El cierre de una práctica es un proceso diferente.</Text>
        {action === 'docente' && <ContentForm title="Asignar docente responsable" fields={[{ key: 'profesorId', label: 'Nuevo docente responsable', choices: teachers.map(t => ({ value: t.id, label: `${t.nombres} ${t.apellidos} · ${t.email}` })) }]} initial={{ profesorId: aula.profesorId }} confirm="Confirmar docente responsable" validate={v => { if (v.profesorId === aula.profesorId || !teachers.some(t => t.id === v.profesorId)) throw new ApiError(400, 'Selecciona otro docente disponible.'); }} submit={(v, _key, signal) => asignarDocente(session!, aula, v.profesorId, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
        {action === 'estado' && <ContentForm title="Cambiar estado del aula" fields={[{ key: 'aula', label: 'Aula', readOnly: true }, { key: 'estado', label: 'Estado solicitado', readOnly: true }]} initial={{ aula: aula.nombre, estado: aula.estado === 'ACTIVA' ? 'Concluida' : 'Activa' }} confirm={aula.estado === 'ACTIVA' ? 'Confirmar conclusión del aula' : 'Confirmar reactivación del aula'} validate={() => {}} submit={(_v, _key, signal) => cambiarEstado(session!, aula, aula.estado === 'ACTIVA' ? 'CONCLUIDA' : 'ACTIVA', signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
        {!!action && <Button title="Cancelar cambio administrativo" secondary disabled={busy} onPress={() => setAction('')} />}
        <Text style={typography.title}>Matrículas · {data.matriculas.alumnos.filter(a => a.inscrito).length} estudiantes</Text>
        <Text style={typography.body}>Retirar una matrícula elimina el acceso actual al aula. Las entregas, asistencias y prácticas históricas se conservan.</Text>
        <Field label="Buscar estudiante para matrícula" value={search} editable={!locked} onChangeText={setSearch} placeholder="Nombre o correo" />
        <View style={{ gap: 8 }}>{([['all', 'Todos los estudiantes'], ['in', 'Matriculados'], ['out', 'Sin matrícula']] as const).map(([value, title]) => <Button key={value} title={title} secondary={filter !== value} disabled={locked} onPress={() => setFilter(value)} />)}</View>
        {data.matriculas.alumnos.filter(a => (filter === 'all' || a.inscrito === (filter === 'in')) && `${a.alumnoNombre} ${a.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(a => <Card key={a.alumnoId}>
          <Text style={typography.title}>{a.alumnoNombre}</Text><Text style={typography.body}>{a.email}</Text><Badge title={a.inscrito ? 'Matriculado' : 'Sin matrícula'} tone={a.inscrito ? 'success' : 'neutral'} />
          {action === `matricula:${a.alumnoId}` ? <ContentForm title={a.inscrito ? 'Retirar matrícula' : 'Matricular estudiante'} fields={[{ key: 'alumno', label: 'Estudiante', readOnly: true }, { key: 'aula', label: 'Aula', readOnly: true }, { key: 'accion', label: 'Operación solicitada', readOnly: true }]} initial={{ alumno: a.alumnoNombre, aula: aula.nombre, accion: a.inscrito ? 'Retirar matrícula' : 'Matricular' }} confirm={a.inscrito ? 'Confirmar retiro de matrícula' : 'Confirmar matrícula'} validate={() => {}} submit={(_v, _key, signal) => establecerMatricula(session!, data.matriculas, a.alumnoId, !a.inscrito, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} /> : <Button title={`${a.inscrito ? 'Retirar matrícula' : 'Matricular'}: ${a.alumnoNombre}`} secondary disabled={locked || aula.estado !== 'ACTIVA'} onPress={() => setAction(`matricula:${a.alumnoId}`)} />}
        </Card>)}
        {data.matriculas.alumnos.length === 0 && <Text style={typography.body}>No hay cuentas de alumno disponibles.</Text>}
        <Button title="Abrir aula docente" secondary disabled={locked} onPress={() => router.push({ pathname: '/aula-docente', params: { id } })} />
      </>}
      <Button title="Actualizar gestión del aula" secondary disabled={busy || query.loading} onPress={refresh} />
    </Screen>
  </View>;
}
