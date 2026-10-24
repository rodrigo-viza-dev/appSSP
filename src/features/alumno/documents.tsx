import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Attachment } from '@/components/attachment';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { getAulasComunidad } from '@/services/comunidad';
import { ApiError, request, type Session } from '@/services/api';
import { FILE_LIMIT_MB, newOperationId, pickDocument, uploadDocument, type Archivo, type PickedDocument } from '@/services/archivos';
import { getFilePage } from '@/services/module-pages';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from './components';
import { FilterChip, PagedList, PageFooter } from './paged-components';
import { useAppRouter } from './navigation';

function UploadDocument({ aulaId, onSaved }: { aulaId: string; onSaved: () => void }) {
  const { session, signOut } = useAuth();
  const [picked, setPicked] = useState<PickedDocument | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const operation = useRef(''), pending = useRef<AbortController | null>(null);
  useEffect(() => () => { const controller = pending.current; pending.current = null; controller?.abort(); }, [session, aulaId]);
  async function upload() {
    if (!session || !picked || pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    const timer = setTimeout(() => controller.abort(), 60000);
    try { await uploadDocument(session, aulaId, picked, operation.current, controller.signal); if (!controller.signal.aborted) onSaved(); }
    catch (reason) { if (!controller.signal.aborted) { if (reason instanceof ApiError && reason.status === 401) signOut(true); else setError((reason as Error).message); } else if (pending.current === controller) setError('La carga tardó demasiado. Reintenta la misma solicitud o consulta tus documentos.'); }
    finally { clearTimeout(timer); if (pending.current === controller) { pending.current = null; setBusy(false); } }
  }
  return <View style={{ gap: 16 }}><Text style={s.muted}>PDF, DOCX o ZIP de hasta {FILE_LIMIT_MB} MB. Subir un documento no confirma una entrega.</Text><Button title={picked ? 'Elegir otro documento' : 'Seleccionar documento'} secondary disabled={busy} onPress={() => { setError(''); void pickDocument().then(value => { if (value) { setPicked(value); operation.current = newOperationId(); } }).catch(reason => setError(reason.message)); }} />{picked && <><Text style={s.rowTitle}>{picked.name}</Text><Text style={s.muted}>{Math.ceil((picked.size ?? 0) / 1024)} KB</Text><Button title={busy ? 'Subiendo…' : 'Confirmar carga del documento'} disabled={busy} onPress={() => void upload()} /></>}{!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}</View>;
}

export function StudentDocuments() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string }>(), { session, signOut } = useAuth();
  const [selected, setSelected] = useState(typeof params.aulaId === 'string' ? params.aulaId : ''), [filter, setFilter] = useState('materiales'), [uploading, setUploading] = useState(false), [removing, setRemoving] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const aulas = useStudentQuery('student-document-aulas', useCallback(getAulasComunidad, []), true), aula = selected ? aulas.data?.find(a => a.id === selected) : aulas.data?.[0], id = aula?.id ?? '';
  const q = usePagedQuery(`documents:${id}:${filter}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getFilePage(s, id, filter, signal, cursor), [id, filter]), !!aula && !uploading);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); }, [session, id]);
  const back = () => router.canGoBack() ? router.back() : router.replace('/alumno/aulas');
  async function remove(file: Archivo) {
    if (!session || pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await request(`/aulas/${encodeURIComponent(id)}/archivos/${encodeURIComponent(file.id)}`, session.token, undefined, controller.signal, { method: 'DELETE', expectedStatus: 204 }); if (!controller.signal.aborted) { setRemoving(''); q.retry(); } }
    catch (reason) { if (!controller.signal.aborted) { if (reason instanceof ApiError && reason.status === 401) signOut(true); else setError((reason as Error).message); } }
    finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  if (uploading && aula) return <StudentPage title="Subir documento" subtitle={aula.nombre} back={() => setUploading(false)}><UploadDocument aulaId={id} onSaved={() => { setUploading(false); if (filter === 'propios') q.retry(); else setFilter('propios'); }} /></StudentPage>;
  const header = <><QueryFeedback {...aulas} notFound="Tus aulas no están disponibles." />{aulas.data && (aulas.data.length > 1 || !!selected && !aula) && <StudentGroup>{aulas.data.map(a => <StudentRow key={a.id} title={a.nombre} subtitle={a.periodo} end={a.id === id ? 'Actual' : undefined} onPress={() => { setSelected(a.id); setRemoving(''); }} />)}</StudentGroup>}{!!selected && aulas.data && !aula && <Text accessibilityRole="alert" style={typography.error}>El aula no está disponible para tu cuenta.</Text>}{aula && <><Text accessibilityRole="header" style={s.hero}>{aula.nombre}</Text><Text style={s.muted}>Materiales del aula y documentos que subiste. Los archivos se descargan cuando los solicitas.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['materiales', 'Del aula'], ['propios', 'Mis documentos'], ['todos', 'Todos']].map(([value, label]) => <FilterChip key={value} title={label} selected={filter === value} disabled={busy} onPress={() => { setFilter(value); setRemoving(''); }} />)}</View>{aula.estado === 'ACTIVA' && <Button title="Subir documento propio" onPress={() => setUploading(true)} />}<QueryFeedback loading={q.loading && !q.data} error={q.error} retry={q.retry} notFound="Los documentos no están disponibles." />{!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}</>}{aulas.data?.length === 0 && <Text style={s.muted}>Tus documentos aparecerán cuando estés matriculado en un aula.</Text>}</>;
  return <PagedList title="Documentos del aula" back={back} header={header} rows={q.data?.items ?? []} render={file => <View style={[s.group, { padding: 18, gap: 14 }]}><Text style={s.rowTitle}>{file.nombreOriginal}</Text><Text style={s.muted}>{Math.ceil(file.tamanio / 1024)} KB · {file.subidoPorNombre} · {academicDate(file.createdAt)}</Text><Attachment aulaId={id} id={file.id} title={`Descargar ${file.nombreOriginal}`} />{file.subidoPorId === session?.user.id && aula?.estado === 'ACTIVA' && (removing === file.id ? <><Text style={s.muted}>Se eliminará esta carga si no pertenece a una entrega ni a su historial.</Text><Button title="Confirmar eliminación de la carga" disabled={busy} onPress={() => void remove(file)} /><Button title="Conservar documento" secondary disabled={busy} onPress={() => setRemoving('')} /></> : <Button title="Eliminar carga propia" secondary disabled={busy} onPress={() => setRemoving(file.id)} />)}</View>} empty={q.data && !q.data.items.length ? <Text style={s.muted}>{filter === 'materiales' ? 'El docente aún no ha compartido materiales en esta aula.' : 'No hay documentos en este filtro.'}</Text> : null} footer={aula ? <><PageFooter query={q} noun="documentos" /><Button title="Actualizar documentos" secondary disabled={busy || q.loading} onPress={q.retry} /></> : null} />;
}
