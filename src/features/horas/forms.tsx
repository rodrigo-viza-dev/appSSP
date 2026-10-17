import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, typography } from '@/components/ui';
import { ApiError } from '@/services/api';
import { getHoras, registrarHoras, revisarHoras, validateHoras, type HorasDraft, type PracticaHoras, type RegistroHoras } from '@/services/horas';
import { todayLima } from '@/services/asistencia';
import { useAuth } from '@/state/auth';

// Identificador de deduplicación; no se usa como credencial ni como secreto.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
function useWrite(onBusy: (value: boolean) => void) {
  const { session, signOut } = useAuth();
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => () => { pending.current?.abort(); onBusy(false); }, [session, onBusy]);
  async function run(action: (signal: AbortSignal) => Promise<void>, reconciling = false) {
    if (!session || pending.current || (uncertain && !reconciling)) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); onBusy(true); setError('');
    try { await action(controller.signal); }
    catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      setError(reason instanceof Error ? reason.message : 'No se pudo confirmar la operación.');
      setUncertain(reconciling || !(reason instanceof ApiError) || reason.status === 0 || reason.status === 409 || reason.status >= 500);
    } finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); onBusy(false); } }
  }
  return { run, busy, error, setError, uncertain, setUncertain, session };
}
export function RegisterHoursForm({ practica, onSaved, refresh, onBusy }: { practica: PracticaHoras; onSaved: () => void; refresh: () => void; onBusy: (v: boolean) => void }) {
  const [value, setValue] = useState<HorasDraft>(() => ({ fecha: todayLima(), horas: '', descripcion: '', solicitudId: newId() }));
  const [review, setReview] = useState(false);
  const write = useWrite(onBusy);
  const change = (key: keyof HorasDraft, text: string) => setValue(v => ({ ...v, [key]: text }));
  function prepare() { try { validateHoras(value); write.setError(''); setReview(true); } catch (e) { write.setError((e as Error).message); } }
  return <Card><Text style={typography.title}>Registrar actividad</Text>
    {!!write.error && <Text accessibilityRole="alert" style={typography.error}>{write.error}</Text>}
    {write.uncertain ? <><Text style={typography.body}>No se confirmó el resultado. Consulta la bitácora antes de registrar otra actividad.</Text><Button title={write.busy ? 'Consultando bitácora…' : 'Consultar bitácora actual'} disabled={write.busy} onPress={() => void write.run(async signal => {
      const rows = await getHoras(write.session!, practica.id, signal);
      if (signal.aborted) return;
      const found = rows.find(r => r.id === `h-${value.solicitudId}`);
      if (found) {
        const payload = validateHoras(value);
        if (found.horas !== payload.horas || found.descripcion !== payload.descripcion || found.fecha.slice(0, 10) !== value.fecha) throw new ApiError(409, 'La solicitud guardada tiene otros datos.');
        onSaved();
      } else { write.setUncertain(false); setReview(true); write.setError('La actividad aún no figura. Puedes confirmar la misma solicitud sin duplicarla.'); }
    }, true)} /></> : review ? <>
      <Text style={typography.body}>{value.fecha} · {value.horas} h</Text><Text style={typography.body}>{value.descripcion.trim()}</Text>
      <Text style={typography.body}>Se enviará al supervisor y quedará pendiente de validación.</Text>
      <Button title={write.busy ? 'Guardando actividad…' : 'Confirmar actividad'} disabled={write.busy} onPress={() => void write.run(async signal => { await registrarHoras(write.session!, practica, value, signal); if (!signal.aborted) onSaved(); })} />
      <Button title="Corregir actividad" secondary disabled={write.busy} onPress={() => setReview(false)} />
    </> : <>
      <Field label="Fecha de actividad (AAAA-MM-DD)" value={value.fecha} onChangeText={text => change('fecha', text)} maxLength={10} />
      <Field label="Horas trabajadas" value={value.horas} onChangeText={text => change('horas', text)} keyboardType="number-pad" maxLength={2} />
      <Field label="Descripción de la actividad" value={value.descripcion} onChangeText={text => change('descripcion', text)} multiline maxLength={2000} />
      <Button title="Revisar actividad" onPress={prepare} />
    </>}
  </Card>;
}
export function ReviewHoursForm({ registro, onSaved, refresh, onBusy, disabled }: { disabled: boolean; registro: RegistroHoras; onSaved: () => void; refresh: () => void; onBusy: (v: boolean) => void }) {
  const [decision, setDecision] = useState<'VALIDADO' | 'RECHAZADO' | null>(null);
  const write = useWrite(onBusy);
  return <View style={{ gap: 12 }}>
    {!!write.error && <Text accessibilityRole="alert" style={typography.error}>{write.error}</Text>}
    {write.uncertain ? <Button title="Consultar revisión actual" onPress={refresh} /> : decision ? <>
      <Text style={typography.body}>{decision === 'VALIDADO' ? `Se validarán ${registro.horas} h.` : 'Las horas quedarán rechazadas y no sumarán al avance.'} La decisión queda cerrada para este registro.</Text>
      <Button title={write.busy ? 'Guardando revisión…' : 'Confirmar revisión'} disabled={write.busy || disabled} onPress={() => void write.run(async signal => { await revisarHoras(write.session!, registro, decision, signal); if (!signal.aborted) onSaved(); })} />
      <Button title="Cancelar revisión" secondary disabled={write.busy || disabled} onPress={() => setDecision(null)} />
    </> : <>
      <Button title="Validar horas" disabled={disabled} onPress={() => setDecision('VALIDADO')} />
      <Button title="Rechazar horas" secondary disabled={disabled} onPress={() => setDecision('RECHAZADO')} />
    </>}
  </View>;
}
