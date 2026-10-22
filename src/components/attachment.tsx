import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, typography } from './ui';
import { useAuth } from '@/state/auth';
import { descargarArchivo } from '@/services/descargar-archivo';
export function Attachment({ aulaId, id, title = 'Descargar documento adjunto' }: { aulaId: string; id: string; title?: string }) {
  const { session, signOut } = useAuth(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <View style={{ gap: 8 }}><Button title={busy ? 'Descargando documento…' : title} secondary disabled={busy} onPress={() => {
    if (!session) return; setBusy(true); setError('');
    void descargarArchivo(session, aulaId, id).catch(e => { if (e.status === 401) signOut(true); else setError(e.message); }).finally(() => setBusy(false));
  }} />{!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}</View>;
}
