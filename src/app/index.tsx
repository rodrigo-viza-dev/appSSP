import { useAuth } from '@/state/auth';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/screen';
import { Button, Field, typography } from '@/components/ui';
import { colors, serif } from '@/theme';
import { usePractice } from '@/state/practice';

export default function LoginScreen() {
  const { enterDemo } = usePractice();
  const { busy, message: authMessage, signIn: authenticate } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
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
      <Field label="Correo de tu cuenta SSP" value={email} onChangeText={setEmail} placeholder="alumno@unsa.edu.pe" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" secureTextEntry autoComplete="current-password" />
      {authMessage !== '' && <Text accessibilityRole="alert" style={typography.error}>{authMessage}</Text>}
      {message !== '' && <Text accessibilityRole="alert" style={typography.error}>{message}</Text>}
      <Button title={busy ? "Ingresando…" : "Ingresar"} disabled={busy} onPress={signIn} />
      <Pressable accessibilityRole="button" style={s.recovery} onPress={() => setMessage('El backend aún no envía correos de recuperación. Solicita ayuda al administrador del SSP.')}><Text style={s.link}>¿Olvidaste tu contraseña?</Text></Pressable>
      <View style={s.demo}><Text style={s.demoText}>CONOCE LA APLICACIÓN</Text><Button title="Explorar demo" disabled={busy} secondary onPress={enterDemo} /></View>
      <Text style={s.footer}>UNSA · Escuela Profesional de Ciencias de la Comunicación</Text>
    </Screen>
  </View>;
}
const s = StyleSheet.create({
  hero: { backgroundColor: colors.primary }, heroInner: { padding: 28, paddingTop: 38, paddingBottom: 30, gap: 13 },
  university: { fontSize: 9, letterSpacing: 1.3, color: '#E7CED1' }, brand: { fontSize: 39, fontFamily: serif, color: colors.white }, brandAccent: { color: '#E7CED1' },
  school: { fontSize: 10, fontWeight: '600', letterSpacing: 1.7, color: '#E7CED1' }, rule: { width: 38, height: 2, backgroundColor: '#DABCC0', marginTop: 8 },
  recovery: { padding: 8, alignItems: 'center' }, link: { color: colors.primary, fontSize: 13 }, demo: { gap: 12, marginTop: 10 }, demoText: { fontSize: 10, letterSpacing: 1.3, color: colors.muted, textAlign: 'center' }, footer: { fontSize: 11, lineHeight: 18, textAlign: 'center', color: colors.muted, marginTop: 12 },
});
