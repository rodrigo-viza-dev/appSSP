import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { Badge, Button, Field, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from '@/features/alumno/components';
import { FilterChip, ListHeading, PageFooter, PagedList } from '@/features/alumno/paged-components';
import { useAppRouter } from '@/features/alumno/navigation';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { contentText, crearHilo, getAulasComunidad, publicarAnuncio, responderForo, type Hilo, type MensajeForo } from '@/services/comunidad';
import { getAnnouncement, getAnnouncementPage, getForumMessagePage, getThreadContext, getThreadPage, type AnuncioResumen, type Page } from '@/services/module-pages';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';

const chips = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;
type Section = 'anuncios' | 'foros';
type Item = AnuncioResumen | Hilo;

/** Comunidad del personal: anuncios y temas por páginas, búsqueda en servidor y detalle del anuncio al abrirlo. */
export function StaffCommunity() {
  const router = useAppRouter(), { session } = useAuth(), params = useLocalSearchParams<{ aulaId?: string; seccion?: string }>();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : '');
  const [section, setSection] = useState<Section>(params.seccion === 'foros' ? 'foros' : 'anuncios');
  const [pinned, setPinned] = useState(false), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [expanded, setExpanded] = useState('');
  const search = useSearch();
  const aulas = useSessionQuery('comunidad-aulas', useCallback(getAulasComunidad, []), !!session);
  const aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0], id = aula?.id ?? '';
  const anuncios = usePagedQuery<AnuncioResumen, Page<AnuncioResumen>>(`anuncios:${id}:${pinned}:${search.query}`,
    useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getAnnouncementPage(x, id, pinned, signal, cursor, search.query), [id, pinned, search.query]),
    !!aula && section === 'anuncios' && !creating);
  const hilos = usePagedQuery<Hilo, Page<Hilo>>(`foros:${id}:${search.query}`,
    useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getThreadPage(x, id, signal, cursor, search.query), [id, search.query]),
    !!aula && section === 'foros' && !creating);
  const detail = useSessionQuery(`anuncio:${id}:${expanded}`, useCallback((x: Session, signal: AbortSignal) => getAnnouncement(x, id, expanded, signal), [id, expanded]), !!aula && !!expanded);
  const query = section === 'anuncios' ? anuncios : hilos;
  const canPublish = session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN';
  const canCreate = aula?.estado === 'ACTIVA' && (section === 'foros' || canPublish);
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  const reset = () => { setCreating(false); setExpanded(''); setNotice(''); search.setValue(''); };
  const choose = (value: string) => { setSelected(value); setPinned(false); reset(); };
  const switchSection = (value: Section) => { setSection(value); reset(); };

  if (creating && aula) return <StudentPage title={section === 'anuncios' ? 'Nuevo anuncio' : 'Nuevo tema'} subtitle={aula.nombre} keyboard back={() => setCreating(false)}>
    <ContentForm key={`${id}:${section}`} title={section === 'anuncios' ? 'Nuevo anuncio' : 'Nuevo tema de foro'}
      fields={section === 'anuncios' ? [{ key: 'titulo', label: 'Título del anuncio', max: 200 }, { key: 'mensaje', label: 'Contenido del anuncio', multiline: true, max: 10000 }, { key: 'fijado', label: 'Prioridad', choices: [{ value: 'no', label: 'Anuncio regular' }, { value: 'si', label: 'Fijar al inicio' }] }] : [{ key: 'titulo', label: 'Tema de discusión', max: 200 }]}
      initial={{ titulo: '', mensaje: '', fijado: 'no' }} confirm={section === 'anuncios' ? 'Confirmar publicación' : 'Confirmar nuevo tema'}
      validate={v => { contentText(v.titulo, 'Título', 200); if (section === 'anuncios') contentText(v.mensaje, 'Contenido', 10000); }}
      submit={(v, key, signal) => section === 'anuncios' ? publicarAnuncio(session!, aula, v, key, signal) : crearHilo(session!, aula, v, key, signal)}
      onSaved={() => { setCreating(false); anuncios.retry(); hilos.retry(); setNotice('Contenido guardado y confirmado por el servidor.'); }}
      refresh={() => { setCreating(false); anuncios.retry(); hilos.retry(); }} onBusy={setBusy} />
    <Button title="Cancelar publicación" secondary disabled={busy} onPress={() => setCreating(false)} />
  </StudentPage>;

  const renderItem = (item: Item) => {
    if ('respuestas' in item) return <StudentRow title={item.titulo} subtitle={`${item.respuestas} respuestas\n${item.autorNombre} · ${academicDate(item.fecha)}`} onPress={() => router.push({ pathname: '/foro', params: { aulaId: id, hiloId: item.id } })} />;
    const open = expanded === item.id;
    return <View>
      <StudentRow title={item.titulo} subtitle={`${open ? '' : item.resumen + '\n'}${item.autorNombre} · ${academicDate(item.fecha)}${item.fijado ? ' · Fijado' : ''}`} end={open ? 'Ocultar' : undefined} onPress={() => setExpanded(open ? '' : item.id)} />
      {open && <View style={{ paddingHorizontal: 17, paddingBottom: 17, gap: 8 }}>
        <QueryFeedback {...detail} notFound="El anuncio ya no está disponible en esta aula." />
        {detail.data && <Text style={[s.rowTitle, { fontWeight: '400', lineHeight: 24 }]}>{detail.data.mensaje}</Text>}
      </View>}
    </View>;
  };
  const rows: Item[] = !aula || search.waiting ? [] : query.data?.items ?? [];
  return <PagedList<Item> title="Comunidad del aula" back={back} rows={rows} render={renderItem}
    header={<>
      <QueryFeedback {...aulas} notFound="Este servidor todavía no ofrece los módulos de comunidad actualizados." />
      {aulas.data?.length === 0 && <Text style={s.muted}>No tienes aulas disponibles para participar.</Text>}
      {aulas.data && (aulas.data.length > 1 || !!selected && !aula) && <StudentGroup>{aulas.data.map(a => <StudentRow key={a.id} title={a.nombre} subtitle={a.periodo} end={a.id === id ? 'Actual' : undefined} onPress={() => choose(a.id)} />)}</StudentGroup>}
      {!!selected && aulas.data && !aula && <Text accessibilityRole="alert" style={typography.error}>El aula no está disponible para tu cuenta. Ábrela desde tu panel.</Text>}
      {aula && <>
        <View style={chips}><Text accessibilityRole="header" style={s.sectionTitle}>{aula.nombre}</Text>{aula.estado !== 'ACTIVA' && <Badge title="Aula concluida · Solo consulta" tone="neutral" />}</View>
        <View style={chips}><FilterChip title="Anuncios" selected={section === 'anuncios'} disabled={busy} onPress={() => switchSection('anuncios')} /><FilterChip title="Foros" selected={section === 'foros'} disabled={busy} onPress={() => switchSection('foros')} /></View>
        <Field label="Buscar en el aula" editable={!busy} value={search.value} onChangeText={value => { search.setValue(value); setExpanded(''); }} maxLength={120} placeholder={section === 'anuncios' ? 'Título, contenido o responsable' : 'Tema o responsable'} />
        {section === 'anuncios' && <View style={chips}><FilterChip title="Todos" selected={!pinned} disabled={busy} onPress={() => { setPinned(false); setExpanded(''); }} /><FilterChip title="Fijados" selected={pinned} disabled={busy} onPress={() => { setPinned(true); setExpanded(''); }} /></View>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
        {canCreate && <Button title={section === 'anuncios' ? 'Publicar anuncio' : 'Abrir tema de foro'} disabled={busy} onPress={() => setCreating(true)} />}
        <QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="El contenido no está disponible para tu cuenta." />
      </>}
    </>}
    empty={aula && query.data && !query.loading && !search.waiting ? <Text style={s.muted}>{search.query ? (section === 'anuncios' ? 'No hay anuncios que coincidan con la búsqueda.' : 'No hay temas que coincidan con la búsqueda.') : section === 'foros' ? 'Aún no hay conversaciones. Puedes abrir el primer tema.' : pinned ? 'No hay anuncios fijados en esta aula.' : 'Todavía no hay anuncios publicados en esta aula.'}</Text> : null}
    footer={aula ? <><PageFooter query={query} noun={section === 'anuncios' ? 'anuncios' : 'temas'} disabled={search.waiting || busy} /><Button title="Actualizar comunidad" secondary disabled={busy || query.loading || search.waiting} onPress={() => { setExpanded(''); setNotice(''); aulas.retry(); query.retry(); }} /></> : null} />;
}

/** Conversación de foro del personal: tema exacto y respuestas por páginas, más recientes primero. */
export function StaffForum() {
  const router = useAppRouter(), { session } = useAuth(), params = useLocalSearchParams<{ aulaId?: string; hiloId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', hiloId = typeof params.hiloId === 'string' ? params.hiloId : '';
  const [busy, setBusy] = useState(false), [composing, setComposing] = useState(false), [notice, setNotice] = useState('');
  const context = useSessionQuery(`foro-contexto:${aulaId}:${hiloId}`, useCallback((x: Session, signal: AbortSignal) => getThreadContext(x, aulaId, hiloId, signal), [aulaId, hiloId]), !!session && !!aulaId && !!hiloId);
  const messages = usePagedQuery<MensajeForo, Page<MensajeForo>>(`foro-mensajes:${hiloId}`, useCallback((x, signal, cursor) => getForumMessagePage(x, hiloId, signal, cursor), [hiloId]), !!context.data && !composing);
  const back = () => router.canGoBack() ? router.back() : router.replace('/comunidad');
  if (composing && context.data) return <StudentPage title="Responder al tema" subtitle={context.data.hilo.titulo} keyboard back={() => setComposing(false)}>
    <ContentForm title="Responder al tema" fields={[{ key: 'texto', label: 'Tu respuesta', multiline: true, max: 10000 }]} initial={{ texto: '' }} confirm="Confirmar respuesta" validate={v => { contentText(v.texto, 'Respuesta', 10000); }}
      submit={(v, key, signal) => responderForo(session!, context.data!.aula, hiloId, v, key, signal)}
      onSaved={() => { setComposing(false); context.retry(); messages.retry(); setNotice('Respuesta guardada y confirmada por el servidor.'); }}
      refresh={() => { setComposing(false); context.retry(); messages.retry(); }} onBusy={setBusy} />
    <Button title="Cancelar respuesta" secondary disabled={busy} onPress={() => setComposing(false)} />
  </StudentPage>;
  return <View style={s.page}>
    <ListHeading title="Conversación del aula" subtitle={context.data?.aula.nombre} back={back} />
    <FlatList<MensajeForo> data={messages.data?.items ?? []} keyExtractor={m => m.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content}
      ListHeaderComponent={<View style={{ gap: 12 }}>
        {(!aulaId || !hiloId) && <Text accessibilityRole="alert" style={typography.error}>Abre una conversación desde la comunidad del aula.</Text>}
        <QueryFeedback {...context} notFound="La conversación no está disponible para tu cuenta." />
        {context.data && <>
          <Text accessibilityRole="header" style={s.sectionTitle}>{context.data.hilo.titulo}</Text>
          <Text style={s.muted}>Iniciado por {context.data.hilo.autorNombre} · {academicDate(context.data.hilo.fecha)} · {context.data.hilo.respuestas} respuestas</Text>
          {context.data.aula.estado !== 'ACTIVA' && <Badge title="Aula concluida · Solo consulta" tone="neutral" />}
          {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
          {context.data.aula.estado === 'ACTIVA' && <Button title="Escribir respuesta" disabled={busy || messages.loading} onPress={() => setComposing(true)} />}
          <QueryFeedback loading={messages.loading && !messages.data} error={messages.error} retry={messages.retry} notFound="Los mensajes no están disponibles." />
          {messages.data && <Text style={s.eyebrow}>Respuestas más recientes primero</Text>}
        </>}
      </View>}
      renderItem={({ item }) => <View style={{ backgroundColor: c.paper, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 16, gap: 8, marginBottom: 10 }}>
        <Text style={s.muted}>{item.autorNombre} · {academicDate(item.fecha)}</Text>
        <Text style={[s.rowTitle, { fontWeight: '400' }]}>{item.texto}</Text>
      </View>}
      ListEmptyComponent={messages.data && !messages.data.items.length ? <Text style={s.muted}>Todavía no hay respuestas. Añade contexto o comparte la primera aportación.</Text> : null}
      ListFooterComponent={context.data ? <View style={{ gap: 12 }}><PageFooter query={messages} noun="respuestas" disabled={busy} /><Button title="Actualizar conversación" secondary disabled={busy || messages.loading} onPress={() => { setNotice(''); context.retry(); messages.retry(); }} /></View> : null} />
  </View>;
}
