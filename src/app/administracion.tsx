import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { FilterChip, PageFooter } from '@/features/alumno/paged-components';
import { cambiarRol, crearAula, getAdminAulasPage, getAdminTeachers, getAdminUsersPage, roleChoices, roleLabel, validateAula, type AdminAulasPage, type AdminUsersPage, type UsuarioAdmin } from '@/services/administracion';
import type { AulaDocente } from '@/services/docencia';
import { ApiError } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

type AulaFilter = 'TODAS' | 'ACTIVA' | 'CONCLUIDA';
const aulaFilters: { value: AulaFilter; label: string }[] = [{ value: 'TODAS', label: 'Todas las aulas' }, { value: 'ACTIVA', label: 'Aulas activas' }, { value: 'CONCLUIDA', label: 'Aulas concluidas' }];

export default function AdminScreen() { return <StudentLegacyRoute route="/administracion"><AdminScreenContent /></StudentLegacyRoute>; }
function AdminScreenContent() {
  const router = useRouter(), { session } = useAuth();
  const admin = session?.user.role === 'ADMIN';
  const [tab, setTab] = useState<'aulas' | 'usuarios'>('aulas'), [creating, setCreating] = useState(false), [editing, setEditing] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [aulaFilter, setAulaFilter] = useState<AulaFilter>('TODAS'), [userFilter, setUserFilter] = useState<string>('TODOS');
  const aulaSearch = useSearch(), userSearch = useSearch();
  const aulas = usePagedQuery<AulaDocente, AdminAulasPage>(`admin-aulas:${aulaFilter}:${aulaSearch.query}`, useCallback((s, signal, cursor) => getAdminAulasPage(s, aulaFilter, aulaSearch.query, signal, cursor), [aulaFilter, aulaSearch.query]), admin && tab === 'aulas');
  const usuarios = usePagedQuery<UsuarioAdmin, AdminUsersPage>(`admin-usuarios:${userFilter}:${userSearch.query}`, useCallback((s, signal, cursor) => getAdminUsersPage(s, userFilter, userSearch.query, signal, cursor), [userFilter, userSearch.query]), admin && tab === 'usuarios');
  const teachers = useSessionQuery('admin-docentes', useCallback(getAdminTeachers, []), admin);
  const docentes = teachers.data?.items ?? [];
  const locked = busy || creating || !!editing;
  const refresh = () => { setCreating(false); setEditing(''); setNotice(''); if (tab === 'aulas') aulas.retry(); else usuarios.retry(); };
  const saved = () => { refresh(); setNotice('Cambio guardado y confirmado por el servidor.'); };
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Administración académica" subtitle="Usuarios, aulas y matrículas" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <Text style={typography.body}>Organiza responsables, periodos y acceso a las aulas. Cada cambio efectivo queda en la auditoría.</Text>
      <Button title="Asignar prácticas y vincular supervisores" secondary onPress={() => router.push('/asignaciones')} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      <View style={{ gap: 8, flexDirection: 'row' }}><Button title="Gestionar aulas" secondary={tab !== 'aulas'} disabled={locked} onPress={() => { setTab('aulas'); setCreating(false); setEditing(''); setNotice(''); }} /><Button title="Directorio de usuarios" secondary={tab !== 'usuarios'} disabled={locked} onPress={() => { setTab('usuarios'); setCreating(false); setEditing(''); setNotice(''); }} /></View>
      {tab === 'aulas' ? <>
        <Field label="Buscar aula en administración" value={aulaSearch.value} editable={!locked} onChangeText={aulaSearch.setValue} maxLength={120} placeholder="Nombre, código, periodo o docente" />
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{aulaFilters.map(f => <FilterChip key={f.value} title={f.label} selected={aulaFilter === f.value} disabled={locked} onPress={() => setAulaFilter(f.value)} />)}</View>
        <QueryFeedback {...aulas} loading={aulaSearch.waiting || aulas.loading && !aulas.data} notFound="La administración de aulas no está disponible para tu cuenta." />
        {aulas.data && <Card><Text style={typography.title}>{aulas.data.total} aulas · {aulas.data.aulasActivas} activas</Text><Text style={typography.body}>Los totales cuentan todo el sistema, no solo la página visible.</Text></Card>}
        {creating ? <>
          {teachers.loading && <Text style={typography.body}>Cargando cuentas docentes…</Text>}
          {!teachers.loading && docentes.length === 0 && <Text style={typography.body}>Asigna el rol de docente a una cuenta disponible antes de crear un aula.</Text>}
          {docentes.length > 0 && <ContentForm title="Nueva aula" fields={[{ key: 'nombre', label: 'Nombre del aula', max: 200 }, { key: 'codigo', label: 'Código del aula', max: 50 }, { key: 'periodo', label: 'Periodo académico', max: 20 }, { key: 'profesorId', label: 'Docente responsable', choices: docentes.map(u => ({ value: u.id, label: `${u.nombres} ${u.apellidos} · ${u.email}` })) }, { key: 'descripcion', label: 'Descripción del aula', multiline: true, max: 4000 }]} initial={{ nombre: '', codigo: '', periodo: '', profesorId: docentes[0]?.id ?? '', descripcion: '' }} confirm="Confirmar creación de aula" validate={v => validateAula(v, docentes)} submit={(v, key, signal) => crearAula(session!, docentes, v, key, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
          {!!teachers.data?.siguiente && <Text style={typography.body}>Se listan las primeras 40 cuentas docentes en orden alfabético.</Text>}
          <Button title="Cancelar creación de aula" secondary disabled={busy} onPress={() => setCreating(false)} />
        </> : <Button title="Crear aula" disabled={locked || docentes.length === 0} onPress={() => setCreating(true)} />}
        {aulas.data?.items.map(a => <Card key={a.id}>
          <Text style={typography.title}>{a.nombre}</Text><Text style={typography.body}>{a.codigo} · {a.periodo}</Text><Text style={typography.body}>{a.profesorNombre} · {a.inscritos} estudiantes matriculados</Text><Badge title={a.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" />
          <Button title={`Administrar aula: ${a.nombre}`} secondary disabled={locked} onPress={() => router.push({ pathname: '/administrar-aula', params: { aulaId: a.id } })} />
        </Card>)}
        {aulas.data && aulas.data.items.length === 0 && !aulas.loading && <Text style={typography.body}>{aulaSearch.query ? 'No hay aulas que coincidan con la búsqueda.' : 'Todavía no hay aulas. Crea la primera con su docente responsable.'}</Text>}
        <PageFooter query={aulas} noun="aulas" disabled={aulaSearch.waiting || locked} />
      </> : <>
        <Field label="Buscar usuario" value={userSearch.value} editable={!locked} onChangeText={userSearch.setValue} maxLength={120} placeholder="Nombre o correo" />
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{[{ value: 'TODOS', label: 'Todos los roles' }, ...roleChoices].map(f => <FilterChip key={f.value} title={f.label} selected={userFilter === f.value} disabled={locked} onPress={() => setUserFilter(f.value)} />)}</View>
        <QueryFeedback {...usuarios} loading={userSearch.waiting || usuarios.loading && !usuarios.data} notFound="El directorio no está disponible para tu cuenta." />
        {usuarios.data && <Card><Text style={typography.title}>{usuarios.data.total} usuarios · {usuarios.data.totalDocentes} docentes</Text><Text style={typography.body}>Los totales cuentan todo el sistema, no solo la página visible.</Text></Card>}
        <Text style={typography.body}>Los roles definen los permisos de la cuenta. No puedes cambiar tu propio rol ni cambiar una cuenta mientras conserve asignaciones académicas incompatibles.</Text>
        {usuarios.data?.items.map(u => <Card key={`${u.id}:${u.role}`}>
          <Text style={typography.title}>{u.nombres} {u.apellidos}</Text><Text style={typography.body}>{u.email}</Text><Badge title={roleLabel(u.role)} tone="neutral" />
          {editing === u.id ? <>
            <ContentForm title={`Cambiar rol de ${u.nombres}`} fields={[{ key: 'role', label: 'Nuevo rol', choices: roleChoices }]} initial={{ role: u.role }} confirm="Confirmar cambio de rol" validate={v => { if (!roleChoices.some(r => r.value === v.role) || v.role === u.role) throw new ApiError(400, 'Selecciona un rol diferente.'); }} submit={(v, _key, signal) => cambiarRol(session!, u, v.role, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
            <Button title="Cancelar cambio de rol" secondary disabled={busy} onPress={() => setEditing('')} />
          </> : u.id === session?.user.id ? <Text style={typography.body}>Esta es tu cuenta de administración.</Text> : <Button title={`Cambiar rol: ${u.nombres} ${u.apellidos}`} secondary disabled={locked} onPress={() => setEditing(u.id)} />}
        </Card>)}
        {usuarios.data && usuarios.data.items.length === 0 && !usuarios.loading && <Text style={typography.body}>{userSearch.query ? 'No hay cuentas que coincidan con la búsqueda.' : 'No hay cuentas en este filtro.'}</Text>}
        <PageFooter query={usuarios} noun="usuarios" disabled={userSearch.waiting || locked} />
      </>}
      <Button title="Ver reporte institucional" secondary disabled={locked} onPress={() => router.push('/reportes')} />
      <Button title="Actualizar administración" secondary disabled={busy || (tab === 'aulas' ? aulas.loading : usuarios.loading)} onPress={refresh} />
    </Screen>
  </View>;
}
