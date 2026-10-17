import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { contentText, getAulasComunidad, getHilos, getMensajesForo, responderForo } from '@/services/comunidad';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';

export default function ForumScreen() {
  const router = useRouter(), params = useLocalSearchParams<{ aulaId?: string; hiloId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', hiloId = typeof params.hiloId === 'string' ? params.hiloId : '';
  const { session } = useAuth();
  const [busy, setBusy] = useState(false), [composing, setComposing] = useState(false), [notice, setNotice] = useState('');
  const context = useSessionQuery(`foro-contexto:${aulaId}:${hiloId}`, useCallback(async (s: Session, signal: AbortSignal) => {
    const aula = (await getAulasComunidad(s, signal)).find(a => a.id === aulaId);
    if (!aula) throw new ApiError(404, 'El aula no está disponible para tu cuenta.');
    const hilo = (await getHilos(s, aulaId, signal)).find(h => h.id === hiloId);
    if (!hilo) throw new ApiError(404, 'La conversación no pertenece a esta aula.');
    return { aula, hilo };
  }, [aulaId, hiloId]), !!session && !!aulaId && !!hiloId);
  const messages = useSessionQuery(`foro-mensajes:${hiloId}`, useCallback((s: Session, signal: AbortSignal) => getMensajesForo(s, hiloId, signal), [hiloId]), !!context.data);
  const refresh = () => { setComposing(false); setNotice(''); context.retry(); messages.retry(); };
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Conversación del aula" subtitle={context.data?.aula.nombre ?? 'Foro de discusión'} back={() => router.canGoBack() ? router.back() : router.replace('/comunidad')} />
    <Screen>
      {(!aulaId || !hiloId) && <Text style={typography.error}>Abre una conversación desde la comunidad del aula.</Text>}
      <QueryFeedback {...context} notFound="La conversación no está disponible para tu cuenta." />
      {context.data && <>
        <Card><Text style={typography.title}>{context.data.hilo.titulo}</Text><Text style={typography.body}>Iniciado por {context.data.hilo.autorNombre} · {academicDate(context.data.hilo.fecha)}</Text><Badge title={context.data.aula.estado === 'ACTIVA' ? 'Participación del aula' : 'Aula concluida · solo consulta'} tone="neutral" /></Card>
        <QueryFeedback {...messages} notFound="Los mensajes no están disponibles." />
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        {messages.data?.length === 0 && <Text style={typography.body}>Todavía no hay respuestas. Añade contexto o comparte tu primera aportación.</Text>}
        {messages.data?.map(m => <Card key={m.id}><Text style={typography.title}>{m.autorNombre}</Text><Text style={typography.body}>{academicDate(m.fecha)}</Text><Text style={typography.body}>{m.texto}</Text></Card>)}
        {context.data.aula.estado === 'ACTIVA' && (composing ? <>
          <ContentForm title="Responder al tema" fields={[{ key: 'texto', label: 'Tu respuesta', multiline: true, max: 10000 }]} initial={{ texto: '' }} confirm="Confirmar respuesta" validate={v => { contentText(v.texto, 'Respuesta', 10000); }}
            submit={(v, key, signal) => responderForo(session!, context.data!.aula, hiloId, v, key, signal)} onSaved={() => { setComposing(false); messages.retry(); setNotice('Respuesta guardada y confirmada por el servidor.'); }} refresh={refresh} onBusy={setBusy} />
          <Button title="Cancelar respuesta" secondary disabled={busy} onPress={() => setComposing(false)} />
        </> : <Button title="Escribir respuesta" onPress={() => setComposing(true)} />)}
        <Button title="Actualizar conversación" secondary disabled={busy || messages.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}
