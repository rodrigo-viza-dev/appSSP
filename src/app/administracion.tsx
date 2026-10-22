import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { cambiarRol, crearAula, getAdminData, roleChoices, roleLabel, validateAula } from '@/services/administracion';
import { ApiError } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export default function AdminScreen() {
  const router = useRouter(), { session } = useAuth();
  const query = useSessionQuery('administracion', useCallback(getAdminData, []), session?.user.role === 'ADMIN');
  const [tab, setTab] = useState<'aulas' | 'usuarios'>('aulas'), [search, setSearch] = useState(''), [filter, setFilter] = useState('TODOS');
  const [creating, setCreating] = useState(false), [editing, setEditing] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const refresh = () => { setCreating(false); setEditing(''); setNotice(''); query.retry(); };
  const saved = () => { refresh(); setNotice('Cambio guardado y confirmado por el servidor.'); };
  const data = query.data, teachers = data?.users.filter(u => u.role === 'PROFESOR') ?? [];
  const match = (value: string) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const locked = busy || creating || !!editing;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Administración académica" subtitle="Usuarios, aulas y matrículas" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <Text style={typography.body}>Organiza responsables, periodos y acceso a las aulas. Cada cambio efectivo queda en la auditoría.</Text>
      <Button title="Asignar prácticas y vincular supervisores" secondary onPress={() => router.push('/asignaciones')} />
      <QueryFeedback {...query} notFound="Este servidor todavía no ofrece la administración actualizada." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {data && <>
        <Card><Text style={typography.title}>{data.users.length} usuarios · {data.aulas.length} aulas</Text><Text style={typography.body}>{teachers.length} docentes · {data.aulas.filter(a => a.estado === 'ACTIVA').length} aulas activas</Text></Card>
        <View style={{ gap: 8, flexDirection: 'row' }}><Button title="Gestionar aulas" secondary={tab !== 'aulas'} disabled={locked} onPress={() => { setTab('aulas'); setSearch(''); setFilter('TODOS'); }} /><Button title="Directorio de usuarios" secondary={tab !== 'usuarios'} disabled={locked} onPress={() => { setTab('usuarios'); setSearch(''); setFilter('TODOS'); }} /></View>
        <Field label="Buscar en administración" value={search} editable={!locked} onChangeText={setSearch} placeholder={tab === 'aulas' ? 'Nombre, código, periodo o docente' : 'Nombre o correo'} />
        {tab === 'aulas' ? <>
          <View style={{ gap: 8 }}>{[{ value: 'TODOS', label: 'Todas las aulas' }, { value: 'ACTIVA', label: 'Aulas activas' }, { value: 'CONCLUIDA', label: 'Aulas concluidas' }].map(f => <Button key={f.value} title={f.label} secondary={filter !== f.value} disabled={locked} onPress={() => setFilter(f.value)} />)}</View>
          {!creating && <Button title="Crear aula" disabled={locked || teachers.length === 0} onPress={() => setCreating(true)} />}
          {teachers.length === 0 && <Text style={typography.body}>Asigna el rol de docente a una cuenta disponible antes de crear un aula.</Text>}
          {creating && <>
            <ContentForm title="Nueva aula" fields={[{ key: 'nombre', label: 'Nombre del aula', max: 200 }, { key: 'codigo', label: 'Código del aula', max: 50 }, { key: 'periodo', label: 'Periodo académico', max: 20 }, { key: 'profesorId', label: 'Docente responsable', choices: teachers.map(u => ({ value: u.id, label: `${u.nombres} ${u.apellidos} · ${u.email}` })) }, { key: 'descripcion', label: 'Descripción del aula', multiline: true, max: 4000 }]} initial={{ nombre: '', codigo: '', periodo: '', profesorId: teachers[0]?.id ?? '', descripcion: '' }} confirm="Confirmar creación de aula" validate={v => validateAula(v, data.users)} submit={(v, key, signal) => crearAula(session!, data.users, v, key, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
            <Button title="Cancelar creación de aula" secondary disabled={busy} onPress={() => setCreating(false)} />
          </>}
          {data.aulas.filter(a => (filter === 'TODOS' || a.estado === filter) && match(`${a.nombre} ${a.codigo} ${a.periodo} ${a.profesorNombre}`)).map(a => <Card key={a.id}>
            <Text style={typography.title}>{a.nombre}</Text><Text style={typography.body}>{a.codigo} · {a.periodo}</Text><Text style={typography.body}>{a.profesorNombre} · {a.inscritos} estudiantes matriculados</Text><Badge title={a.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" />
            <Button title={`Administrar aula: ${a.nombre}`} secondary disabled={locked} onPress={() => router.push({ pathname: '/administrar-aula', params: { aulaId: a.id } })} />
          </Card>)}
          {data.aulas.length === 0 && <Text style={typography.body}>Todavía no hay aulas. Crea la primera con su docente responsable.</Text>}
        </> : <>
          <View style={{ gap: 8 }}>{[{ value: 'TODOS', label: 'Todos los roles' }, ...roleChoices].map(f => <Button key={f.value} title={f.label} secondary={filter !== f.value} disabled={locked} onPress={() => setFilter(f.value)} />)}</View>
          <Text style={typography.body}>Los roles definen los permisos de la cuenta. No puedes cambiar tu propio rol ni cambiar una cuenta mientras conserve asignaciones académicas incompatibles.</Text>
          {data.users.filter(u => (filter === 'TODOS' || u.role === filter) && match(`${u.nombres} ${u.apellidos} ${u.email}`)).map(u => <Card key={`${u.id}:${u.role}`}>
            <Text style={typography.title}>{u.nombres} {u.apellidos}</Text><Text style={typography.body}>{u.email}</Text><Badge title={roleLabel(u.role)} tone="neutral" />
            {editing === u.id ? <>
              <ContentForm title={`Cambiar rol de ${u.nombres}`} fields={[{ key: 'role', label: 'Nuevo rol', choices: roleChoices }]} initial={{ role: u.role }} confirm="Confirmar cambio de rol" validate={v => { if (!roleChoices.some(r => r.value === v.role) || v.role === u.role) throw new ApiError(400, 'Selecciona un rol diferente.'); }} submit={(v, _key, signal) => cambiarRol(session!, u, v.role, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
              <Button title="Cancelar cambio de rol" secondary disabled={busy} onPress={() => setEditing('')} />
            </> : u.id === session?.user.id ? <Text style={typography.body}>Esta es tu cuenta de administración.</Text> : <Button title={`Cambiar rol: ${u.nombres} ${u.apellidos}`} secondary disabled={locked} onPress={() => setEditing(u.id)} />}
          </Card>)}
        </>}
        <Button title="Ver reporte institucional" secondary disabled={locked} onPress={() => router.push('/reportes')} />
      </>}
      <Button title="Actualizar administración" secondary disabled={busy || query.loading} onPress={refresh} />
    </Screen>
  </View>;
}
