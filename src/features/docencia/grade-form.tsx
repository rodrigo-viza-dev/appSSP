import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, Label, typography } from '@/components/ui';
import { ApiError } from '@/services/api';
import { calificarEntrega, validateNota, type EntregaDocente } from '@/services/docencia';
import { useAuth } from '@/state/auth';

export function GradeForm({ entrega, onSaved, onReview, refresh }: { entrega: EntregaDocente; onSaved: (value: EntregaDocente) => void; onReview: () => void; refresh: () => void }) {
  const { session, signOut } = useAuth();
  const [nota, setNota] = useState(entrega.nota === null ? '' : String(entrega.nota));
  const [feedback, setFeedback] = useState(entrega.retroalimentacion ?? '');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), [session]);
  const prepare = () => { onReview(); const message = validateNota(nota); setError(message); if (!message) setReview(true); };
  async function save() {
    if (!session || pending.current || !review || uncertain) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try {
      const saved = await calificarEntrega(session, entrega, nota, feedback, controller.signal);
      if (!controller.signal.aborted) { setReview(false); onSaved(saved); }
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la calificación.');
      setUncertain(!(reason instanceof ApiError) || reason.status === 0 || reason.status === 409 || reason.status >= 500);
      setReview(false);
    } finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); } }
  }
  return <View style={{ gap: 16 }}>
    <Text style={typography.title}>{entrega.nota === null ? 'Calificar entrega' : 'Actualizar calificación'}</Text>
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    {uncertain ? <Card><Text style={typography.body}>No se confirmó el resultado. Consulta la nota guardada antes de volver a enviarla.</Text><Button title="Consultar calificación actual" secondary onPress={refresh} /></Card> : review ? <Card>
      <Label>REVISAR CALIFICACIÓN</Label><Text style={typography.title}>{entrega.alumnoNombre} · {entrega.tareaTitulo}</Text>
      <Text style={typography.body}>Nota a guardar: {nota.trim()} / 20</Text><Text style={typography.body}>Observaciones: {feedback.trim() || 'Sin observaciones'}</Text>
      <Button title={busy ? 'Guardando calificación…' : 'Confirmar calificación'} disabled={busy} onPress={save} />
      <Button title="Corregir datos" secondary disabled={busy} onPress={() => setReview(false)} />
    </Card> : <>
      <Field label="Nota (0 a 20)" value={nota} onChangeText={setNota} keyboardType="number-pad" maxLength={2} />
      <Field label="Observaciones para el estudiante" value={feedback} onChangeText={setFeedback} multiline maxLength={2000} />
      <Button title="Revisar calificación" onPress={prepare} />
    </>}
    <Button title="Volver a consultar entrega" secondary disabled={busy} onPress={refresh} />
  </View>;
}
