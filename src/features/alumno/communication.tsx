import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { Badge, Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { ApiError, type Session } from '@/services/api';
import { getAulasMensajes, getChatContext, getContactos, leerMensajes, type Mensaje } from '@/services/mensajes';
import { getAulasComunidad, type Hilo, type MensajeForo } from '@/services/comunidad';
import { getAnnouncement, getAnnouncementPage, getDirectMessagePage, getForumMessagePage, getThreadContext, getThreadPage, type AnuncioResumen } from '@/services/module-pages';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from './components';
import { FilterChip, ListHeading, PagedList, PageFooter } from './paged-components';
import { CommunicationComposer } from './communication-composer';
import { useAppRouter } from './navigation';

export function StudentMessages() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string }>();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : ''), [unreadOnly, setUnreadOnly] = useState(false);
  const aulas = useStudentQuery('student-message-aulas', useCallback(getAulasMensajes, []), true);
  const aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0], id = aula?.id ?? '';
  const contacts = useStudentQuery(`student-contacts:${id}`, useCallback((session: Session, signal: AbortSignal) => getContactos(session, id, signal), [id]), !!aula);
  const first = useRef(true);
  useFocusEffect(useCallback(() => { if (first.current) first.current = false; else contacts.retry(); }, [contacts.retry]));
  const rows = contacts.data?.filter(row => !unreadOnly || row.noLeidos > 0) ?? [];
  return <StudentPage title="Mensajes" subtitle="Tus conversaciones con los docentes de cada aula." back={() => router.canGoBack() ? router.back() : router.replace('/alumno/mas')}>
    <QueryFeedback {...aulas} notFound="Tus aulas de mensajería no están disponibles." />
    {aulas.data?.length === 0 && <Text style={s.muted}>Los contactos aparecerán cuando tengas un aula asignada.</Text>}
    {aulas.data && (aulas.data.length > 1 || !!selected && !aula) && <StudentGroup>{aulas.data.map(a => <StudentRow key={a.id} title={a.nombre} subtitle={a.periodo} end={a.id === id ? 'Actual' : undefined} onPress={() => setSelected(a.id)} />)}</StudentGroup>}
    {!!selected && aulas.data && !aula && <Text accessibilityRole="alert" style={typography.error}>El aula no está disponible para tu cuenta.</Text>}
    {aula && <><Text accessibilityRole="header" style={s.hero}>{aula.nombre}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Aula activa' : 'Aula concluida · Solo consulta'} tone="neutral" /><View style={{ flexDirection: 'row', gap: 8 }}><FilterChip title="Todas" selected={!unreadOnly} onPress={() => setUnreadOnly(false)} /><FilterChip title="Sin leer" selected={unreadOnly} onPress={() => setUnreadOnly(true)} /></View><QueryFeedback {...contacts} notFound="Los contactos ya no están disponibles." /><StudentGroup>{rows.map(row => <StudentRow key={row.userId} title={row.nombre} subtitle={row.noLeidos ? `${row.noLeidos} mensajes sin leer` : 'Tu docente del aula'} onPress={() => router.push({ pathname: '/conversacion', params: { aulaId: id, contactoId: row.userId } })} />)}</StudentGroup>{contacts.data && !rows.length && <Text style={s.muted}>{unreadOnly ? 'No tienes conversaciones sin leer en esta aula.' : 'Aún no hay un docente disponible para conversar.'}</Text>}<Button title="Actualizar mensajes" secondary disabled={contacts.loading || aulas.loading} onPress={contacts.retry} /></>}
  </StudentPage>;
}

export function StudentConversation() {
  const params = useLocalSearchParams<{ aulaId?: string; contactoId?: string }>(), router = useAppRouter(), { session, signOut } = useAuth();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', peer = typeof params.contactoId === 'string' ? params.contactoId : '';
  const context = useStudentQuery(`student-chat:${aulaId}:${peer}`, useCallback((s: Session, signal: AbortSignal) => getChatContext(s, aulaId, peer, signal), [aulaId, peer]), !!aulaId && !!peer);
  const [composing, setComposing] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const messages = usePagedQuery(`direct:${aulaId}:${peer}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getDirectMessagePage(s, aulaId, peer, signal, cursor), [aulaId, peer]), !!context.data && !composing);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); }, [session, aulaId, peer]);
  const back = () => router.canGoBack() ? router.back() : router.replace('/mensajes');
  const unread = messages.data?.items.filter(row => !row.mio && !row.leido).map(row => row.id).slice(0, 200) ?? [];
  async function read() {
    if (!session || pending.current || !unread.length) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await leerMensajes(session, aulaId, peer, unread, controller.signal); if (!controller.signal.aborted) { const ids = new Set(unread); messages.replaceData(page => ({ ...page, noLeidos: Math.max(0, (page.noLeidos ?? 0) - unread.length), items: page.items.map(row => ids.has(row.id) ? { ...row, leido: true } : row) })); setNotice('Lectura confirmada.'); } }
    catch (reason) { if (!controller.signal.aborted) { if (reason instanceof ApiError && reason.status === 401) signOut(true); else setError((reason as Error).message); } }
    finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  if (composing && context.data) return <StudentPage title="Escribir mensaje" subtitle={context.data.contacto.nombre} back={() => setComposing(false)} keyboard><Text style={s.muted}>{context.data.aula.nombre}</Text><CommunicationComposer key={`${aulaId}:${peer}`} context={{ type: 'mensaje', aula: context.data.aula, peerId: peer }} title={`Mensaje para ${context.data.contacto.nombre}`} onBusy={setBusy} onSaved={() => { setComposing(false); messages.retry(); setNotice('Mensaje recibido por el servidor.'); }} /><Button title="Guardar y volver" secondary disabled={busy} onPress={() => setComposing(false)} /></StudentPage>;
  return <View style={s.page}>
    <ListHeading title={context.data?.contacto.nombre ?? 'Conversación'} subtitle={context.data?.aula.nombre} back={back} />
    <View style={{ paddingHorizontal: 20, gap: 10 }}>
      {(!aulaId || !peer) && <Text style={s.muted}>Abre una conversación desde tus contactos del aula.</Text>}
      <QueryFeedback {...context} notFound="El contacto ya no está disponible para tu cuenta." />
      <QueryFeedback loading={messages.loading && !messages.data} error={messages.error} retry={messages.retry} notFound="La conversación no está disponible." />
      {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
      {messages.data && <Text style={s.muted}>{messages.data.noLeidos} mensajes recibidos sin leer en total</Text>}
    </View>
    <FlatList<Mensaje> inverted maintainVisibleContentPosition={{ minIndexForVisible: 0 }} data={messages.data?.items ?? []} keyExtractor={row => row.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content}
      renderItem={({ item }) => <View style={{ alignSelf: item.mio ? 'flex-end' : 'flex-start', maxWidth: '94%', borderRadius: 18, backgroundColor: item.mio ? c.soft : c.paper, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10 }}><Text style={s.muted}>{item.mio ? 'Tú' : item.remitenteNombre} · {academicDate(item.fecha)}</Text><Text style={[s.rowTitle, { fontWeight: '400' }]}>{item.texto}</Text><Text style={s.mini}>{item.mio ? item.leido ? 'Leído por el destinatario' : 'Enviado' : item.leido ? 'Leído' : 'Recibido sin leer'}</Text></View>}
      ListEmptyComponent={messages.data && !messages.data.items.length ? <Text style={s.muted}>Aún no hay mensajes. Puedes iniciar la conversación.</Text> : null}
      ListFooterComponent={<PageFooter query={messages} noun="mensajes" older disabled={busy} />} />
    {context.data && <View style={{ padding: 16, gap: 10, backgroundColor: c.paper, borderTopWidth: 1, borderColor: c.border }}>
      {unread.length > 0 && <Button title={`Marcar recibidos cargados como leídos (${unread.length})`} secondary disabled={busy || messages.loading} onPress={() => void read()} />}
      {context.data.aula.estado === 'ACTIVA' ? !messages.error && <Button title="Escribir mensaje" disabled={busy || messages.loading} onPress={() => setComposing(true)} /> : <Text style={s.muted}>Aula concluida · Conversación de solo consulta.</Text>}
      <Button title="Actualizar conversación" secondary disabled={busy || messages.loading} onPress={() => { messages.retry(); setNotice(''); }} />
    </View>}
  </View>;
}

export function StudentCommunity() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string; seccion?: string }>();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : ''), [section, setSection] = useState(params.seccion === 'foros' ? 'foros' : 'anuncios'), [pinned, setPinned] = useState(false), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false);
  const aulas = useStudentQuery('student-community-aulas', useCallback(getAulasComunidad, []), true), aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0], id = aula?.id ?? '';
  const announcements = usePagedQuery(`announcements:${id}:${pinned}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getAnnouncementPage(s, id, pinned, signal, cursor), [id, pinned]), !!aula && section === 'anuncios');
  const threads = usePagedQuery(`threads:${id}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getThreadPage(s, id, signal, cursor), [id]), !!aula && section === 'foros' && !creating);
  const q = section === 'anuncios' ? announcements : threads;
  const back = () => router.canGoBack() ? router.back() : router.replace('/alumno/aulas');
  if (creating && aula) return <StudentPage title="Nuevo tema" subtitle={aula.nombre} keyboard back={() => setCreating(false)}><CommunicationComposer key={id} context={{ type: 'tema', aula }} title={`Tema en ${aula.nombre}`} onBusy={setBusy} onSaved={() => { setCreating(false); threads.retry(); }} /><Button title="Guardar y volver" secondary disabled={busy} onPress={() => setCreating(false)} /></StudentPage>;
  const header = <><QueryFeedback {...aulas} notFound="No pudimos consultar tus aulas." />{aulas.data && (aulas.data.length > 1 || !!selected && !aula) && <StudentGroup>{aulas.data.map(a => <StudentRow key={a.id} title={a.nombre} subtitle={a.periodo} end={a.id === id ? 'Actual' : undefined} onPress={() => setSelected(a.id)} />)}</StudentGroup>}{!!selected && aulas.data && !aula && <Text accessibilityRole="alert" style={typography.error}>El aula no está disponible para tu cuenta.</Text>}{aula && <><Text accessibilityRole="header" style={s.hero}>{aula.nombre}</Text><View style={{ flexDirection: 'row', gap: 8 }}><FilterChip title="Anuncios" selected={section === 'anuncios'} onPress={() => setSection('anuncios')} /><FilterChip title="Foros" selected={section === 'foros'} onPress={() => setSection('foros')} /></View>{section === 'anuncios' ? <><Text style={s.muted}>Indicaciones del docente. Los anuncios fijados aparecen primero.</Text><View style={{ flexDirection: 'row', gap: 8 }}><FilterChip title="Todos" selected={!pinned} onPress={() => setPinned(false)} /><FilterChip title="Fijados" selected={pinned} onPress={() => setPinned(true)} /></View></> : <><Text style={s.muted}>Dudas y aprendizajes compartidos con los miembros del aula.</Text>{aula.estado === 'ACTIVA' && <Button title="Abrir tema de foro" onPress={() => setCreating(true)} />}</>}<QueryFeedback loading={q.loading && !q.data} error={q.error} retry={q.retry} notFound="El contenido de esta aula no está disponible." /></>}{aulas.data?.length === 0 && <Text style={s.muted}>Necesitas estar matriculado en un aula para consultar su comunidad.</Text>}</>;
  const rows: (AnuncioResumen | Hilo)[] = q.data?.items ?? [];
  return <PagedList title="Comunidad del aula" back={back} header={header} rows={rows} render={row => <StudentGroup><StudentRow title={row.titulo} subtitle={`${'resumen' in row ? row.resumen : `${row.respuestas} respuestas`}\n${row.autorNombre} · ${academicDate(row.fecha)}${'fijado' in row && row.fijado ? ' · Fijado' : ''}`} onPress={() => router.push({ pathname: 'resumen' in row ? '/anuncio' : '/foro', params: { aulaId: id, ...('resumen' in row ? { anuncioId: row.id } : { hiloId: row.id }) } } as never)} /></StudentGroup>} empty={aula && q.data && !rows.length ? <Text style={s.muted}>{section === 'anuncios' ? 'No hay anuncios en este filtro.' : 'Aún no hay temas. Puedes abrir el primero.'}</Text> : null} footer={aula ? <><PageFooter query={q} noun={section === 'anuncios' ? 'anuncios' : 'temas'} /><Button title="Actualizar comunidad" secondary disabled={q.loading} onPress={q.retry} /></> : null} />;
}

export function StudentAnnouncement() {
  const params = useLocalSearchParams<{ aulaId?: string; anuncioId?: string }>(), router = useAppRouter();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', id = typeof params.anuncioId === 'string' ? params.anuncioId : '';
  const q = useStudentQuery(`announcement:${aulaId}:${id}`, useCallback((s: Session, signal: AbortSignal) => getAnnouncement(s, aulaId, id, signal), [aulaId, id]), !!aulaId && !!id);
  return <StudentPage title="Anuncio del aula" back={() => router.canGoBack() ? router.back() : router.replace('/alumno/aulas')}><QueryFeedback {...q} notFound="El anuncio ya no está disponible en esta aula." />{q.data && <>{q.data.fijado && <Badge title="Fijado" tone="neutral" />}<Text accessibilityRole="header" style={s.hero}>{q.data.titulo}</Text><Text style={s.muted}>{q.data.autorNombre} · {academicDate(q.data.fecha)}</Text><Text style={[s.rowTitle, { fontWeight: '400', lineHeight: 26 }]}>{q.data.mensaje}</Text></>}</StudentPage>;
}

export function StudentForum() {
  const params = useLocalSearchParams<{ aulaId?: string; hiloId?: string }>(), router = useAppRouter();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', id = typeof params.hiloId === 'string' ? params.hiloId : '';
  const context = useStudentQuery(`forum-context:${aulaId}:${id}`, useCallback((s: Session, signal: AbortSignal) => getThreadContext(s, aulaId, id, signal), [aulaId, id]), !!aulaId && !!id);
  const [composing, setComposing] = useState(false), [busy, setBusy] = useState(false);
  const messages = usePagedQuery(`forum-messages:${id}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getForumMessagePage(s, id, signal, cursor), [id]), !!context.data && !composing);
  const back = () => router.canGoBack() ? router.back() : router.replace('/alumno/aulas');
  if (composing && context.data) return <StudentPage title="Responder al tema" subtitle={context.data.hilo.titulo} keyboard back={() => setComposing(false)}><CommunicationComposer key={id} context={{ type: 'foro', aula: context.data.aula, hiloId: id }} title={`Respuesta en ${context.data.hilo.titulo}`} onBusy={setBusy} onSaved={() => { setComposing(false); messages.retry(); }} /><Button title="Guardar y volver" secondary disabled={busy} onPress={() => setComposing(false)} /></StudentPage>;
  return <View style={s.page}><ListHeading title="Conversación del aula" subtitle={context.data?.hilo.titulo} back={back} /><View style={{ paddingHorizontal: 20 }}><QueryFeedback {...context} notFound="El tema no está disponible en esta aula." /><QueryFeedback loading={messages.loading && !messages.data} error={messages.error} retry={messages.retry} notFound="Las respuestas no están disponibles." /></View><FlatList<MensajeForo> inverted maintainVisibleContentPosition={{ minIndexForVisible: 0 }} data={messages.data?.items ?? []} keyExtractor={row => row.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content} renderItem={({ item }) => <View style={[s.group, { padding: 18, gap: 12 }]}><Text style={s.rowTitle}>{item.autorNombre}</Text><Text style={s.mini}>{academicDate(item.fecha)}</Text><Text style={[s.rowTitle, { fontWeight: '400' }]}>{item.texto}</Text></View>} ListFooterComponent={<PageFooter query={messages} noun="respuestas" older />} ListEmptyComponent={messages.data && !messages.data.items.length ? <Text style={s.muted}>Todavía no hay respuestas.</Text> : null} />{context.data && <View style={{ padding: 16, gap: 10, backgroundColor: c.paper }}>{context.data.aula.estado === 'ACTIVA' ? <Button title="Escribir respuesta" onPress={() => setComposing(true)} /> : <Text style={s.muted}>Aula concluida · Solo consulta.</Text>}<Button title="Actualizar respuestas" secondary disabled={messages.loading} onPress={messages.retry} /></View>}</View>;
}
