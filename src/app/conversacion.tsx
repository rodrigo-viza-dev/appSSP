import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { contentText } from '@/services/comunidad';
import { getChatContext, getMensajes, enviarMensaje, leerMensajes } from '@/services/mensajes';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';

function ConversationScreenContent() {
  const router = useAppRouter(), { session, signOut } = useAuth(), params = useLocalSearchParams<{ aulaId?: string; contactoId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '', peerId = typeof params.contactoId === 'string' ? params.contactoId : '';
  const context = useSessionQuery(`chat-contexto:${aulaId}:${peerId}`, useCallback((s: Session, signal: AbortSignal) => getChatContext(s, aulaId, peerId, signal), [aulaId, peerId]), !!aulaId && !!peerId && !!session);
  const messages = useSessionQuery(`chat:${aulaId}:${peerId}`, useCallback((s: Session, signal: AbortSignal) => getMensajes(s, aulaId, peerId, signal), [aulaId, peerId]), !!context.data);
  const [composing, setComposing] = useState(false), [sending, setSending] = useState(false), [reading, setReading] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null), busy = sending || reading;
  useEffect(() => () => pending.current?.abort(), [session]);
  const unread = messages.data?.filter(m => !m.mio && !m.leido).map(m => m.id) ?? [];
  const refresh = () => { setComposing(false); setNotice(''); setError(''); context.retry(); messages.retry(); };
  async function markRead() {
    if (!session || pending.current || !unread.length) return;
    const controller = new AbortController(); pending.current = controller; setReading(true); setError('');
    try { await leerMensajes(session, aulaId, peerId, unread.slice(0, 200), controller.signal); if (!controller.signal.aborted) { messages.retry(); setNotice('Lectura confirmada por el servidor.'); } }
    catch (e) { if (!controller.signal.aborted) { if (e instanceof ApiError && e.status === 401) signOut(true); else setError((e as Error).message); } }
    finally { if (!controller.signal.aborted) { pending.current = null; setReading(false); } }
  }
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title={context.data?.contacto.nombre ?? 'Conversación privada'} subtitle={context.data?.aula.nombre ?? 'Mensajería académica'} back={() => router.canGoBack() ? router.back() : router.replace('/mensajes')} />
    <Screen>
      {(!aulaId || !peerId) && <Text style={typography.error}>Abre la conversación desde tus contactos del aula.</Text>}
      <QueryFeedback {...context} notFound="El contacto no está disponible para tu cuenta." />
      {context.data && <>
        <Text style={typography.body}>Conversación entre el docente responsable y el alumno matriculado. No incluyas contraseñas ni datos personales innecesarios.</Text>
        <Badge title={context.data.aula.estado === 'ACTIVA' ? 'Mensajería del aula' : 'Aula concluida · solo consulta'} tone="neutral" />
        <QueryFeedback {...messages} notFound="La conversación no está disponible." />
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
        {unread.length > 0 && <Button title={`Marcar recibidos como leídos (${Math.min(unread.length, 200)})`} secondary disabled={busy} onPress={() => void markRead()} />}
        {messages.data?.length === 0 && <Text style={typography.body}>Todavía no hay mensajes con este contacto.</Text>}
        {messages.data?.map(m => <Card key={m.id}><Text style={typography.title}>{m.mio ? 'Tú' : m.remitenteNombre}</Text><Text style={typography.body}>{academicDate(m.fecha)}</Text><Text style={typography.body}>{m.texto}</Text><Badge title={m.mio ? m.leido ? 'Leído por el destinatario' : 'Enviado' : m.leido ? 'Leído' : 'Recibido sin leer'} tone={m.leido ? 'neutral' : 'warning'} /></Card>)}
        {context.data.aula.estado === 'ACTIVA' && (composing ? <>
          <ContentForm title="Nuevo mensaje privado" fields={[{ key: 'texto', label: 'Mensaje para el contacto', multiline: true, max: 10000 }]} initial={{ texto: '' }} confirm="Confirmar envío de mensaje" validate={v => { contentText(v.texto, 'Mensaje', 10000); }} submit={(v, key, signal) => enviarMensaje(session!, context.data!.aula, peerId, v, key, signal)} onSaved={() => { setComposing(false); messages.retry(); setNotice('Mensaje guardado y confirmado por el servidor.'); }} refresh={refresh} onBusy={setSending} />
          <Button title="Cancelar mensaje privado" secondary disabled={busy} onPress={() => setComposing(false)} />
        </> : <Button title="Escribir mensaje privado" disabled={busy} onPress={() => setComposing(true)} />)}
        <Button title="Actualizar conversación privada" secondary disabled={busy || messages.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}

export default function ConversationScreen(){return <StudentLegacyRoute route="/conversacion"><ConversationScreenContent /></StudentLegacyRoute>;}
