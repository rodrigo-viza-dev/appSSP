import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Badge, Button, Field, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from '@/features/alumno/components';
import { FilterChip, ListHeading, PageFooter, PagedList } from '@/features/alumno/paged-components';
import { useAppRouter } from '@/features/alumno/navigation';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { contentText } from '@/services/comunidad';
import { enviarMensaje, getAulasMensajes, getChatContext, getContactPage, leerMensajes, type ContactPage, type ContactoPagina, type Mensaje } from '@/services/mensajes';
import { getDirectMessagePage } from '@/services/module-pages';
import { getPracticePage } from '@/services/staff-pages';
import type { Page } from '@/services/module-pages';
import type { PracticaExpediente } from '@/services/expedientes';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;

/** Contactos del docente: alumnos matriculados por páginas, búsqueda y no leídos calculados en el servidor. */
export function StaffMessages() {
  const router = useAppRouter(), { session } = useAuth(), params = useLocalSearchParams<{ aulaId?: string }>();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : ''), [unreadOnly, setUnreadOnly] = useState(false);
  const search = useSearch();
  const aulas = useSessionQuery('mensajes-aulas', useCallback(getAulasMensajes, []), session?.user.role === 'PROFESOR');
  const aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0], id = aula?.id ?? '';
  const contacts = usePagedQuery<ContactoPagina, ContactPage>(`contactos:${id}:${unreadOnly}:${search.query}`,
    useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getContactPage(x, id, search.query, unreadOnly, signal, cursor), [id, search.query, unreadOnly]), !!aula);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { if (focused.current) contacts.retry(); focused.current = true; }, [contacts.retry]));
  const choose = (value: string) => { setSelected(value); setUnreadOnly(false); search.setValue(''); };
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  return <PagedList<ContactoPagina> title="Mensajes" back={back} rows={!aula || search.waiting ? [] : contacts.data?.items ?? []}
    header={<>
      <Text style={s.muted}>Conversaciones privadas con los alumnos matriculados en tus aulas.</Text>
      {session && session.user.role !== 'PROFESOR' && <Text style={s.muted}>La mensajería privada vincula al docente responsable con sus alumnos. Esta cuenta no tiene conversaciones.</Text>}
      <QueryFeedback {...aulas} notFound="Este servidor todavía no ofrece la mensajería actualizada." />
      {aulas.data?.length === 0 && <Text style={s.muted}>No tienes aulas a tu cargo para mensajería.</Text>}
      {aulas.data && (aulas.data.length > 1 || !!selected && !aula) && <StudentGroup>{aulas.data.map(a => <StudentRow key={a.id} title={a.nombre} subtitle={a.periodo} end={a.id === id ? 'Actual' : undefined} onPress={() => choose(a.id)} />)}</StudentGroup>}
      {!!selected && aulas.data && !aula && <Text accessibilityRole="alert" style={typography.error}>El aula no está disponible para tu cuenta.</Text>}
      {aula && <>
        <Text accessibilityRole="header" style={s.sectionTitle}>{aula.nombre}</Text>
        <View style={row}>
          <Badge title={aula.estado === 'ACTIVA' ? 'Aula activa' : 'Aula concluida · Solo consulta'} tone="neutral" />
          {contacts.data && <Badge title={contacts.data.noLeidos ? `${contacts.data.noLeidos} mensajes sin leer` : 'Sin mensajes por leer'} tone={contacts.data.noLeidos ? 'warning' : 'neutral'} />}
        </View>
        <Field label="Buscar alumno" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Nombre o correo" />
        <View style={row}><FilterChip title="Todos" selected={!unreadOnly} onPress={() => setUnreadOnly(false)} /><FilterChip title="Sin leer" selected={unreadOnly} onPress={() => setUnreadOnly(true)} /></View>
        <QueryFeedback {...contacts} loading={search.waiting || contacts.loading && !contacts.data} notFound="Los contactos no están disponibles." />
      </>}
    </>}
    render={contact => <StudentRow title={contact.nombre} subtitle={contact.noLeidos ? `${contact.noLeidos} mensajes sin leer` : 'Sin mensajes por leer'} onPress={() => router.push({ pathname: '/conversacion', params: { aulaId: id, contactoId: contact.userId } })} />}
    empty={aula && contacts.data && !contacts.loading && !search.waiting ? <Text style={s.muted}>{search.query ? 'No hay alumnos que coincidan con la búsqueda.' : unreadOnly ? 'No tienes conversaciones con mensajes sin leer.' : 'No hay alumnos matriculados en esta aula.'}</Text> : null}
    footer={aula ? <><PageFooter query={contacts} noun="alumnos" disabled={search.waiting} /><Button title="Actualizar mensajes" secondary disabled={contacts.loading || search.waiting} onPress={() => { aulas.retry(); contacts.retry(); }} /></> : null} />;
}

/** Conversación privada del docente: contacto exacto y mensajes por páginas, lectura explícita. */
export function StaffConversation() {
  const params = useLocalSearchParams<{ aulaId?: string; contactoId?: string }>(), router = useAppRouter(), { session, signOut } = useAuth();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', peer = typeof params.contactoId === 'string' ? params.contactoId : '';
  const context = useSessionQuery(`chat-contexto:${aulaId}:${peer}`, useCallback((x: Session, signal: AbortSignal) => getChatContext(x, aulaId, peer, signal), [aulaId, peer]), !!aulaId && !!peer && !!session);
  const [composing, setComposing] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const messages = usePagedQuery(`direct:${aulaId}:${peer}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getDirectMessagePage(x, aulaId, peer, signal, cursor), [aulaId, peer]), !!context.data && !composing);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); }, [session, aulaId, peer]);
  const back = () => router.canGoBack() ? router.back() : router.replace('/mensajes');
  const unread = messages.data?.items.filter(m => !m.mio && !m.leido).map(m => m.id).slice(0, 200) ?? [];
  async function read() {
    if (!session || pending.current || !unread.length) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try {
      await leerMensajes(session, aulaId, peer, unread, controller.signal);
      if (!controller.signal.aborted) { const ids = new Set(unread); messages.replaceData(page => ({ ...page, noLeidos: Math.max(0, (page.noLeidos ?? 0) - unread.length), items: page.items.map(m => ids.has(m.id) ? { ...m, leido: true } : m) })); setNotice('Lectura confirmada por el servidor.'); }
    } catch (reason) { if (!controller.signal.aborted) { if (reason instanceof ApiError && reason.status === 401) signOut(true); else setError((reason as Error).message); } }
    finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  if (composing && context.data) return <StudentPage title="Escribir mensaje" subtitle={context.data.contacto.nombre} keyboard back={() => setComposing(false)}>
    <Text style={s.muted}>{context.data.aula.nombre}. No incluyas contraseñas ni datos personales innecesarios.</Text>
    <ContentForm title={`Mensaje para ${context.data.contacto.nombre}`} fields={[{ key: 'texto', label: 'Mensaje para el contacto', multiline: true, max: 10000 }]} initial={{ texto: '' }} confirm="Confirmar envío de mensaje"
      validate={v => { contentText(v.texto, 'Mensaje', 10000); }} submit={(v, key, signal) => enviarMensaje(session!, context.data!.aula, peer, v, key, signal)}
      onSaved={() => { setComposing(false); messages.retry(); setNotice('Mensaje guardado y confirmado por el servidor.'); }} refresh={() => { setComposing(false); messages.retry(); }} onBusy={setBusy} />
    <Button title="Cancelar mensaje" secondary disabled={busy} onPress={() => setComposing(false)} />
  </StudentPage>;
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ListHeading title={context.data?.contacto.nombre ?? 'Conversación'} subtitle={context.data?.aula.nombre} back={back} />
    <View style={{ paddingHorizontal: 20, gap: 10 }}>
      {(!aulaId || !peer) && <Text style={s.muted}>Abre la conversación desde tus contactos del aula.</Text>}
      <QueryFeedback {...context} notFound="El contacto no está disponible para tu cuenta." />
      <QueryFeedback loading={messages.loading && !messages.data} error={messages.error} retry={messages.retry} notFound="La conversación no está disponible." />
      {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
      {messages.data && <Text style={s.muted}>{messages.data.noLeidos ? `${messages.data.noLeidos} mensajes recibidos sin leer` : 'Sin mensajes recibidos por leer'}</Text>}
    </View>
    <FlatList<Mensaje> inverted maintainVisibleContentPosition={{ minIndexForVisible: 0 }} data={messages.data?.items ?? []} keyExtractor={m => m.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content}
      renderItem={({ item }) => <View style={{ alignSelf: item.mio ? 'flex-end' : 'flex-start', maxWidth: '94%', borderRadius: 18, backgroundColor: item.mio ? c.soft : c.paper, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10 }}>
        <Text style={s.muted}>{item.mio ? 'Tú' : item.remitenteNombre} · {academicDate(item.fecha)}</Text>
        <Text style={[s.rowTitle, { fontWeight: '400' }]}>{item.texto}</Text>
        <Text style={s.mini}>{item.mio ? item.leido ? 'Leído por el destinatario' : 'Enviado' : item.leido ? 'Leído' : 'Recibido sin leer'}</Text>
      </View>}
      ListEmptyComponent={messages.data && !messages.data.items.length ? <Text style={s.muted}>Aún no hay mensajes. Puedes iniciar la conversación.</Text> : null}
      ListFooterComponent={<PageFooter query={messages} noun="mensajes" older disabled={busy} />} />
    {context.data && <View style={{ padding: 16, gap: 10, backgroundColor: c.paper, borderTopWidth: 1, borderColor: c.border }}>
      {unread.length > 0 && <Button title={`Marcar recibidos cargados como leídos (${unread.length})`} secondary disabled={busy || messages.loading} onPress={() => void read()} />}
      {context.data.aula.estado === 'ACTIVA' ? !messages.error && <Button title="Escribir mensaje" disabled={busy || messages.loading} onPress={() => setComposing(true)} /> : <Text style={s.muted}>Aula concluida · Conversación de solo consulta.</Text>}
      <Button title="Actualizar conversación" secondary disabled={busy || messages.loading} onPress={() => { messages.retry(); setNotice(''); }} />
    </View>}
  </KeyboardAvoidingView>;
}

const recordFilters = [['TODAS', 'Todas'], ['ABIERTAS', 'En curso'], ['CERRADAS', 'Cerradas']] as const;
const stateLabel = (estado: string) => estado === 'CERRADA' ? 'Cerrada' : estado === 'LISTA_PARA_CIERRE' ? 'Lista para cierre' : 'En curso';

/** Expedientes del personal: prácticas visibles por páginas, con filtro opcional de aula/alumno desde seguimiento. */
export function StaffRecords() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string; alumnoId?: string }>();
  const scope = { aulaId: typeof params.aulaId === 'string' ? params.aulaId : '', alumnoId: typeof params.alumnoId === 'string' ? params.alumnoId : '' };
  const [filter, setFilter] = useState<'TODAS' | 'ABIERTAS' | 'CERRADAS'>('TODAS');
  const search = useSearch(), scoped = !!scope.aulaId || !!scope.alumnoId;
  const query = usePagedQuery<PracticaExpediente, Page<PracticaExpediente>>(`expedientes:${filter}:${search.query}:${scope.aulaId}:${scope.alumnoId}`,
    useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getPracticePage(x, filter, search.query, signal, cursor, scope), [filter, search.query, scope.aulaId, scope.alumnoId]), true);
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  return <PagedList<PracticaExpediente> title="Expedientes de prácticas" back={back} rows={search.waiting ? [] : query.data?.items ?? []}
    header={<>
      <Text style={s.muted}>Evaluación del supervisor, requisitos y cierre de cada práctica.</Text>
      {scoped && <Text style={s.muted}>Mostrando las prácticas del seguimiento seleccionado.</Text>}
      {!scope.alumnoId && <Field label="Buscar práctica" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Alumno, aula o periodo" />}
      <View style={row}>{recordFilters.map(([value, title]) => <FilterChip key={value} title={title} selected={filter === value} onPress={() => setFilter(value)} />)}</View>
      <QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="El servidor aún no tiene disponible el expediente actualizado." />
    </>}
    render={p => <StudentRow title={p.practicanteNombre} subtitle={`${p.aulaNombre} · ${p.periodo}\n${p.horasAcumuladas} de ${p.horasMinimas} h validadas · ${stateLabel(p.estado)}`} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: p.id } })} />}
    empty={!query.loading && !query.error && !search.waiting ? <Text style={s.muted}>{search.query || filter !== 'TODAS' ? 'No hay prácticas que coincidan con estos filtros.' : 'No hay prácticas disponibles para esta cuenta o selección. La coordinación debe asignar la práctica y vincular el centro y supervisor.'}</Text> : null}
    footer={<><PageFooter query={query} noun="prácticas" disabled={search.waiting} /><Button title="Actualizar expedientes" secondary disabled={query.loading || search.waiting} onPress={query.retry} /></>} />;
}
