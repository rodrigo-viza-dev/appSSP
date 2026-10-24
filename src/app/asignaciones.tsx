import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Screen } from '@/components/screen';
import { Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getAsignaciones, guardarAsignacion } from '@/services/asignaciones';
import { ApiError, request } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';
export default function AsignacionesScreen() { return <StudentLegacyRoute route="/asignaciones"><AsignacionesScreenContent /></StudentLegacyRoute>; }
function AsignacionesScreenContent() {
  const router = useRouter(), { session } = useAuth();
  const query = useSessionQuery('asignaciones', useCallback(getAsignaciones, []), session?.user.role === 'ADMIN');
  const [mode, setMode] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const data = query.data;
  const refresh = () => { setMode(''); query.retry(); };
  const saved = () => { refresh(); setNotice('Cambio confirmado. La cuenta y sus permisos ya están vinculados en el servidor.'); };
  return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Prácticas y supervisores" subtitle="Asignación y acceso" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} /><Screen>
    <QueryFeedback {...query} notFound="Este servidor no ofrece la gestión de asignaciones." />
    {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
    {data && <>
      <Text style={typography.body}>Asigna una práctica a un alumno matriculado y conecta el centro con la cuenta que revisará sus horas. Las horas requeridas deben proceder del criterio académico confirmado.</Text>
      {!mode && <><Button title="Asignar práctica" onPress={() => setMode('practica')} disabled={!data.centros.length} /><Button title="Crear cuenta de supervisor" secondary onPress={() => setMode('supervisor')} /></>}
      {mode === 'practica' && <ContentForm title="Nueva práctica" initial={{ empresaId: '', aulaId: '', horasMinimas: '', motivo: '' }} fields={[
        { key: 'empresaId', label: 'Alumno y centro registrado', choices: data.centros.map(c => ({ value: c.id, label: `${data.users.find(u => u.id === c.alumnoId)?.nombres ?? c.alumnoId} · ${c.nombre}` })) },
        { key: 'aulaId', label: 'Aula activa donde está matriculado', choices: data.aulas.filter(a => a.estado === 'ACTIVA').map(a => ({ value: a.id, label: `${a.nombre} · ${a.periodo}` })) },
        { key: 'horasMinimas', label: 'Horas requeridas según criterio académico', numeric: true, max: 4 }, { key: 'motivo', label: 'Fuente o fundamento de la asignación', multiline: true, max: 1000 },
      ]} confirm="Confirmar asignación de práctica" validate={v => { if (!v.empresaId || !v.aulaId || !/^\d+$/.test(v.horasMinimas) || Number(v.horasMinimas) < 1 || v.motivo.trim().length < 5) throw new ApiError(400, 'Completa el centro, aula, horas y fundamento.'); }} submit={(v, key, signal) => guardarAsignacion(session!, v, data.centros, key, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
      {mode === 'supervisor' && <><Text style={typography.body}>Esta cuenta ingresará con correo y contraseña SSP, también si usa correo externo. Comparte la contraseña inicial personalmente; la app no envía credenciales.</Text><ContentForm title="Cuenta de supervisor" initial={{ nombres: '', apellidos: '', email: '', password: '' }} fields={[
        { key: 'nombres', label: 'Nombres', max: 100 }, { key: 'apellidos', label: 'Apellidos', max: 100 }, { key: 'email', label: 'Correo del supervisor', max: 255 }, { key: 'password', label: 'Contraseña inicial SSP (10 a 72 caracteres)', secret: true, max: 72 },
      ]} confirm="Crear cuenta de supervisor" validate={v => { if (!v.nombres.trim() || !v.apellidos.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) || v.password.length < 10) throw new ApiError(400, 'Completa nombres, correo y contraseña.'); }} submit={(v, key, signal) => request('/admin/supervisores', session!.token, { ...v, email: v.email.trim(), solicitudId: key }, signal, { expectedStatus: 201 })} onSaved={saved} refresh={refresh} onBusy={setBusy} /></>}
      <Text style={typography.title}>Centros y cuentas vinculadas</Text>
      {!data.centros.length && <Text style={typography.body}>El alumno debe registrar primero su centro desde Mi centro de prácticas.</Text>}
      {data.centros.map(c => <Card key={c.id}><Text style={typography.title}>{c.nombre}</Text><Text style={typography.body}>{data.users.find(u => u.id === c.alumnoId)?.email ?? c.alumnoId}</Text><Text style={typography.body}>Contacto: {c.contacto}</Text><Text style={typography.body}>Acceso: {c.supervisorId ? data.users.find(u => u.id === c.supervisorId)?.email ?? 'Cuenta vinculada' : 'Sin cuenta vinculada'}</Text>
        {mode === c.id ? <ContentForm title="Vincular acceso del supervisor" initial={{ userId: c.supervisorId ?? '', motivo: '' }} fields={[
          { key: 'userId', label: 'Cuenta que tendrá acceso', choices: [{ value: '', label: 'Desvincular cuenta' }, ...data.users.filter(u => u.role === 'SUPERVISOR').map(u => ({ value: u.id, label: `${u.nombres} ${u.apellidos} · ${u.email}` }))] }, { key: 'motivo', label: 'Motivo del cambio', max: 1000, multiline: true },
        ]} confirm="Confirmar vínculo y permisos" validate={v => { if (v.motivo.trim().length < 5 || (v.userId || null) === c.supervisorId) throw new ApiError(400, 'Selecciona un vínculo distinto y explica el motivo.'); }} submit={(v, _key, signal) => request(`/admin/centros/${encodeURIComponent(c.id)}/supervisor`, session!.token, { userId: v.userId || null, anterior: c.supervisorId, motivo: v.motivo.trim() }, signal, { method: 'PUT' })} onSaved={saved} refresh={refresh} onBusy={setBusy} /> : <Button title={`Vincular supervisor: ${c.nombre}`} secondary disabled={!!mode} onPress={() => setMode(c.id)} />}
      </Card>)}
      <Text style={typography.title}>Prácticas asignadas</Text>
      {data.practicas.map(p => <Card key={p.id}><Text style={typography.title}>{p.practicanteNombre}</Text><Text style={typography.body}>{p.aulaNombre} · {p.periodo} · {p.horasMinimas} h requeridas</Text><Text style={typography.body}>{p.estado.replaceAll('_', ' ')}</Text></Card>)}
      {!!mode && <Button title="Cancelar edición" secondary disabled={busy} onPress={() => setMode('')} />}
      <Button title="Actualizar asignaciones" secondary disabled={busy} onPress={refresh} />
    </>}
  </Screen></View>;
}
