import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useOptionalStudent } from '@/features/alumno/state';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { listDrafts, writeDraft } from '@/storage/drafts';
import { useAuth } from '@/state/auth';
import { RegisterHoursForm } from '@/features/horas/forms';
import { DeliveryComposer } from '@/features/tareas/delivery-composer';
import { syncPendingDrafts } from '@/services/sync-drafts';
import type { PracticaHoras, RegistroHoras } from '@/services/horas';
import type { Tarea } from '@/services/aulas';
import { colors } from '@/theme';
import { StudentDrafts } from '@/features/alumno/drafts-guide';
type Entries = Awaited<ReturnType<typeof listDrafts>>;
function DraftsScreenContent() {
  const { session, signOut } = useAuth(), router = useAppRouter();
  const student = useOptionalStudent();
  const [entries, setEntries] = useState<Entries>([]), [selected, setSelected] = useState(''), [removing, setRemoving] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const refresh = () => { if (session) void listDrafts(session).then(setEntries).catch(() => setNotice('No se pudieron recuperar los borradores del dispositivo.')); };
  useEffect(refresh, [session]);
  const entry = entries.find(e => e.key === selected), context = entry?.draft.context as { practica?: PracticaHoras; registro?: RegistroHoras; task?: Tarea } | undefined;
  const saved = () => { setSelected(''); setNotice('Envío confirmado por el servidor.'); refresh(); student?.refresh(); };
  return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Borradores y envíos pendientes" subtitle="Guardados en este dispositivo y cuenta" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} /><Screen>
    <Text style={typography.body}>Los borradores se conservan al cerrar la app. Solo se envían los que confirmaste. Con conexión, pulsa Enviar pendientes confirmados; se comprobarán los resultados antes de reenviar.</Text>
    {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
    {!selected && <><Button title={busy ? 'Comprobando y enviando…' : 'Enviar pendientes confirmados'} disabled={busy || !entries.some(e => e.draft.status === 'POR_ENVIAR')} onPress={() => {
      if (!session) return; setBusy(true); setNotice(''); void syncPendingDrafts(session).then(r => { setNotice(`${r.sent} envíos confirmados.${r.failures.length ? '\n' + r.failures.join('\n') : ''}`); refresh(); if (r.sent > 0) student?.refresh(); }).catch(e => { if (e.status === 401) signOut(true); else setNotice(e.message); }).finally(() => setBusy(false));
    }} />
      {!entries.length && <Text style={typography.body}>Todavía no hay borradores. Empieza una actividad o una entrega para conservarla aquí.</Text>}
      {entries.map(e => <Card key={e.key}><Text style={typography.title}>{e.draft.title}</Text><Text style={typography.body}>{e.draft.status === 'POR_ENVIAR' ? 'Confirmado · pendiente de envío' : 'Borrador sin enviar'}</Text><Text style={typography.body}>{e.draft.value.descripcion?.slice(0, 160)}</Text><Button title={`Continuar: ${e.draft.title}`} secondary disabled={busy} onPress={() => setSelected(e.key)} />
        {removing === e.key ? <><Text style={typography.body}>Se eliminará este borrador del dispositivo. Los registros ya enviados permanecen en el servidor.</Text><Button title="Confirmar eliminación del borrador" disabled={busy} onPress={() => void writeDraft(e.key, null).then(() => { setRemoving(''); refresh(); })} /><Button title="Conservar borrador" secondary onPress={() => setRemoving('')} /></> : <Button title="Eliminar borrador local" secondary disabled={busy} onPress={() => setRemoving(e.key)} />}
      </Card>)}
    </>}
    {entry && context?.practica && <RegisterHoursForm key={entry.key} practica={context.practica} registro={context.registro} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
    {entry && context?.task && <DeliveryComposer key={entry.key} task={context.task} onSaved={saved} onBusy={setBusy} />}
    {!!selected && <Button title="Volver a mis borradores" secondary disabled={busy} onPress={() => { setSelected(''); refresh(); }} />}
    <Button title="Actualizar borradores del dispositivo" secondary disabled={busy} onPress={refresh} />
  </Screen></View>;
}

export default function DraftsScreen(){const {session}=useAuth();return <StudentLegacyRoute route="/borradores">{session?.user.role==='ALUMNO'?<StudentDrafts />:<DraftsScreenContent />}</StudentLegacyRoute>;}
