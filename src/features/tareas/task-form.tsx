import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, typography } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { ApiError } from '@/services/api';
import { getTarea, type Tarea } from '@/services/aulas';
import { getTeacherTasks, matchesPublished, publishTask, submitWrittenTask, validateTaskDraft, type TaskDraft } from '@/services/tareas';
export function TaskForm({ aulaId, task, onSaved, onBusy }: { aulaId: string; task?: Tarea; onSaved: () => void; onBusy: (v: boolean) => void }) {
  const { session, signOut } = useAuth();
  const publishing = !task;
  const [value, setValue] = useState<TaskDraft>(() => ({ titulo: '', descripcion: '', fecha: '', comentario: '', solicitudId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }));
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); onBusy(false); }, [session, onBusy]);
  const change = (key: keyof TaskDraft, text: string) => setValue(v => ({ ...v, [key]: text }));
  function prepare() { try { validateTaskDraft(value, publishing); setError(''); setReview(true); } catch (e) { setError((e as Error).message); } }
  async function send(consult = false) {
    if (!session || pending.current || (!consult && (!review || uncertain))) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); onBusy(true); setError('');
    try {
      if (consult) {
        const found = publishing ? (await getTeacherTasks(session, aulaId, controller.signal)).find(t => t.id === `t-${value.solicitudId}`) : await getTarea(session, aulaId, task!.id, controller.signal);
        if (controller.signal.aborted) return;
        if (publishing ? !!found : !!found?.entrega) {
          const matches = publishing ? matchesPublished(found!, value) : found!.entrega!.descripcion === value.descripcion.trim() && found!.entrega!.comentario === value.comentario.trim() && found!.entrega!.archivoId === null;
          if (!matches) throw new ApiError(409, 'El registro guardado tiene otros datos. Revisa el listado antes de continuar.');
          onSaved();
        } else { setUncertain(false); setReview(true); setError('El envío aún no figura. Puedes confirmar la misma solicitud sin duplicarla.'); }
      } else {
        if (publishing) await publishTask(session, aulaId, value, controller.signal);
        else await submitWrittenTask(session, task!, value, controller.signal);
        if (!controller.signal.aborted) onSaved();
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      setError(reason instanceof ApiError && reason.status === 422 ? 'El servidor rechazó el envío. Revisa el plazo y los datos.' : reason instanceof Error ? reason.message : 'No se pudo confirmar el envío.');
      setUncertain(consult || !(reason instanceof ApiError) || reason.status === 0 || reason.status === 409 || reason.status >= 500);
    } finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); onBusy(false); } }
  }
  return <Card><Text style={typography.title}>{publishing ? 'Nueva tarea' : 'Respuesta escrita'}</Text>
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    {uncertain ? <><Text style={typography.body}>No se confirmó el resultado. Consulta lo guardado antes de reenviar.</Text><Button title={busy ? 'Consultando envío…' : 'Consultar envío actual'} disabled={busy} onPress={() => void send(true)} /></> : review ? <>
      {publishing && <Text style={typography.title}>{value.titulo.trim()}</Text>}
      <Text style={typography.body}>{value.descripcion.trim()}</Text>
      <Text style={typography.body}>{publishing ? value.fecha ? `Fecha límite: ${value.fecha}, 23:59:59 de Lima` : 'Sin fecha límite' : value.comentario.trim() || 'Sin comentario adicional'}</Text>
      <Text style={typography.body}>{publishing ? 'La tarea será visible para los alumnos del aula.' : 'Se admite una entrega. Revísala antes de confirmar.'}</Text>
      <Button title={busy ? 'Guardando envío…' : publishing ? 'Confirmar publicación' : 'Confirmar entrega'} disabled={busy} onPress={() => void send()} />
      <Button title="Corregir contenido" secondary disabled={busy} onPress={() => setReview(false)} />
    </> : <>
      {publishing && <Field label="Título de la tarea" value={value.titulo} onChangeText={v => change('titulo', v)} maxLength={200} />}
      <Field label={publishing ? 'Instrucciones de la tarea' : 'Mi respuesta escrita'} value={value.descripcion} onChangeText={v => change('descripcion', v)} multiline maxLength={6000} />
      {publishing ? <Field label="Fecha límite (AAAA-MM-DD, opcional)" value={value.fecha} onChangeText={v => change('fecha', v)} maxLength={10} /> : <Field label="Comentario adicional (opcional)" value={value.comentario} onChangeText={v => change('comentario', v)} multiline maxLength={2000} />}
      <Button title={publishing ? 'Revisar publicación' : 'Revisar entrega'} onPress={prepare} />
    </>}
  </Card>;
}
