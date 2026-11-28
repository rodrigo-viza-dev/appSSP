import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from '@/features/alumno/components';
import { FilterChip, PageFooter, PagedList } from '@/features/alumno/paged-components';
import { useAppRouter } from '@/features/alumno/navigation';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { getAdminUsersPage, type AdminUsersPage, type UsuarioAdmin } from '@/services/administracion';
import { crearSupervisor, getCentroPage, guardarAsignacion, vincularSupervisor, type CentroPagina } from '@/services/asignaciones';
import { getPracticePage } from '@/services/staff-pages';
import type { PracticaExpediente } from '@/services/expedientes';
import type { Page } from '@/services/module-pages';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;
const stateLabel = (estado: string) => estado === 'CERRADA' ? 'Cerrada' : estado === 'LISTA_PARA_CIERRE' ? 'Lista para cierre' : 'En curso';
type Mode = null | { kind: 'cuenta' } | { kind: 'practica'; centro: CentroPagina } | { kind: 'vincular'; centro: CentroPagina };
type Item = CentroPagina | PracticaExpediente;

/** Asignaciones de administración: centros y prácticas por páginas, con selectores de búsqueda en lugar de listas completas. */
export function AdminAssignments() {
  const router = useAppRouter(), { session } = useAuth(), isAdmin = session?.user.role === 'ADMIN';
  const [view, setView] = useState<'centros' | 'practicas'>('centros'), [mode, setMode] = useState<Mode>(null);
  const [open, setOpen] = useState(''), [notice, setNotice] = useState('');
  const search = useSearch();
  const centros = usePagedQuery<CentroPagina>(`admin-centros:${search.query}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getCentroPage(x, search.query, signal, cursor), [search.query]), isAdmin && view === 'centros');
  const practicas = usePagedQuery<PracticaExpediente, Page<PracticaExpediente>>(`admin-practicas:${search.query}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getPracticePage(x, 'TODAS', search.query, signal, cursor), [search.query]), isAdmin && view === 'practicas');
  const saved = (message: string) => { setMode(null); setOpen(''); centros.retry(); practicas.retry(); setNotice(message); };
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  const choose = (next: 'centros' | 'practicas') => { setView(next); setOpen(''); search.setValue(''); };
  if (mode) return <AssignmentForm mode={mode} close={() => setMode(null)} saved={saved} />;
  const query = view === 'centros' ? centros : practicas;
  const rows: Item[] = search.waiting || !isAdmin ? [] : query.data?.items ?? [];
  return <PagedList<Item> title="Prácticas y supervisores" back={back} rows={rows}
    header={<>
      <Text style={s.muted}>Asigna prácticas a alumnos con centro registrado y vincula la cuenta que validará sus horas.</Text>
      {!isAdmin && <Text style={s.muted}>Sección exclusiva de administración.</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
      {isAdmin && <>
        <StudentGroup><StudentRow title="Crear cuenta de supervisor" subtitle="Para responsables de centros sin cuenta institucional" onPress={() => { setNotice(''); setMode({ kind: 'cuenta' }); }} /></StudentGroup>
        <View style={row}><FilterChip title="Centros" selected={view === 'centros'} onPress={() => choose('centros')} /><FilterChip title="Prácticas asignadas" selected={view === 'practicas'} onPress={() => choose('practicas')} /></View>
        <Field label={view === 'centros' ? 'Buscar centro o alumno' : 'Buscar práctica'} value={search.value} onChangeText={search.setValue} maxLength={120} placeholder={view === 'centros' ? 'Centro, alumno o correo' : 'Alumno, aula o periodo'} />
        <QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="Este servidor no ofrece la gestión de asignaciones actualizada." />
      </>}
    </>}
    render={item => {
      if (view === 'practicas') { const p = item as PracticaExpediente; return <StudentRow title={p.practicanteNombre} subtitle={`${p.aulaNombre} · ${p.periodo}\n${p.horasMinimas} h requeridas · ${stateLabel(p.estado)}`} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: p.id } })} />; }
      const c = item as CentroPagina, expanded = open === c.id;
      return <View>
        <StudentRow title={c.nombre} subtitle={`${c.alumnoNombre}\n${c.supervisorEmail ? 'Supervisa: ' + c.supervisorEmail : 'Sin cuenta de supervisor'}`} end={expanded ? 'Ocultar' : undefined} onPress={() => setOpen(expanded ? '' : c.id)} />
        {expanded && <View style={{ gap: 12, padding: 16 }}>
          <Text style={s.muted}>{`Alumno: ${c.alumnoEmail}\nContacto del centro: ${c.contacto}\nAulas activas del alumno: ${c.aulas.length ? c.aulas.map(a => a.nombre).join(', ') : 'ninguna'}`}</Text>
          <Button title="Asignar práctica" disabled={!c.aulas.length} onPress={() => { setNotice(''); setMode({ kind: 'practica', centro: c }); }} />
          {!c.aulas.length && <Text style={s.muted}>Primero matricula al alumno en un aula activa desde Usuarios y aulas.</Text>}
          <Button title={c.supervisorId ? 'Cambiar supervisor' : 'Vincular supervisor'} secondary onPress={() => { setNotice(''); setMode({ kind: 'vincular', centro: c }); }} />
        </View>}
      </View>;
    }}
    empty={isAdmin && query.data && !query.loading && !search.waiting ? <Text style={s.muted}>{search.query ? 'No hay resultados para la búsqueda.' : view === 'centros' ? 'Aún no hay centros. El alumno registra su centro desde Mi centro de prácticas.' : 'Aún no hay prácticas asignadas.'}</Text> : null}
    footer={isAdmin ? <><PageFooter query={query} noun={view === 'centros' ? 'centros' : 'prácticas'} disabled={search.waiting} /><Button title="Actualizar" secondary disabled={query.loading || search.waiting} onPress={query.retry} /></> : null} />;
}

function AssignmentForm({ mode, close, saved }: { mode: Exclude<Mode, null>; close: () => void; saved: (message: string) => void }) {
  const { session } = useAuth(), [busy, setBusy] = useState(false);
  if (mode.kind === 'vincular') return <SupervisorPicker centro={mode.centro} close={close} saved={saved} />;
  if (mode.kind === 'cuenta') return <StudentPage title="Cuenta de supervisor" subtitle="Ingresará con correo y contraseña" keyboard back={close}>
    <Text style={s.muted}>Comparte la contraseña inicial personalmente; la app no envía credenciales.</Text>
    <ContentForm title="Nueva cuenta" initial={{ nombres: '', apellidos: '', email: '', password: '' }} fields={[
      { key: 'nombres', label: 'Nombres', max: 100 }, { key: 'apellidos', label: 'Apellidos', max: 100 }, { key: 'email', label: 'Correo del supervisor', max: 255 }, { key: 'password', label: 'Contraseña inicial (10 a 72 caracteres)', secret: true, max: 72 },
    ]} confirm="Crear cuenta de supervisor" validate={v => { if (!v.nombres.trim() || !v.apellidos.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) || v.password.length < 10) throw new ApiError(400, 'Completa nombres, correo y una contraseña de al menos 10 caracteres.'); }}
      submit={(v, key, signal) => crearSupervisor(session!, v, key, signal)} onSaved={() => saved('Cuenta de supervisor creada. Ya puedes vincularla a un centro.')} refresh={close} onBusy={setBusy} />
    <Button title="Cancelar" secondary disabled={busy} onPress={close} />
  </StudentPage>;
  const c = mode.centro;
  return <StudentPage title="Asignar práctica" subtitle={`${c.alumnoNombre} · ${c.nombre}`} keyboard back={close}>
    <ContentForm title="Nueva práctica" initial={{ aulaId: c.aulas.length === 1 ? c.aulas[0].id : '', horasMinimas: '', motivo: '' }} fields={[
      { key: 'aulaId', label: 'Aula activa del alumno', choices: c.aulas.map(a => ({ value: a.id, label: `${a.nombre} · ${a.periodo}` })) },
      { key: 'horasMinimas', label: 'Horas requeridas según criterio académico', numeric: true, max: 4 }, { key: 'motivo', label: 'Fuente o fundamento de la asignación', multiline: true, max: 1000 },
    ]} confirm="Confirmar asignación de práctica" validate={v => { if (!v.aulaId || !/^\d+$/.test(v.horasMinimas) || Number(v.horasMinimas) < 1 || v.motivo.trim().length < 5) throw new ApiError(400, 'Completa el aula, las horas y el fundamento.'); }}
      submit={(v, key, signal) => guardarAsignacion(session!, c, v, key, signal)} onSaved={() => saved('Práctica asignada y confirmada por el servidor.')} refresh={close} onBusy={setBusy} />
    <Button title="Cancelar" secondary disabled={busy} onPress={close} />
  </StudentPage>;
}

/** Selector de cuenta de supervisión con búsqueda por páginas (nunca descarga todas las cuentas). */
function SupervisorPicker({ centro, close, saved }: { centro: CentroPagina; close: () => void; saved: (message: string) => void }) {
  const { session } = useAuth(), search = useSearch();
  const [chosen, setChosen] = useState<UsuarioAdmin | null | undefined>(undefined), [busy, setBusy] = useState(false);
  const users = usePagedQuery<UsuarioAdmin, AdminUsersPage>(`supervisores:${search.query}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getAdminUsersPage(x, 'SUPERVISOR', search.query, signal, cursor), [search.query]), chosen === undefined);
  if (chosen !== undefined) return <StudentPage title={chosen ? 'Vincular supervisor' : 'Desvincular supervisor'} subtitle={centro.nombre} keyboard back={() => setChosen(undefined)}>
    <Text style={s.muted}>{chosen ? `${chosen.nombres} ${chosen.apellidos} (${chosen.email}) podrá validar las horas de ${centro.alumnoNombre}.` : 'El centro quedará sin cuenta de supervisión.'}</Text>
    <ContentForm title="Confirmar cambio" initial={{ motivo: '' }} fields={[{ key: 'motivo', label: 'Motivo del cambio', multiline: true, max: 1000 }]} confirm="Confirmar vínculo y permisos"
      validate={v => { if (v.motivo.trim().length < 5) throw new ApiError(400, 'Explica el motivo del cambio.'); }}
      submit={(v, _key, signal) => vincularSupervisor(session!, centro, chosen ? chosen.id : null, v.motivo, signal)} onSaved={() => saved('Vínculo confirmado. Los permisos ya se aplicaron en el servidor.')} refresh={close} onBusy={setBusy} />
    <Button title="Elegir otra cuenta" secondary disabled={busy} onPress={() => setChosen(undefined)} />
  </StudentPage>;
  return <PagedList<UsuarioAdmin> title="Elegir supervisor" back={close} rows={search.waiting ? [] : users.data?.items ?? []}
    header={<>
      <Text style={s.muted}>{`${centro.nombre} · ${centro.alumnoNombre}\nActual: ${centro.supervisorEmail ?? 'sin cuenta vinculada'}`}</Text>
      <Field label="Buscar cuenta de supervisor" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Nombre o correo" />
      {centro.supervisorId && <StudentGroup><StudentRow title="Desvincular la cuenta actual" subtitle={centro.supervisorEmail ?? ''} onPress={() => setChosen(null)} /></StudentGroup>}
      <QueryFeedback {...users} loading={search.waiting || users.loading && !users.data} notFound="Las cuentas no están disponibles." />
    </>}
    render={u => <StudentRow title={`${u.nombres} ${u.apellidos}`} subtitle={u.email} end={u.id === centro.supervisorId ? 'Actual' : undefined} onPress={u.id === centro.supervisorId ? undefined : () => setChosen(u)} />}
    empty={users.data && !users.loading && !search.waiting ? <Text style={s.muted}>{search.query ? 'No hay cuentas que coincidan.' : 'No hay cuentas de supervisor. Crea una primero.'}</Text> : null}
    footer={<PageFooter query={users} noun="cuentas" disabled={search.waiting} />} />;
}
