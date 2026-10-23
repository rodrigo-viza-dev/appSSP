import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getAulasMensajes, getContactos } from '@/services/mensajes';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

function MessagesScreenContent() {
  const router = useAppRouter(), { session } = useAuth(), params = useLocalSearchParams<{ aulaId?: string }>();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : ''), [search, setSearch] = useState(''), [unreadOnly, setUnreadOnly] = useState(false);
  const aulas = useSessionQuery('mensajes-aulas', useCallback(getAulasMensajes, []), !!session && ['ALUMNO', 'PROFESOR'].includes(session.user.role));
  const aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0], id = aula?.id ?? '';
  const contacts = useSessionQuery(`mensajes-contactos:${id}`, useCallback((s: Session, signal: AbortSignal) => getContactos(s, id, signal), [id]), !!aula);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { if (focused.current) contacts.retry(); focused.current = true; }, [contacts.retry]));
  const rows = contacts.data?.filter(c => (!unreadOnly || c.noLeidos > 0) && c.nombre.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Mensajes académicos" subtitle="Conversaciones privadas del aula" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <Text style={typography.body}>Comunícate con el docente responsable o con tus alumnos matriculados. Actualiza para consultar mensajes nuevos.</Text>
      <QueryFeedback {...aulas} notFound="Este servidor todavía no ofrece la mensajería actualizada." />
      {aulas.data?.length === 0 && <Text style={typography.body}>No tienes aulas disponibles para mensajería.</Text>}
      {(aulas.data?.length ?? 0) > 1 && aulas.data!.map(a => <Button key={a.id} title={`Mensajes: ${a.nombre} · ${a.periodo}`} secondary={a.id !== id} onPress={() => { setSelected(a.id); setSearch(''); }} />)}
      {!!selected && aulas.data && !aula && <Text style={typography.error}>El aula no está disponible para tu cuenta.</Text>}
      {aula && <>
        <Card><Text style={typography.title}>{aula.nombre}</Text><Text style={typography.body}>{aula.periodo}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Aula activa' : 'Aula concluida · solo consulta'} tone="neutral" /><Text style={typography.title}>{contacts.data?.reduce((n, c) => n + c.noLeidos, 0) ?? 0} mensajes sin leer</Text></Card>
        <QueryFeedback {...contacts} notFound="Los contactos no están disponibles." />
        {session?.user.role !== 'ALUMNO' && <Field label="Buscar contacto académico" value={search} onChangeText={setSearch} placeholder="Nombre del docente o estudiante" />}
        <Button title={unreadOnly ? 'Mostrar todos los contactos' : 'Mostrar solo conversaciones sin leer'} secondary onPress={() => setUnreadOnly(v => !v)} />
        {rows?.map(c => <Card key={c.userId}><Text style={typography.title}>{c.nombre}</Text><Badge title={c.noLeidos ? `${c.noLeidos} sin leer` : 'Sin mensajes pendientes de lectura'} tone={c.noLeidos ? 'warning' : 'neutral'} /><Button title={`Conversar con: ${c.nombre}`} secondary onPress={() => router.push({ pathname: '/conversacion', params: { aulaId: id, contactoId: c.userId } })} /></Card>)}
        {contacts.data && rows?.length === 0 && <Text style={typography.body}>{contacts.data.length ? 'No hay contactos para esta consulta.' : 'No hay contactos disponibles en esta aula.'}</Text>}
        <Button title="Actualizar mensajes académicos" secondary disabled={contacts.loading || aulas.loading} onPress={() => { aulas.retry(); contacts.retry(); }} />
      </>}
    </Screen>
  </View>;
}

export default function MessagesScreen(){return <StudentLegacyRoute route="/mensajes"><MessagesScreenContent /></StudentLegacyRoute>;}
