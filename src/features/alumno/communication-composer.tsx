import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Button, Field, typography } from '@/components/ui';
import { useDraft } from '@/features/shared/use-draft';
import { communicationResource, validateCommunication, type CommunicationContext } from '@/services/communication-drafts';
import { syncDraft } from '@/services/sync-drafts';
import { draftKey } from '@/storage/drafts';
import { ApiError } from '@/services/api';
import { useAuth } from '@/state/auth';
import { studentStyles as s } from './components';

export function CommunicationComposer({ context, title, onSaved, onBusy }: { context: CommunicationContext; title: string; onSaved: () => void; onBusy: (value: boolean) => void }) {
  const { session, signOut } = useAuth();
  const [initial] = useState(() => ({ texto: '', titulo: '', solicitudId: randomUUID(), confirmado: '' }));
  const draft = useDraft('comunicacion', communicationResource(context), title, context, initial);
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const flight = useRef(false);
  const locked = draft.value.confirmado === 'si';
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  const [owner] = useState(() => ({ active: true }));
  useEffect(() => { owner.active = true; return () => { owner.active = false; }; }, [owner]);
  async function send() {
    if (!session || flight.current) return;
    flight.current = true;
    setBusy(true); setError('');
    try {
      validateCommunication(context, draft.value);
      draft.setValue(v => ({ ...v, confirmado: 'si' }));
      await draft.pending();
      await syncDraft(session, draftKey(session, 'comunicacion', communicationResource(context)));
      if (owner.active) onSaved();
    } catch (reason) {
      if (!owner.active) return;
      if (reason instanceof ApiError && reason.status === 401) signOut(true);
      else setError(reason instanceof Error ? reason.message : 'No se confirmó el envío. Se conserva la misma solicitud.');
    } finally { flight.current = false; if (owner.active) setBusy(false); }
  }
  if (!draft.ready) return <Text style={s.muted}>Recuperando tu borrador…</Text>;
  const field = context.type === 'tema' ? 'titulo' : 'texto';
  return <View style={{ gap: 18 }}>
    <Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text>
    {review || locked ? <><Text style={s.rowTitle}>{draft.value[field]}</Text><Text style={s.muted}>{locked ? 'Este envío ya fue confirmado. Reintentar conserva la misma solicitud para evitar duplicados.' : 'Revisa el contenido y el destino antes de confirmar el envío.'}</Text><Button title={busy ? 'Enviando…' : locked ? 'Reintentar envío confirmado' : 'Confirmar envío'} disabled={busy} onPress={() => void send()} />{!locked && <Button title="Volver a editar" secondary onPress={() => setReview(false)} />}</> : <><Field label={context.type === 'tema' ? 'Tema de discusión' : 'Tu mensaje'} value={draft.value[field]} multiline={context.type !== 'tema'} maxLength={context.type === 'tema' ? 200 : 10000} onChangeText={value => { draft.setValue(v => ({ ...v, [field]: value })); setError(''); }} /><Button title="Revisar mensaje" onPress={() => { try { validateCommunication(context, draft.value); setReview(true); setError(''); } catch (reason) { setError((reason as Error).message); } }} /></>}
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}<Text accessibilityLiveRegion="polite" style={s.muted}>{draft.notice}</Text><Text style={s.muted}>El borrador queda guardado en esta cuenta y dispositivo. Enviarlo requiere tu confirmación.</Text>
  </View>;
}
