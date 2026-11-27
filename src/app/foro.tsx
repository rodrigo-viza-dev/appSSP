import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { PageFooter } from '@/features/alumno/paged-components';
import { contentText, responderForo, type MensajeForo } from '@/services/comunidad';
import { getForumMessagePage, getThreadContext, type Page } from '@/services/module-pages';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';
import { StudentForum } from '@/features/alumno/communication';

function ForumScreenContent() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string; hiloId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', hiloId = typeof params.hiloId === 'string' ? params.hiloId : '';
  const { session } = useAuth();
  const [busy, setBusy] = useState(false), [composing, setComposing] = useState(false), [notice, setNotice] = useState('');
  const context = useSessionQuery(`foro-contexto:${aulaId}:${hiloId}`, useCallback((s: Session, signal: AbortSignal) => getThreadContext(s, aulaId, hiloId, signal), [aulaId, hiloId]), !!session && !!aulaId && !!hiloId);
  const messages = usePagedQuery<MensajeForo, Page<MensajeForo>>(`foro-mensajes:${hiloId}`, useCallback((s, signal, cursor) => getForumMessagePage(s, hiloId, signal, cursor), [hiloId]), !!context.data);
  const refresh = () => { setComposing(false); setNotice(''); context.retry(); messages.retry(); };
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Conversación del aula" subtitle={context.data?.aula.nombre ?? 'Foro de discusión'} back={() => router.canGoBack() ? router.back() : router.replace('/comunidad')} />
    <Screen>
      {(!aulaId || !hiloId) && <Text style={typography.error}>Abre una conversación desde la comunidad del aula.</Text>}
      <QueryFeedback {...context} notFound="La conversación no está disponible para tu cuenta." />
      {context.data && <>
        <Card><Text style={typography.title}>{context.data.hilo.titulo}</Text><Text style={typography.body}>Iniciado por {context.data.hilo.autorNombre} · {academicDate(context.data.hilo.fecha)}</Text><Badge title={context.data.aula.estado === 'ACTIVA' ? 'Participación del aula' : 'Aula concluida · solo consulta'} tone="neutral" /></Card>
        <QueryFeedback {...messages} loading={messages.loading && !messages.data} notFound="Los mensajes no están disponibles." />
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        {!!messages.data && <Text style={typography.body}>Respuestas más recientes primero.</Text>}
        {messages.data?.items.length === 0 && !messages.loading && <Text style={typography.body}>Todavía no hay respuestas. Añade contexto o comparte tu primera aportación.</Text>}
        {messages.data?.items.map(m => <Card key={m.id}><Text style={typography.title}>{m.autorNombre}</Text><Text style={typography.body}>{academicDate(m.fecha)}</Text><Text style={typography.body}>{m.texto}</Text></Card>)}
        {!!messages.data && <PageFooter query={messages} noun="respuestas" disabled={busy} />}
        {context.data.aula.estado === 'ACTIVA' && (composing ? <>
          <ContentForm title="Responder al tema" fields={[{ key: 'texto', label: 'Tu respuesta', multiline: true, max: 10000 }]} initial={{ texto: '' }} confirm="Confirmar respuesta" validate={v => { contentText(v.texto, 'Respuesta', 10000); }}
            submit={(v, key, signal) => responderForo(session!, context.data!.aula, hiloId, v, key, signal)} onSaved={() => { setComposing(false); context.retry(); messages.retry(); setNotice('Respuesta guardada y confirmada por el servidor.'); }} refresh={refresh} onBusy={setBusy} />
          <Button title="Cancelar respuesta" secondary disabled={busy} onPress={() => setComposing(false)} />
        </> : <Button title="Escribir respuesta" onPress={() => setComposing(true)} />)}
        <Button title="Actualizar conversación" secondary disabled={busy || messages.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}

export default function ForumScreen(){const {session}=useAuth();return <StudentLegacyRoute route="/foro">{session?.user.role==='ALUMNO'?<StudentForum />:<ForumScreenContent />}</StudentLegacyRoute>;}
