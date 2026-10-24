import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, typography } from '@/components/ui';
import { RegisterHoursForm } from '@/features/horas/forms';
import { DeliveryComposer } from '@/features/tareas/delivery-composer';
import { listDrafts, writeDraft } from '@/storage/drafts';
import { syncPendingDrafts } from '@/services/sync-drafts';
import { isCommunicationContext } from '@/services/communication-drafts';
import type { PracticaHoras, RegistroHoras } from '@/services/horas';
import type { Tarea } from '@/services/aulas';
import { useAuth } from '@/state/auth';
import { guideArticles } from '@/content/guide';
import { academicDate } from '@/utils/date';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from './components';
import { FilterChip, PagedList } from './paged-components';
import { CommunicationComposer } from './communication-composer';
import { useAppRouter } from './navigation';
import { useStudent } from './state';

export function StudentDrafts() {
  const { session, signOut } = useAuth(), router = useAppRouter(), student = useStudent();
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listDrafts>>>([]), [selected, setSelected] = useState(''), [filter, setFilter] = useState('all'), [removing, setRemoving] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const owner = useRef(session); owner.current = session;
  const syncing = useRef(false);
  const refresh = () => { if (!session) return; const current = session; void listDrafts(session).then(rows => { if (owner.current === current) setEntries(rows); }).catch(() => { if (owner.current === current) setError('No se pudieron recuperar los borradores. Revisa el almacenamiento del dispositivo.'); }); };
  useEffect(() => { setEntries([]); refresh(); return () => { owner.current = null; }; }, [session]);
  const entry = entries.find(row => row.key === selected), context = entry?.draft.context as { practica?: PracticaHoras; registro?: RegistroHoras; task?: Tarea } | undefined;
  const saved = () => { setSelected(''); setNotice('Envío confirmado por el servidor.'); refresh(); student.refresh(); };
  const back = () => router.canGoBack() ? router.back() : router.replace('/alumno/mas');
  if (selected) return <StudentPage title="Continuar borrador" back={() => setSelected('')} keyboard>{entry && <Text style={s.muted}>{entry.draft.title}</Text>}{entry?.draft.kind === 'horas' && context?.practica && <RegisterHoursForm key={entry.key} practica={context.practica} registro={context.registro} onSaved={saved} refresh={refresh} onBusy={setBusy} />}{entry?.draft.kind === 'tarea' && context?.task && <DeliveryComposer key={entry.key} task={context.task} onSaved={saved} onBusy={setBusy} />}{entry?.draft.kind === 'comunicacion' && isCommunicationContext(entry.draft.context) && <CommunicationComposer key={entry.key} context={entry.draft.context} title={entry.draft.title} onSaved={saved} onBusy={setBusy} />}{!entry && <Text style={s.muted}>El borrador ya no está disponible. Actualiza la lista para consultar los que permanecen en este dispositivo.</Text>}<Button title="Guardar y volver a borradores" secondary disabled={busy} onPress={() => { setSelected(''); refresh(); }} /></StudentPage>;
  const rows = entries.filter(row => filter === 'all' || row.draft.status === 'POR_ENVIAR').map(row => ({ ...row, id: row.key }));
  const pending = entries.filter(row => row.draft.status === 'POR_ENVIAR').length;
  async function sendPending() {
    if (!session || syncing.current) return;
    syncing.current = true;
    const current = session; setBusy(true); setError(''); setNotice('');
    try { const result = await syncPendingDrafts(session); if (owner.current === current) { setNotice(`${result.sent} ${result.sent === 1 ? 'envío confirmado' : 'envíos confirmados'}.${result.failures.length ? '\n' + result.failures.join('\n') : ''}`); refresh(); if (result.sent) student.refresh(); } }
    catch (reason) { if (owner.current === current) { if ((reason as { status?: number }).status === 401) signOut(true); else setError((reason as Error).message); } }
    finally { syncing.current = false; if (owner.current === current) setBusy(false); }
  }
  const header = <><Text style={s.muted}>Guardados en esta cuenta y dispositivo. Solo los envíos que ya confirmaste pueden enviarse desde aquí; se conserva la misma solicitud al reintentar.</Text><Text style={s.title}>{pending} {pending === 1 ? 'envío pendiente confirmado' : 'envíos pendientes confirmados'}</Text><View style={{ flexDirection: 'row', gap: 8 }}><FilterChip title="Todos" selected={filter === 'all'} disabled={busy} onPress={() => setFilter('all')} /><FilterChip title="Por enviar" selected={filter !== 'all'} disabled={busy} onPress={() => setFilter('pending')} /></View><Button title={busy ? 'Comprobando y enviando…' : 'Enviar pendientes confirmados'} disabled={busy || !pending} onPress={() => void sendPending()} />{!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}{!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}</>;
  return <PagedList title="Mis borradores" back={back} header={header} rows={rows} render={row => <View style={[s.group, { padding: 18, gap: 14 }]}><Text style={s.rowTitle}>{row.draft.title}</Text><Text style={s.muted}>{row.draft.status === 'POR_ENVIAR' ? 'Confirmado · Pendiente de envío' : 'Borrador sin enviar'} · {academicDate(row.draft.updatedAt)}</Text><Text numberOfLines={3} style={s.muted}>{row.draft.value.descripcion || row.draft.value.texto || row.draft.value.titulo}</Text><Button title={`Continuar: ${row.draft.title}`} secondary disabled={busy} onPress={() => setSelected(row.key)} />{removing === row.key ? <><Text style={s.muted}>Se elimina la copia de este dispositivo. Un envío ya recibido por el servidor se conserva.</Text><Button title="Confirmar eliminación del borrador" disabled={busy} onPress={() => { setBusy(true); void writeDraft(row.key, null).then(() => { setRemoving(''); refresh(); }).catch(() => setError('No se pudo eliminar el borrador.')).finally(() => setBusy(false)); }} /><Button title="Conservar borrador" secondary disabled={busy} onPress={() => setRemoving('')} /></> : <Button title="Eliminar borrador local" secondary disabled={busy} onPress={() => setRemoving(row.key)} />}</View>} empty={<Text style={s.muted}>{filter === 'all' ? 'Aún no hay borradores. Puedes empezar una actividad, una entrega o un mensaje.' : 'No hay envíos confirmados pendientes.'}</Text>} footer={<Button title="Actualizar borradores" secondary disabled={busy} onPress={refresh} />} />;
}

export function StudentGuide() {
  const router = useAppRouter();
  const [category, setCategory] = useState('Todas'), [expanded, setExpanded] = useState('');
  const available = guideArticles.filter(article => article.roles.includes('ALUMNO'));
  const categories = ['Todas', ...new Set(available.map(article => article.category))];
  const rows = available.filter(article => category === 'Todas' || article.category === category);
  return <PagedList title="Guía de prácticas" back={() => router.canGoBack() ? router.back() : router.replace('/alumno/mas')} header={<><Text style={s.muted}>Orientación para usar la app. Tu docente o coordinación define los objetivos, los plazos y los criterios académicos.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{categories.map(value => <FilterChip key={value} title={value} selected={category === value} onPress={() => { setCategory(value); setExpanded(''); }} />)}</View><Text style={s.muted}>{rows.length} artículos</Text></>} rows={rows} render={article => <StudentGroup><Pressable accessibilityRole="button" accessibilityLabel={`Leer guía: ${article.title}`} accessibilityState={{ expanded: expanded === article.id }} aria-expanded={expanded === article.id} onPress={() => setExpanded(value => value === article.id ? '' : article.id)} style={s.row}><View style={{ flex: 1, gap: 8 }}><Text style={s.eyebrow}>{article.category}</Text><Text style={s.rowTitle}>{article.title}</Text><Text style={s.muted}>{article.summary}</Text></View><Text style={s.chevron}>{expanded === article.id ? '−' : '+'}</Text></Pressable>{expanded === article.id && <View style={{ padding: 18, gap: 16 }}>{article.steps.map((step, i) => <Text key={i} style={s.muted}>{i + 1}. {step}</Text>)}{!!article.example && <><Text style={s.sectionTitle}>Ejemplo orientativo</Text><Text style={s.muted}>{article.example}</Text></>}</View>}</StudentGroup>} />;
}
