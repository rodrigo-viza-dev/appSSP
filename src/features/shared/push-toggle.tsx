import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { studentStyles as s } from '@/features/alumno/components';
import { disablePush, enablePush, getPushState, type PushState } from '@/services/push';
import { useAuth } from '@/state/auth';

const copy: Record<PushState, string> = {
  on: 'Activadas en este navegador. Recibirás tareas nuevas y revisiones aunque la app esté cerrada.',
  off: 'Recibe un aviso en este dispositivo cuando haya una tarea nueva o una revisión.',
  denied: 'El navegador bloqueó las notificaciones. Actívalas en la configuración del sitio y vuelve aquí.',
  unavailable: '',
  unsupported: '',
};

/** Fila para activar Web Push; no aparece si el navegador o el servidor no las admiten. */
export function PushToggle() {
  const { session } = useAuth();
  const [state, setState] = useState<PushState | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); void getPushState(controller.signal).then(v => { if (!controller.signal.aborted) setState(v); }).catch(() => setState('unsupported')); return () => controller.abort(); }, []);
  if (!session || !state || state === 'unsupported' || state === 'unavailable') return null;
  const toggle = async () => {
    setBusy(true); setError('');
    try { setState(state === 'on' ? await disablePush(session) : await enablePush(session)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron activar las notificaciones.'); }
    finally { setBusy(false); }
  };
  return <View style={[s.group, { padding: 16, gap: 8 }]}>
    <View style={s.line}><Text style={[s.rowTitle, { flex: 1 }]}>Notificaciones en este dispositivo</Text>
      {state !== 'denied' && <Pressable accessibilityRole="switch" accessibilityState={{ checked: state === 'on', disabled: busy }} aria-checked={state === 'on'} disabled={busy} onPress={() => { void toggle(); }} style={[s.chip, state === 'on' && s.chipSelected, { minHeight: 40 }]}><Text style={[s.link, state === 'on' && { color: '#FFFDFA' }]}>{busy ? '…' : state === 'on' ? 'Activadas' : 'Activar'}</Text></Pressable>}
    </View>
    <Text style={s.muted}>{copy[state]}</Text>
    {!!error && <Text accessibilityRole="alert" style={s.muted}>{error}</Text>}
  </View>;
}
