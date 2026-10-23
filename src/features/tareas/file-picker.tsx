import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, typography } from '@/components/ui';
import { Attachment } from '@/components/attachment';
import { getFiles, newOperationId, pickDocument, uploadDocument, type Archivo, type PickedDocument } from '@/services/archivos';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { QueryFeedback } from '@/components/query-feedback';
import { useAuth } from '@/state/auth';
import { request } from '@/services/api';
export function FilePicker({ aulaId, onSelect, onBusy, disabled = false, embedded=false }: { aulaId: string; onSelect?: (file: Archivo) => void; onBusy?: (busy: boolean) => void; disabled?: boolean; embedded?:boolean }) {
  const { session, signOut } = useAuth();
  const query = useSessionQuery(`files:${aulaId}`, useCallback((s, signal) => getFiles(s, aulaId, signal), [aulaId]), !!aulaId);
  const [picked, setPicked] = useState<PickedDocument | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [removing, setRemoving] = useState('');
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  const operation = useRef('');
  async function upload() {
    if (!session || !picked || busy) return;
    setBusy(true); setError('');
    try {
      const file = await uploadDocument(session, aulaId, picked, operation.current, AbortSignal.timeout(60000));
      onSelect?.(file); setPicked(null); query.retry();
    } catch (e) { const reason = e as Error & { status?: number }; if (reason.status === 401) signOut(true); else setError(reason.message || 'No se confirmó la carga. Reintenta la misma solicitud.'); }
    finally { setBusy(false); }
  }
  const content=<><Text style={typography.title}>Documentos · PDF, DOCX o ZIP</Text><Text style={typography.body}>Hasta 10 MB. Subir un archivo lo conserva, pero debes confirmar la entrega para enviarlo al docente.</Text>
    <Button title="Seleccionar documento" secondary disabled={busy || disabled} onPress={() => { setError(''); void pickDocument().then(file => { if (file) { setPicked(file); operation.current = newOperationId(); } }).catch(e => setError(e.message)); }} />
    {picked && <><Text style={typography.body}>{picked.name} · {Math.ceil((picked.size ?? 0) / 1024)} KB</Text><Button title={busy ? 'Subiendo documento…' : 'Subir documento seleccionado'} disabled={busy || disabled} onPress={() => void upload()} /></>}
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
    <QueryFeedback {...query} notFound="No hay documentos disponibles." />
    {query.data?.filter(f => !onSelect || f.subidoPorId === session?.user.id).map(f => <View key={f.id} style={{ gap: 8 }}><Text style={typography.body}>{f.nombreOriginal} · {Math.ceil(f.tamanio / 1024)} KB</Text><Attachment aulaId={aulaId} id={f.id} title={`Descargar ${f.nombreOriginal}`} />{onSelect && <Button title={`Usar ${f.nombreOriginal} en la entrega`} secondary disabled={busy || disabled} onPress={() => onSelect(f)} />}
      {!onSelect && f.subidoPorId === session?.user.id && (removing === f.id ? <><Text style={typography.body}>Se eliminará esta carga si no pertenece a una entrega ni a su historial.</Text><Button title={`Confirmar eliminación de ${f.nombreOriginal}`} disabled={busy} onPress={() => { setBusy(true); setError(''); void request(`/aulas/${encodeURIComponent(aulaId)}/archivos/${encodeURIComponent(f.id)}`, session!.token, undefined, undefined, { method: 'DELETE', expectedStatus: 204 }).then(() => { setRemoving(''); query.retry(); }).catch(e => setError(e.message)).finally(() => setBusy(false)); }} /><Button title="Conservar documento" secondary onPress={() => setRemoving('')} /></> : <Button title={`Eliminar carga propia: ${f.nombreOriginal}`} secondary disabled={busy} onPress={() => setRemoving(f.id)} />)}
    </View>)}
    <Button title="Actualizar documentos guardados" secondary disabled={busy} onPress={query.retry} />
  </>;
  return embedded?<View style={{gap:16}}>{content}</View>:<Card>{content}</Card>;
}
