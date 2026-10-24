import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { contentText, crearHilo, getAnuncios, getAulasComunidad, getHilos, publicarAnuncio } from '@/services/comunidad';
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
  const [search, setSearch] = useState(''), [pinned, setPinned] = useState(false), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const aulas = useSessionQuery('comunidad-aulas', useCallback(getAulasComunidad, []), !!session);
  const aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0];
  const id = aula?.id ?? '';
  const anuncios = useSessionQuery(`anuncios:${id}`, useCallback((s: Session, signal: AbortSignal) => getAnuncios(s, id, signal), [id]), !!aula && section === 'anuncios');
  const hilos = useSessionQuery(`foros:${id}`, useCallback((s: Session, signal: AbortSignal) => getHilos(s, id, signal), [id]), !!aula && section === 'foros');
  const query = section === 'anuncios' ? anuncios : hilos;
  const refresh = () => { setCreating(false); setNotice(''); aulas.retry(); anuncios.retry(); hilos.retry(); };
  const saved = () => { setCreating(false); anuncios.retry(); hilos.retry(); setNotice('Contenido guardado y confirmado por el servidor.'); };
  const matches = (text: string) => text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const canPublish = session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN';
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Comunidad del aula" subtitle="Anuncios y foros de discusión" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <QueryFeedback {...aulas} notFound="Este servidor todavía no ofrece los módulos de comunidad actualizados." />
      {aulas.data?.length === 0 && <Text style={typography.body}>No tienes aulas disponibles para participar.</Text>}
      {!!selected && aulas.data && !aula && <Text style={typography.error}>El aula no está disponible para tu cuenta. Ábrela desde tu panel.</Text>}
      {(aulas.data?.length ?? 0) > 1 && aulas.data!.map(a => <Button key={a.id} title={`Comunidad: ${a.nombre} · ${a.periodo}`} secondary={a.id !== id} disabled={busy} onPress={() => { setSelected(a.id); setCreating(false); setSearch(''); setNotice(''); }} />)}
      {aula && <>
        <Card><Text style={typography.title}>{aula.nombre}</Text><Text style={typography.body}>Periodo {aula.periodo}</Text><Badge title={aula.estado === 'ACTIVA' ? 'Aula activa' : 'Aula concluida · solo consulta'} tone="neutral" /></Card>
        <View style={{ flexDirection: 'row', gap: 8 }}><Button title="Anuncios" secondary={section !== 'anuncios'} disabled={busy} onPress={() => { setSection('anuncios'); setCreating(false); setSearch(''); }} /><Button title="Foros" secondary={section !== 'foros'} disabled={busy} onPress={() => { setSection('foros'); setCreating(false); setSearch(''); }} /></View>
        <Text style={typography.body}>{section === 'anuncios' ? 'Comunicados publicados por docencia. Los anuncios fijados aparecen primero.' : 'Comparte dudas, propuestas y aprendizajes con los miembros de tu aula. Abre un tema y añade respuestas dentro de la conversación.'}</Text>
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        <QueryFeedback {...query} notFound="El contenido no está disponible para tu cuenta." />
        {session?.user.role !== 'ALUMNO' && <Field label="Buscar en el aula" editable={!busy} value={search} onChangeText={setSearch} placeholder="Tema, contenido o responsable" />}
        {section === 'anuncios' && <Button title={pinned ? 'Mostrar todos los anuncios' : 'Mostrar solo fijados'} secondary disabled={busy} onPress={() => setPinned(v => !v)} />}
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
          <Text style={typography.title}>{anuncios.data.filter(a => (!pinned || a.fijado) && matches(`${a.titulo} ${a.mensaje} ${a.autorNombre}`)).length} anuncios en la consulta</Text>
          {anuncios.data.filter(a => (!pinned || a.fijado) && matches(`${a.titulo} ${a.mensaje} ${a.autorNombre}`)).map(a => <Card key={a.id}>{a.fijado && <Badge title="Fijado" tone="neutral" />}<Text style={typography.title}>{a.titulo}</Text><Text style={typography.body}>{a.autorNombre} · {academicDate(a.fecha)}</Text><Text style={typography.body}>{a.mensaje}</Text></Card>)}
          {anuncios.data.length === 0 && <Text style={typography.body}>Todavía no hay anuncios publicados en esta aula.</Text>}
        </>}
        {section === 'foros' && hilos.data && <>
          <Text style={typography.title}>{hilos.data.filter(h => matches(`${h.titulo} ${h.autorNombre}`)).length} temas en la consulta</Text>
          {hilos.data.filter(h => matches(`${h.titulo} ${h.autorNombre}`)).map(h => <Card key={h.id}><Text style={typography.title}>{h.titulo}</Text><Text style={typography.body}>{h.autorNombre} · {academicDate(h.fecha)}</Text><Badge title={`${h.respuestas} respuestas`} tone="neutral" /><Button title={`Abrir conversación: ${h.titulo}`} secondary disabled={busy} onPress={() => router.push({ pathname: '/foro', params: { aulaId: id, hiloId: h.id } })} /></Card>)}
          {hilos.data.length === 0 && <Text style={typography.body}>Aún no hay conversaciones. Puedes abrir el primer tema.</Text>}
        </>}
        <Button title="Actualizar comunidad" secondary disabled={busy || query.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}

export default function CommunityScreen(){const {session}=useAuth();return <StudentLegacyRoute route="/comunidad">{session?.user.role==='ALUMNO'?<StudentCommunity />:<CommunityScreenContent />}</StudentLegacyRoute>;}
