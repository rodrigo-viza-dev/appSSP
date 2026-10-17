import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, Label, typography } from '@/components/ui';
import { ApiError } from '@/services/api';
import { saveAsistencia, type Asistencia } from '@/services/asistencia';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export function AttendanceForm({ data, onSaved, onBusy, refresh, onReview }: { data: Asistencia; onSaved: (value: Asistencia) => void; onBusy: (value: boolean) => void; refresh: () => void; onReview: () => void }) {
  const { session, signOut } = useAuth();
  const [items, setItems] = useState(data.items);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); onBusy(false); }, [session, onBusy]);
  const presentes = items.filter(v => v.presente).length;
  async function save() {
    if (!session || !review || uncertain || pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); onBusy(true); setError('');
    try {
      const saved = await saveAsistencia(session, data, items, controller.signal);
      if (!controller.signal.aborted) { setReview(false); onSaved(saved); }
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la asistencia.');
      setUncertain(!(reason instanceof ApiError) || reason.status === 0 || reason.status === 409 || reason.status >= 500);
      setReview(false);
    } finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); onBusy(false); } }
  }
  if (!items.length) return <Text style={typography.body}>No hay estudiantes inscritos para tomar asistencia.</Text>;
  return <View style={{ gap: 16 }}>
    {items.some(v => data.items.find(original => original.practicanteId === v.practicanteId)?.presente !== v.presente) && <Text accessibilityLiveRegion="polite" style={typography.body}>Hay cambios sin guardar.</Text>}
    <Text style={typography.title}>{presentes} presentes · {items.length - presentes} ausentes</Text>
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    {uncertain ? <Card><Text style={typography.body}>No se confirmó el resultado. Consulta la lista guardada antes de reenviar.</Text><Button title="Consultar asistencia actual" secondary onPress={refresh} /></Card> : <>
      {review && <><Label>REVISAR ASISTENCIA · {data.fecha}</Label><Text style={typography.body}>Al confirmar se reemplaza la asistencia de esta fecha con la lista completa que se muestra abajo.</Text></>}
      {items.map(item => review ? <Card key={item.practicanteId}><Text style={typography.title}>{item.practicanteNombre}</Text><Badge title={item.presente ? 'Presente' : 'Ausente'} tone={item.presente ? 'success' : 'warning'} /></Card> : <Pressable key={item.practicanteId} accessibilityRole="checkbox" accessibilityLabel={`Presente: ${item.practicanteNombre}`} aria-checked={item.presente} onPress={() => { onReview(); setItems(values => values.map(v => v.practicanteId === item.practicanteId ? { ...v, presente: !v.presente } : v)); }} style={{ minHeight: 64, padding: 18, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
        <Text style={typography.title}>{item.practicanteNombre}</Text><Badge title={item.presente ? 'Presente' : 'Ausente'} tone={item.presente ? 'success' : 'warning'} />{item.registrado === false && <Text style={typography.body}>Sin registro guardado para esta fecha.</Text>}
      </Pressable>)}
      {review ? <><Button title={busy ? 'Guardando asistencia…' : 'Confirmar asistencia'} disabled={busy} onPress={save} /><Button title="Corregir lista" secondary disabled={busy} onPress={() => setReview(false)} /></> : <Button title="Revisar asistencia" onPress={() => { onReview(); setReview(true); }} />}
    </>}
  </View>;
}
