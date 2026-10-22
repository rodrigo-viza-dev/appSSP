import { useAuth } from '@/state/auth';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/screen';
import { Button, Field, typography } from '@/components/ui';
import { colors, serif } from '@/theme';
import { usePractice } from '@/state/practice';
import { API_URL, IS_LOCAL_API } from '@/services/api';
import { request } from '@/services/api';
import { GoogleAccess } from '@/features/auth/google-access';
import { Recovery } from '@/features/auth/recovery';

export default function LoginScreen() {
  const { enterDemo } = usePractice();
  const { busy, message: authMessage, signIn: authenticate, googleLinkRequired, linkGoogle, cancelGoogleLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false), [access, setAccess] = useState({ google: false, recuperacion: false });
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { const controller = new AbortController(); void request<{ google: boolean; recuperacion: boolean }>('/auth/capacidades', undefined, undefined, controller.signal).then(v => { if (!controller.signal.aborted) setAccess(v); }).catch(() => {}); return () => controller.abort(); }, []);
  function signIn() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('Ingresa un correo válido.'); return; }
    if (!password) { setMessage('Ingresa tu contraseña.'); return; }
    setMessage('');
    void authenticate(email, password);
    setPassword('');
  }
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <SafeAreaView edges={['top']} style={s.hero}><View style={s.heroInner}>
      <Text style={s.university}>UNIVERSIDAD NACIONAL DE SAN AGUSTÍN</Text>
      <Text accessibilityRole="header" style={s.brand}>Prácticas<Text style={s.brandAccent}>CC</Text></Text>
      <Text style={s.school}>CIENCIAS DE LA COMUNICACIÓN</Text><View style={s.rule} />
    </View></SafeAreaView>
    <Screen>
      <View style={{ gap: 8 }}><Text style={typography.title}>Bienvenido a tus prácticas</Text><Text style={typography.body}>Tu experiencia profesional, paso a paso.</Text></View>
      <View style={s.environment}>
        <Text style={s.environmentTitle}>{IS_LOCAL_API ? 'Entorno de pruebas locales' : 'Acceso a cuenta SSP'}</Text>
        <Text style={typography.body}>{IS_LOCAL_API ? 'Usa una cuenta ficticia de pruebas. La contraseña institucional no permite ingresar aquí.' : 'Usa una cuenta registrada en este servidor. Las cuentas de pruebas locales pertenecen a otro entorno.'}</Text>
        <Text selectable style={s.environmentUrl}>{API_URL}</Text>
      </View>
      {recovery ? <Recovery enabled={access.recuperacion} onCancel={() => setRecovery(false)} /> : <>
      <GoogleAccess enabled={access.google} />
      {googleLinkRequired && <View style={{ gap: 12 }}><Text style={typography.body}>Primera vinculación: confirma la contraseña actual de tu cuenta SSP. Después podrás ingresar con Google.</Text>
        <Field label="Contraseña SSP para vincular Google" value={googlePassword} onChangeText={setGooglePassword} secureTextEntry editable={!busy} />
        <Button title="Confirmar vínculo con Google" disabled={busy || !googlePassword} onPress={() => { void linkGoogle(googlePassword); setGooglePassword(''); }} />
        <Button title="Cancelar vínculo con Google" secondary disabled={busy} onPress={() => { cancelGoogleLink(); setGooglePassword(''); }} />
      </View>}
      <Field label="Correo de tu cuenta SSP" value={email} editable={ready && !busy} onChangeText={setEmail} placeholder="alumno@unsa.edu.pe" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      <Field label="Contraseña" value={password} editable={ready && !busy} onChangeText={setPassword} placeholder="Ingresa tu contraseña" secureTextEntry autoComplete="current-password" />
      {authMessage !== '' && <Text accessibilityRole="alert" style={typography.error}>{authMessage}</Text>}
      {message !== '' && <Text accessibilityRole="alert" style={typography.error}>{message}</Text>}
      <Button title={busy ? "Ingresando…" : "Ingresar"} disabled={!ready || busy} onPress={signIn} />
      <Pressable accessibilityRole="button" disabled={busy} style={s.recovery} onPress={() => setRecovery(true)}><Text style={s.link}>¿Olvidaste tu contraseña?</Text></Pressable>
      </>}
      <View style={s.demo}><Text style={s.demoText}>CONOCE LA APLICACIÓN</Text><Button title="Explorar demo" disabled={busy} secondary onPress={enterDemo} /></View>
      <Text style={s.footer}>UNSA · Escuela Profesional de Ciencias de la Comunicación</Text>
    </Screen>
  </View>;
}
const s = StyleSheet.create({
  hero: { backgroundColor: colors.primary }, heroInner: { padding: 28, paddingTop: 38, paddingBottom: 30, gap: 13 },
  university: { fontSize: 9, letterSpacing: 1.3, color: '#E7CED1' }, brand: { fontSize: 39, fontFamily: serif, color: colors.white }, brandAccent: { color: '#E7CED1' },
  school: { fontSize: 10, fontWeight: '600', letterSpacing: 1.7, color: '#E7CED1' }, rule: { width: 38, height: 2, backgroundColor: '#DABCC0', marginTop: 8 },
  environment: { gap: 7, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 17, padding: 16 }, environmentTitle: { color: colors.primary, fontSize: 14, fontWeight: '600' }, environmentUrl: { color: colors.muted, fontSize: 12 },
  recovery: { padding: 8, alignItems: 'center' }, link: { color: colors.primary, fontSize: 13 }, demo: { gap: 12, marginTop: 10 }, demoText: { fontSize: 10, letterSpacing: 1.3, color: colors.muted, textAlign: 'center' }, footer: { fontSize: 11, lineHeight: 18, textAlign: 'center', color: colors.muted, marginTop: 12 },
});
