import { useEffect, useRef, useState } from 'react';
import { Text, View, type TextInputProps } from 'react-native';
import { Button, Card, Field, Label, typography } from '@/components/ui';
import { ApiError } from '@/services/api';
import { useAuth } from '@/state/auth';

type FormField<T> = { key: keyof T; label: string; keyboardType?: TextInputProps['keyboardType']; maxLength?: number; multiline?: boolean; autoCapitalize?: TextInputProps['autoCapitalize'] };

export function RegistrationForm<T extends Record<string, string>, Result>({ value, onChange, fields, validate, submit, onSaved, reconcile, kind }: {
  value: T; onChange: (value: T) => void; fields: FormField<T>[]; validate: (value: T) => T;
  submit: (value: T, signal: AbortSignal) => Promise<Result>; onSaved: (result: Result) => void;
  reconcile: () => void; kind: 'centro' | 'supervisor';
}) {
  const { session, signOut } = useAuth();
  const [phase, setPhase] = useState<'edit' | 'review' | 'reconcile'>('edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); }, [session]);
  const noun = kind === 'centro' ? 'del centro' : 'del supervisor';

  function review() {
    try { onChange(validate(value)); setError(''); setPhase('review'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa los datos del formulario.'); }
  }
  async function confirm() {
    if (pending.current || !session) return;
    const controller = new AbortController();
    pending.current = controller; setBusy(true); setError('');
    try {
      const result = await submit(value, controller.signal);
      if (!controller.signal.aborted) onSaved(result);
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      if (!(reason instanceof ApiError) || reason.status === 0 || reason.status >= 500) {
        setPhase('reconcile');
        setError('No pudimos confirmar si el registro se guardó. Consulta tu ficha antes de volver a intentar.');
      } else {
        setError(reason.message);
        if (reason.status === 409) setPhase('reconcile');
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <View style={{ gap: 18 }}>
    <Text accessibilityRole="header" style={typography.title}>{phase === 'edit' ? `Registrar datos ${noun}` : `Revisar datos ${noun}`}</Text>
    {phase === 'edit' ? fields.map(field => <Field key={String(field.key)} label={field.label} value={value[field.key]} keyboardType={field.keyboardType} multiline={field.multiline} maxLength={field.maxLength} autoCapitalize={field.autoCapitalize ?? 'sentences'} autoCorrect={false} onChangeText={text => { onChange({ ...value, [field.key]: text }); setError(''); }} />)
      : <Card>{fields.map(field => <View key={String(field.key)} style={{ gap: 4 }}><Label>{field.label.toUpperCase()}</Label><Text style={typography.body}>{value[field.key]}</Text></View>)}</Card>}
    {phase === 'edit' && <Text style={typography.body}>{kind === 'centro' ? 'Completa la información del lugar donde realizarás tus prácticas.' : 'Ingresa el contacto de quien supervisa tu trabajo en el centro.'}</Text>}
    {phase === 'review' && <Text style={typography.body}>Revisa los datos antes de confirmar. Los cambios posteriores se gestionan con la coordinación.</Text>}
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    {phase === 'edit' && <Button title={`Revisar datos ${noun}`} onPress={review} />}
    {phase === 'review' && <>
      <Button title={busy ? 'Guardando…' : `Confirmar registro ${noun}`} disabled={busy} onPress={() => { void confirm(); }} />
      <Button title="Editar datos" secondary disabled={busy} onPress={() => { setPhase('edit'); setError(''); }} />
    </>}
    {phase === 'reconcile' && <Button title="Consultar ficha" onPress={reconcile} />}
  </View>;
}
