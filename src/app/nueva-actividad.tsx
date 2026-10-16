import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Field, Header, typography } from '@/components/ui';
import { usePractice } from '@/state/practice';

export default function NewActivityScreen() {
  const router = useRouter();
  const { demo, addActivity } = usePractice();
  const today = new Date();
  const [date, setDate] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  if (!demo) return <Redirect href="/" />;
  function save() {
    const parsed = new Date(`${date}T12:00:00`);
    const value = Number(hours.replace(',', '.'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== Number(date.slice(0, 4)) || parsed.getMonth() + 1 !== Number(date.slice(5, 7)) || parsed.getDate() !== Number(date.slice(8))) { setError('Ingresa una fecha válida con el formato AAAA-MM-DD.'); return; }
    if (parsed > new Date(new Date().setHours(23, 59, 59, 999))) { setError('La fecha no puede ser posterior a hoy.'); return; }
    if (!Number.isFinite(value) || value <= 0 || value > 24) { setError('Ingresa un valor mayor a cero y de hasta 24 horas.'); return; }
    if (description.trim().length < 10) { setError('Describe tu actividad con al menos 10 caracteres.'); return; }
    addActivity({ date, hours: value, description: description.trim() }); router.replace('/(tabs)/bitacora');
  }
  return <View style={{ flex: 1 }}><Header title="Nueva actividad" subtitle="Se agrega a tu bitácora" back={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/bitacora')} /><Screen>
    <Badge title="Registro de demostración" tone="neutral" />
    <Field label="Fecha · AAAA-MM-DD" value={date} onChangeText={setDate} placeholder="2026-06-25" autoCorrect={false} maxLength={10} />
    <Field label="Horas trabajadas" value={hours} onChangeText={setHours} placeholder="Ej. 6" keyboardType="decimal-pad" maxLength={5} />
    <Field label="¿Qué hiciste?" value={description} onChangeText={setDescription} placeholder="Describe la actividad que realizaste…" multiline maxLength={1000} />
    {error !== '' && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    <Button title="Guardar registro" onPress={save} /><Text style={typography.body}>Tu supervisora revisará este registro antes de que sume a tus horas validadas.</Text><Text style={[typography.body, { fontSize: 12 }]}>Los registros de la demo se mantienen solo durante esta sesión.</Text>
  </Screen></View>;
}
