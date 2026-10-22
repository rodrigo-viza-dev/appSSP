import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, typography } from '@/components/ui';
import { FilePicker } from './file-picker';
import { ApiError, request } from '@/services/api';
import { getTarea, parseTareaResponse, type Tarea } from '@/services/aulas';
import { useAuth } from '@/state/auth';
import { useDraft } from '@/features/shared/use-draft';
export function DeliveryComposer({ task, onSaved, onBusy }: { task: Tarea; onSaved: () => void; onBusy: (v: boolean) => void }) {
  const { session, signOut } = useAuth();
  const draft = useDraft('tarea', task.id, task.titulo, { task }, { descripcion: task.entrega?.descripcion ?? '', comentario: task.entrega?.comentario ?? '', archivoId: task.entrega?.archivoId ?? '', motivo: '', revision: task.entrega ? String(task.entrega.revision ?? 0) : '-1' });
  const value = draft.value, change = (key: keyof typeof value, text: string) => draft.setValue(v => ({ ...v, [key]: text }));
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const replacing = Number(value.revision) >= 0;
  async function send(consult = false) {
    if (!session || busy) return;
    setBusy(true); onBusy(true); setError('');
    const payload = { descripcion: value.descripcion.trim(), comentario: value.comentario.trim(), archivoId: value.archivoId || null, ...(replacing ? { revision: Number(value.revision), motivo: value.motivo.trim() } : {}) };
    try {
      await draft.pending();
      if (consult) {
        const saved = await getTarea(session, task.aulaId, task.id, AbortSignal.timeout(20000));
        if (saved.entrega && saved.entrega.descripcion === payload.descripcion && saved.entrega.comentario === payload.comentario && saved.entrega.archivoId === payload.archivoId && (!replacing || saved.entrega.revision === Number(value.revision) + 1)) { await draft.clear(); onSaved(); return; }
        setUncertain(false); setReview(true); setError('El envío no figura con esos datos. Puedes confirmar la misma solicitud; el servidor comprobará su versión.'); return;
      }
      const saved = parseTareaResponse(await request(`/alumno/aulas/${encodeURIComponent(task.aulaId)}/tareas/${encodeURIComponent(task.id)}/entregas`, session.token, payload, undefined, { method: replacing ? 'PUT' : 'POST', expectedStatus: replacing ? 200 : 201 }), task.aulaId, session.user.id);
      if (!saved.entrega || saved.entrega.descripcion !== payload.descripcion || saved.entrega.archivoId !== payload.archivoId) throw new ApiError(502, 'Consulta la entrega guardada antes de continuar.');
      await draft.clear(); onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOut(true);
      else { setError((e as Error).message); setUncertain(!(e instanceof ApiError) || e.status === 0 || e.status === 409 || e.status >= 500); }
    } finally { setBusy(false); onBusy(false); }
  }
  if (!draft.ready) return <Text style={typography.body}>Recuperando borrador…</Text>;
  return <Card><Text style={typography.title}>{replacing ? 'Reemplazar entrega sin calificar' : 'Preparar entrega'}</Text><Text accessibilityLiveRegion="polite" style={typography.body}>{draft.notice || 'Tu respuesta se conservará en este dispositivo mientras la preparas.'}</Text>
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    {uncertain ? <><Text style={typography.body}>Se conserva el envío pendiente. Con conexión, consulta el resultado antes de reenviar.</Text><Button title="Consultar entrega actual" disabled={busy} onPress={() => void send(true)} /></> : review ? <>
      <Text style={typography.body}>{value.descripcion.trim() || 'Entrega con documento adjunto'}</Text><Text style={typography.body}>{value.archivoId ? 'Se adjuntará el documento subido y seleccionado.' : 'Sin documento adjunto.'}</Text>
      {replacing && <Text style={typography.body}>Motivo: {value.motivo}</Text>}
      <Button title="Guardar envío pendiente en este dispositivo" secondary disabled={busy} onPress={() => void draft.pending().then(() => setError('Envío pendiente guardado. Puedes enviarlo desde Borradores cuando tengas conexión.')).catch(() => setError('No se pudo guardar el envío pendiente.'))} />
      <Button title={busy ? 'Enviando…' : replacing ? 'Confirmar reemplazo' : 'Confirmar entrega'} disabled={busy} onPress={() => void send()} /><Button title="Volver a editar" secondary disabled={busy} onPress={() => setReview(false)} />
    </> : <><Field label="Mi respuesta escrita" value={value.descripcion} onChangeText={v => change('descripcion', v)} multiline maxLength={6000} /><Field label="Comentario adicional" value={value.comentario} onChangeText={v => change('comentario', v)} multiline maxLength={2000} />
      <FilePicker aulaId={task.aulaId} onSelect={file => change('archivoId', file.id)} onBusy={setUploading} />
      {!!value.archivoId && <><Text style={typography.body}>Documento subido seleccionado para esta entrega.</Text><Button title="Quitar adjunto de esta entrega" secondary onPress={() => change('archivoId', '')} /></>}
      {replacing && <Field label="Motivo del reemplazo" value={value.motivo} onChangeText={v => change('motivo', v)} multiline maxLength={1000} />}
      <Button title="Revisar entrega" disabled={uploading} onPress={() => { if ((!value.descripcion.trim() && !value.archivoId) || replacing && value.motivo.trim().length < 5) { setError('Escribe una respuesta o adjunta un documento; para reemplazar, explica el motivo.'); return; } setError(''); setReview(true); }} />
    </>}
  </Card>;
}
