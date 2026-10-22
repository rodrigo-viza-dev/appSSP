import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, typography } from '@/components/ui';
import { request } from '@/services/api';
export function Recovery({ enabled, onCancel }: { enabled: boolean; onCancel: () => void }) {
  const [reset, setReset] = useState(false), [email, setEmail] = useState(''), [codigo, setCodigo] = useState(''), [password, setPassword] = useState(''), [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function send() {
    if (busy) return;
    if (reset && (password !== repeat || password.length < 10 || password.length > 72 || codigo.trim().length < 32)) { setMessage('Pega el código completo y escribe dos veces la misma contraseña de 10 a 72 caracteres.'); return; }
    if (!reset && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('Ingresa un correo válido.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await request<{ message: string }>(reset ? '/auth/reset' : '/auth/recover', undefined, reset ? { codigo: codigo.trim(), password } : { email: email.trim().toLowerCase() });
      setMessage(response.message); setPassword(''); setRepeat(''); if (reset) setCodigo('');
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Card><Text style={typography.title}>{reset ? 'Restablecer contraseña SSP' : 'Recuperar acceso SSP'}</Text>
    {!enabled && <Text style={typography.body}>El envío de códigos necesita que se configure el servicio de correo. Puedes solicitar ayuda a administración.</Text>}
    {reset ? <><Field label="Código recibido por correo" value={codigo} onChangeText={setCodigo} editable={!busy} autoCapitalize="none" autoCorrect={false} />
      <Field label="Nueva contraseña SSP" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoComplete="new-password" />
      <Field label="Repite la nueva contraseña" value={repeat} onChangeText={setRepeat} editable={!busy} secureTextEntry /></> : <Field label="Correo de tu cuenta SSP" value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" />}
    {!!message && <Text accessibilityRole="alert" style={typography.body}>{message}</Text>}
    <Button title={busy ? 'Procesando…' : reset ? 'Actualizar contraseña' : 'Solicitar código'} disabled={busy || !reset && !enabled} onPress={() => void send()} />
    <Button title={reset ? 'Solicitar otro código' : 'Ya tengo un código'} secondary disabled={busy} onPress={() => { setReset(!reset); setMessage(''); }} />
    <Button title="Volver al ingreso" secondary disabled={busy} onPress={onCancel} />
  </Card>;
}
