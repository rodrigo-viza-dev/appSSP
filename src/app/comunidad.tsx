import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { PageFooter } from '@/features/alumno/paged-components';
import { contentText, crearHilo, getAulasComunidad, publicarAnuncio, type Hilo } from '@/services/comunidad';
import { getAnnouncement, getAnnouncementPage, getThreadPage, type AnuncioResumen, type Page } from '@/services/module-pages';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';
import { StudentCommunity } from '@/features/alumno/communication';

function CommunityScreenContent() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string; seccion?: string }>();
  const { session } = useAuth();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : '');
  const [section, setSection] = useState<'anuncios' | 'foros'>(params.seccion === 'foros' ? 'foros' : 'anuncios');
  const { value: search, setValue: setSearch, query: searchQuery, waiting } = useSearch();
  const [pinned, setPinned] = useState(false), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [expanded, setExpanded] = useState('');
  const aulas = useSessionQuery('comunidad-aulas', useCallback(getAulasComunidad, []), !!session);
  const aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0];
  const id = aula?.id ?? '';
  const anuncios = usePagedQuery<AnuncioResumen, Page<AnuncioResumen>>(`anuncios:${id}:${pinned}:${searchQuery}`,
    useCallback((s, signal, cursor) => getAnnouncementPage(s, id, pinned, signal, cursor, searchQuery), [id, pinned, searchQuery]),
    !!aula && section === 'anuncios');
  const hilos = usePagedQuery<Hilo, Page<Hilo>>(`foros:${id}:${searchQuery}`,
    useCallback((s, signal, cursor) => getThreadPage(s, id, signal, cursor, searchQuery), [id, searchQuery]),
    !!aula && section === 'foros');
  const detail = useSessionQuery(`anuncio:${id}:${expanded}`, useCallback((s: Session, signal: AbortSignal) => getAnnouncement(s, id, expanded, signal), [id, expanded]), !!aula && !!expanded);
  const query = section === 'anuncios' ? anuncios : hilos;
  const refresh = () => { setCreating(false); setExpanded(''); setNotice(''); aulas.retry(); anuncios.retry(); hilos.retry(); };
  const saved = () => { setCreating(false); setExpanded(''); anuncios.retry(); hilos.retry(); setNotice('Contenido guardado y confirmado por el servidor.'); };
  const canPublish = session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN';
  const switchSection = (value: 'anuncios' | 'foros') => { setSection(value); setCreating(false); setExpanded(''); setSearch(''); };
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Comunidad del aula" subtitle="Anuncios y foros de discusión" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <QueryFeedback {...aulas} notFound="Este servidor todavía no ofrece los módulos de comunidad actualizados." />
      {aulas.data?.length === 0 && <Text style={typography.body}>No tienes aulas disponibles para participar.</Text>}
      {!!selected && aulas.data && !aula && <Text style={typography.error}>El aula no está disponible para tu cuenta. Ábrela desde tu panel.</Text>}
      {(aulas.data?.length ?? 0) > 1 && aulas.data!.map(a => <Button key={a.id} title={`Comunidad: ${a.nombre} · ${a.periodo}`} secondary={a.id !== id} disabled={busy} onPress={() => { setSelected(a.id); setCreating(false); setExpanded(''); setSearch(''); setNotice(''); }} />)}
      {aula && <>
        <Card><Text style={typography.title}>{aula.nombre}</Text><Text style={typography.body}>Periodo {aula.periodo}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Aula activa' : 'Aula concluida · solo consulta'} tone="neutral" /></Card>
        <View style={{ flexDirection: 'row', gap: 8 }}><Button title="Anuncios" secondary={section !== 'anuncios'} disabled={busy} onPress={() => switchSection('anuncios')} /><Button title="Foros" secondary={section !== 'foros'} disabled={busy} onPress={() => switchSection('foros')} /></View>
        <Text style={typography.body}>{section === 'anuncios' ? 'Comunicados publicados por docencia. Los anuncios fijados aparecen primero.' : 'Comparte dudas, propuestas y aprendizajes con los miembros de tu aula. Abre un tema y añade respuestas dentro de la conversación.'}</Text>
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        <QueryFeedback {...query} loading={waiting || query.loading && !query.data} notFound="El contenido no está disponible para tu cuenta." />
        {session?.user.role !== 'ALUMNO' && <Field label="Buscar en el aula" editable={!busy} value={search} onChangeText={setSearch} placeholder="Tema, contenido o responsable" maxLength={120} />}
        {section === 'anuncios' && <Button title={pinned ? 'Mostrar todos los anuncios' : 'Mostrar solo fijados'} secondary disabled={busy} onPress={() => { setPinned(v => !v); setExpanded(''); }} />}
        {aula.estado === 'ACTIVA' && (section === 'foros' || canPublish) && !creating && <Button title={section === 'anuncios' ? 'Publicar anuncio' : 'Abrir tema de foro'} disabled={busy} onPress={() => setCreating(true)} />}
        {creating && <>
          <ContentForm key={`${id}:${section}`} title={section === 'anuncios' ? 'Nuevo anuncio' : 'Nuevo tema de foro'}
            fields={section === 'anuncios' ? [{ key: 'titulo', label: 'Título del anuncio', max: 200 }, { key: 'mensaje', label: 'Contenido del anuncio', multiline: true, max: 10000 }, { key: 'fijado', label: 'Prioridad', choices: [{ value: 'no', label: 'Anuncio regular' }, { value: 'si', label: 'Fijar al inicio' }] }] : [{ key: 'titulo', label: 'Tema de discusión', max: 200 }]}
            initial={{ titulo: '', mensaje: '', fijado: 'no' }} confirm={section === 'anuncios' ? 'Confirmar publicación' : 'Confirmar nuevo tema'}
            validate={v => { contentText(v.titulo, 'Título', 200); if (section === 'anuncios') contentText(v.mensaje, 'Contenido', 10000); }}
            submit={(v, key, signal) => section === 'anuncios' ? publicarAnuncio(session!, aula, v, key, signal) : crearHilo(session!, aula, v, key, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
          <Button title="Cancelar publicación" secondary disabled={busy} onPress={() => setCreating(false)} />
        </>}
        {section === 'anuncios' && anuncios.data && <>
          <Text style={typography.title}>{anuncios.data.total} anuncios en la consulta</Text>
          {anuncios.data.items.map(a => <Card key={a.id}>{a.fijado && <Badge title="Fijado" tone="neutral" />}<Text style={typography.title}>{a.titulo}</Text><Text style={typography.body}>{a.autorNombre} · {academicDate(a.fecha)}</Text><Text style={typography.body}>{a.resumen}</Text><Button title={expanded === a.id ? 'Ocultar contenido completo' : 'Ver anuncio completo'} secondary disabled={busy} onPress={() => setExpanded(v => v === a.id ? '' : a.id)} /></Card>)}
          {anuncios.data.items.length === 0 && !anuncios.loading && <Text style={typography.body}>{searchQuery ? 'No hay anuncios que coincidan con la búsqueda.' : pinned ? 'No hay anuncios fijados en esta aula.' : 'Todavía no hay anuncios publicados en esta aula.'}</Text>}
          {expanded && <QueryFeedback {...detail} notFound="El anuncio ya no está disponible en esta aula." />}
          {expanded && detail.data && <Card><Text style={typography.title}>{detail.data.titulo}</Text><Text style={typography.body}>{detail.data.autorNombre} · {academicDate(detail.data.fecha)}</Text><Text style={typography.body}>{detail.data.mensaje}</Text></Card>}
          <PageFooter query={anuncios} noun="anuncios" disabled={waiting || busy} />
        </>}
        {section === 'foros' && hilos.data && <>
          <Text style={typography.title}>{hilos.data.total} temas en la consulta</Text>
          {hilos.data.items.map(h => <Card key={h.id}><Text style={typography.title}>{h.titulo}</Text><Text style={typography.body}>{h.autorNombre} · {academicDate(h.fecha)}</Text><Badge title={`${h.respuestas} respuestas`} tone="neutral" /><Button title={`Abrir conversación: ${h.titulo}`} secondary disabled={busy} onPress={() => router.push({ pathname: '/foro', params: { aulaId: id, hiloId: h.id } })} /></Card>)}
          {hilos.data.items.length === 0 && !hilos.loading && <Text style={typography.body}>{searchQuery ? 'No hay temas que coincidan con la búsqueda.' : 'Aún no hay conversaciones. Puedes abrir el primer tema.'}</Text>}
          <PageFooter query={hilos} noun="temas" disabled={waiting || busy} />
        </>}
        <Button title="Actualizar comunidad" secondary disabled={busy || query.loading || waiting} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}

export default function CommunityScreen(){const {session}=useAuth();return <StudentLegacyRoute route="/comunidad">{session?.user.role==='ALUMNO'?<StudentCommunity />:<CommunityScreenContent />}</StudentLegacyRoute>;}
