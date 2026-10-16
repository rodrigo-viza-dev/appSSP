import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/screen';
import { Button, Field, typography } from '@/components/ui';
import { colors, serif } from '@/theme';
import { usePractice } from '@/state/practice';

export default function LoginScreen() {
  const { demo, enterDemo } = usePractice();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  if (demo) return <Redirect href="/(tabs)" />;
  function signIn() {
    if (!/^[^\s@]+@unsa\.edu\.pe$/i.test(email.trim())) { setMessage('Ingresa tu correo institucional @unsa.edu.pe.'); return; }
    if (!password) { setMessage('Ingresa tu contraseña.'); return; }
    setMessage('El acceso institucional estará disponible al conectar la plataforma. Por ahora puedes explorar la demo.');
  }
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <SafeAreaView edges={['top']} style={s.hero}><View style={s.heroInner}>
      <Text style={s.university}>UNIVERSIDAD NACIONAL DE SAN AGUSTÍN</Text>
      <Text accessibilityRole="header" style={s.brand}>Prácticas<Text style={s.brandAccent}>CC</Text></Text>
      <Text style={s.school}>CIENCIAS DE LA COMUNICACIÓN</Text><View style={s.rule} />
    </View></SafeAreaView>
    <Screen>
      <View style={{ gap: 8 }}><Text style={typography.title}>Bienvenido a tus prácticas</Text><Text style={typography.body}>Tu experiencia profesional, paso a paso.</Text></View>
      <Field label="Correo institucional" value={email} onChangeText={setEmail} placeholder="alumno@unsa.edu.pe" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" secureTextEntry autoComplete="current-password" />
      {message !== '' && <Text accessibilityRole="alert" style={typography.error}>{message}</Text>}
      <Button title="Ingresar" onPress={signIn} />
      <Pressable accessibilityRole="button" style={s.recovery} onPress={() => setMessage('La recuperación de contraseña se habilitará con el servicio institucional.')}><Text style={s.link}>¿Olvidaste tu contraseña?</Text></Pressable>
      <View style={s.demo}><Text style={s.demoText}>CONOCE LA APLICACIÓN</Text><Button title="Explorar demo" secondary onPress={() => { enterDemo(); router.replace('/(tabs)'); }} /></View>
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
