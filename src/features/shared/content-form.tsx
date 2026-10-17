import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, typography } from '@/components/ui';
import { ApiError } from '@/services/api';
import { useAuth } from '@/state/auth';

export type ContentField = { key: string; label: string; readOnly?: boolean; multiline?: boolean; numeric?: boolean; max?: number; choices?: { value: string; label: string }[] };
// Se conserva la misma clave y el mismo contenido durante un reintento.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export function ContentForm({ title, fields, initial, confirm, validate, submit, onSaved, refresh, onBusy }: {
  title: string; fields: ContentField[]; initial: Record<string, string>; confirm: string;
  validate: (values: Record<string, string>) => void;
  submit: (values: Record<string, string>, key: string, signal: AbortSignal) => Promise<unknown>;
  onSaved: () => void; refresh: () => void; onBusy: (value: boolean) => void;
}) {
  const { signOut } = useAuth();
  const [values, setValues] = useState(initial), [review, setReview] = useState(false);
  const [error, setError] = useState(''), [uncertain, setUncertain] = useState(false), [conflict, setConflict] = useState(false), [busy, setBusy] = useState(false);
  const [key] = useState(newId);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); onBusy(false); }, [onBusy]);
  useEffect(() => { onBusy(busy || uncertain || conflict); }, [busy, uncertain, conflict, onBusy]);
  const prepare = () => { try { validate(values); setError(''); setReview(true); } catch (e) { setError((e as Error).message); } };
  async function save() {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await submit(values, key, controller.signal); if (!controller.signal.aborted) onSaved(); }
    catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) { signOut(true); return; }
      setError((e as Error).message || 'No se pudo confirmar el resultado.');
      setConflict(e instanceof ApiError && e.status === 409);
      setUncertain(!(e instanceof ApiError) || e.status === 0 || e.status >= 500);
    } finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); } }
  }
  return <Card><Text style={typography.title}>{title}</Text>
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    {conflict ? <><Text style={typography.body}>Los datos cambiaron. Consulta el estado actual antes de preparar otra operación.</Text><Button title="Consultar datos actuales" onPress={refresh} /></> : review ? <>
      {fields.map(f => <View key={f.key}><Text style={typography.body}>{f.label}</Text><Text style={typography.title}>{f.choices?.find(c => c.value === values[f.key])?.label ?? values[f.key]}</Text></View>)}
      {uncertain && <Text style={typography.body}>El resultado no está confirmado. Reintentar envía la misma solicitud sin duplicarla.</Text>}
      <Button title={busy ? 'Guardando…' : uncertain ? 'Reintentar la misma solicitud' : confirm} disabled={busy} onPress={() => void save()} />
      {!uncertain && <Button title="Volver a editar" secondary disabled={busy} onPress={() => setReview(false)} />}
    </> : <>
      {fields.map(f => f.readOnly ? <View key={f.key}><Text style={typography.body}>{f.label}</Text><Text style={typography.title}>{values[f.key]}</Text></View> : f.choices ? <View key={f.key} style={{ gap: 8 }}><Text style={typography.body}>{f.label}</Text>{f.choices.map(c => <Button key={c.value} title={c.label} secondary={values[f.key] !== c.value} onPress={() => setValues(v => ({ ...v, [f.key]: c.value }))} />)}</View> : <Field key={f.key} label={f.label} value={values[f.key] ?? ''} multiline={f.multiline} keyboardType={f.numeric ? 'number-pad' : 'default'} maxLength={f.max} onChangeText={text => setValues(v => ({ ...v, [f.key]: text }))} />)}
      <Button title="Revisar antes de guardar" onPress={prepare} />
    </>}
  </Card>;
}
