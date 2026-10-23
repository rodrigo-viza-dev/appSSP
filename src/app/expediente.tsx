import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { ContentForm } from '@/features/shared/content-form';
import { RequirementsForm } from '@/features/expediente/requirements-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { ApiError, type Session } from '@/services/api';
import { cerrarExpediente, getExpediente, guardarEvaluacion, validateEvaluacion, type Expediente } from '@/services/expedientes';
import { descargarExpedientePdf } from '@/services/descargar-pdf';
import { useAuth } from '@/state/auth';
import { academicDate as academicDateTime } from '@/utils/date';
import { colors } from '@/theme';

function ExpedienteScreenContent() {
  const router = useAppRouter(), { session, signOut } = useAuth(), params = useLocalSearchParams<{ practicaId?: string }>();
  const id = typeof params.practicaId === 'string' ? params.practicaId : '';
  const query = useSessionQuery(`expediente:${id}`, useCallback((s: Session, signal: AbortSignal) => getExpediente(s, id, signal), [id]), !!id);
  const data = query.data;
  const [form, setForm] = useState<'requisitos' | 'evaluacion' | 'cierre' | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const result = useRef<Expediente | null>(null), downloading = useRef<AbortController | null>(null);
  useEffect(() => () => { downloading.current?.abort(); }, []);
  const editor = session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN';
  const canEvaluate = session?.user.role === 'SUPERVISOR' && data?.supervisor?.userId === session.user.id;
  const refresh = () => { setForm(null); setBusy(false); setError(''); setNotice(''); result.current = null; query.retry(); };
  const saved = () => { if (result.current) query.setData(result.current); result.current = null; setForm(null); setBusy(false); setNotice('Operación guardada y confirmada por el servidor.'); };
  async function download() {
    if (!session || !data || downloading.current || busy) return;
    const controller = new AbortController(); downloading.current = controller; setBusy(true); setError(''); setNotice('Preparando PDF…');
    const timer = setTimeout(() => controller.abort(), 60000);
    try { await descargarExpedientePdf(session, id, controller.signal); if (!controller.signal.aborted) setNotice('PDF preparado. Puedes guardarlo desde la descarga o el menú de tu dispositivo.'); }
    catch (e) { if (e instanceof ApiError && e.status === 401) signOut(true); else { setNotice(''); setError(controller.signal.aborted ? 'La descarga tardó demasiado. Puedes intentarlo nuevamente.' : e instanceof Error ? e.message : 'No se pudo preparar el PDF.'); } }
    finally { clearTimeout(timer); downloading.current = null; setBusy(false); }
  }
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Expediente de prácticas" subtitle={data?.practica.practicanteNombre ?? 'Evaluación y cierre'} back={() => router.canGoBack() ? router.back() : router.replace('/expedientes')} />
    <Screen>
      {!id && <Text style={typography.error}>Abre el expediente desde la lista de prácticas.</Text>}
      <QueryFeedback {...query} notFound="Esta práctica no está disponible para tu cuenta." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
      {data && session && <>
        <Card><Text style={typography.title}>{data.practica.aulaNombre} · {data.practica.periodo}</Text>
          <Badge title={data.cerrado ? 'Práctica cerrada' : data.puedeCerrar ? 'Requisitos cumplidos · Pendiente de autorización docente' : 'Requisitos pendientes'} tone={data.cerrado || data.puedeCerrar ? 'success' : 'warning'} />
          <Text style={typography.body}>Docente: {data.practica.docenteNombre}</Text><Text style={typography.body}>Centro: {data.centro?.nombre ?? 'Sin asociar a esta práctica'}</Text><Text style={typography.body}>Supervisor: {data.supervisor?.nombre ?? 'Sin asociar'}</Text>
          <Text style={typography.title}>{data.practica.horasValidadas} / {data.practica.horasMinimas} h validadas</Text>
          {!data.cerrado && (session.user.role === 'ALUMNO' || session.user.role === 'SUPERVISOR') && <Button title={canEvaluate ? 'Revisar bitácora y horas' : 'Abrir mi bitácora'} secondary disabled={busy} onPress={() => router.push({ pathname: '/mis-horas', params: { practicaId: id } })} />}
        </Card>
        <Text style={typography.title}>Requisitos de cierre</Text>
        {data.checklist.map(item => <Card key={item.id}><Badge title={item.cumplido ? 'Cumplido' : 'Pendiente'} tone={item.cumplido ? 'success' : 'warning'} /><Text style={typography.title}>{item.titulo}</Text><Text style={typography.body}>{item.detalle}</Text></Card>)}
        {data.configuracion && <Card><Text style={typography.title}>Criterio confirmado</Text><Text style={typography.body}>{data.configuracion.motivo}</Text><Text style={typography.body}>{data.configuracion.responsable} · {academicDateTime(data.configuracion.fecha)}</Text><Text style={typography.body}>Nota mínima de tareas: {data.configuracion.notaMinima === null ? 'Sin umbral numérico; se exige revisión docente' : `${data.configuracion.notaMinima} / 20`}</Text></Card>}
        {editor && !data.cerrado && !form && <Button title={data.configuracion ? 'Modificar requisitos de cierre' : 'Definir requisitos de cierre'} secondary disabled={busy} onPress={() => { setNotice(''); setForm('requisitos'); }} />}
        {form === 'requisitos' && <RequirementsForm key={`req:${id}:${data.revisionConfiguracion}`} data={data} session={session} onBusy={setBusy} onResult={v => { result.current = v; }} onSaved={saved} refresh={refresh} />}
        <Text style={typography.title}>Evaluación del supervisor</Text>
        {data.evaluacion ? <Card><Badge title={data.evaluacion.conclusion === 'FAVORABLE' ? 'Favorable' : 'Requiere mejoras'} tone={data.evaluacion.conclusion === 'FAVORABLE' ? 'success' : 'warning'} />
          {!data.evaluacionVigente && <Text style={typography.error}>La evaluación pertenece a una asignación anterior. El supervisor vigente debe actualizarla.</Text>}
          <Text style={typography.title}>Desempeño</Text><Text style={typography.body}>{data.evaluacion.desempeno}</Text><Text style={typography.title}>Fortalezas</Text><Text style={typography.body}>{data.evaluacion.fortalezas}</Text><Text style={typography.title}>Aspectos por mejorar</Text><Text style={typography.body}>{data.evaluacion.mejoras}</Text>
          <Text style={typography.body}>{data.evaluacion.supervisorNombre} · {academicDateTime(data.evaluacion.fecha)} · Revisión {data.evaluacion.revision}</Text>
        </Card> : <Text style={typography.body}>El supervisor vinculado todavía no completó la evaluación.</Text>}
        {canEvaluate && !data.cerrado && !form && <Button title={data.evaluacion ? 'Actualizar evaluación' : 'Completar evaluación'} disabled={busy} onPress={() => { setNotice(''); setForm('evaluacion'); }} />}
        {form === 'evaluacion' && <ContentForm key={`ev:${id}:${data.evaluacion?.revision ?? 0}`} title="Evaluación del practicante" onBusy={setBusy} refresh={refresh} onSaved={saved} confirm="Confirmar evaluación del supervisor"
          initial={{ desempeno: data.evaluacion?.desempeno ?? '', fortalezas: data.evaluacion?.fortalezas ?? '', mejoras: data.evaluacion?.mejoras ?? '', conclusion: data.evaluacion?.conclusion ?? '', conformidad: '' }}
          fields={[{ key: 'desempeno', label: 'Desempeño y actividades revisadas', multiline: true, max: 4000 }, { key: 'fortalezas', label: 'Fortalezas del practicante', multiline: true, max: 2000 }, { key: 'mejoras', label: 'Aspectos por mejorar y recomendaciones', multiline: true, max: 2000 }, { key: 'conclusion', label: 'Conclusión de la evaluación', choices: [{ value: 'FAVORABLE', label: 'Evaluación favorable' }, { value: 'REQUIERE_MEJORAS', label: 'Requiere mejoras' }] }, { key: 'conformidad', label: 'Conformidad del supervisor', choices: [{ value: 'SI', label: 'He revisado y confirmo esta evaluación' }] }]}
          validate={validateEvaluacion} submit={async (v, _key, signal) => { result.current = await guardarEvaluacion(session, data, v, signal); }} />}
        <Text style={typography.title}>Tareas del expediente</Text>
        {data.tareas.length === 0 && <Text style={typography.body}>No hay tareas publicadas.</Text>}
        {data.tareas.map(t => <Card key={t.id}><Text style={typography.title}>{t.titulo}</Text><Badge title={t.obligatoria ? t.cumplida ? 'Exigida · Cumplida' : 'Exigida · Pendiente' : 'Sin exigir para el cierre'} tone={t.obligatoria && !t.cumplida ? 'warning' : 'neutral'} /><Text style={typography.body}>Nota: {t.nota === null ? 'Sin calificar' : `${t.nota} / 20`}</Text>{!!t.retroalimentacion && <Text style={typography.body}>{t.retroalimentacion}</Text>}
          {!data.cerrado && session.user.role === 'ALUMNO' && <Button title={`Abrir tarea: ${t.titulo}`} secondary disabled={busy} onPress={() => router.push({ pathname: '/tarea', params: { aulaId: data.practica.aulaId, tareaId: t.id } })} />}
          {!data.cerrado && editor && !!t.entregaId && <Button title={`Revisar entrega: ${t.titulo}`} secondary disabled={busy} onPress={() => router.push({ pathname: '/revisar-entrega', params: { aulaId: data.practica.aulaId, entregaId: t.entregaId } })} />}
        </Card>)}
        <Text style={typography.title}>Metas del expediente</Text>
        {data.metas.length === 0 && <Text style={typography.body}>No hay metas definidas.</Text>}
        {data.metas.map(m => <Card key={m.id}><Text style={typography.title}>{m.descripcion || m.tipo.replaceAll('_', ' ')}</Text><Text style={typography.body}>{m.alcanzada} / {m.objetivo}</Text><Badge title={m.obligatoria ? m.cumplida ? 'Exigida · Cumplida' : 'Exigida · Pendiente' : 'Sin exigir para el cierre'} tone={m.obligatoria && !m.cumplida ? 'warning' : 'neutral'} /></Card>)}
        {!data.cerrado && <Button title="Consultar metas de esta práctica" secondary disabled={busy} onPress={() => router.push({ pathname: '/metas', params: { practicaId: id } })} />}
        {data.cierre && <Card><Text style={typography.title}>Cierre autorizado · Expediente v{data.cierre.version}</Text><Text style={typography.body}>{data.cierre.responsable} · {academicDateTime(data.cierre.fecha)}</Text><Text style={typography.body}>{data.cierre.motivo}</Text><Text style={typography.body}>Se conservan los datos que se revisaron al confirmar el cierre.</Text></Card>}
        {editor && !data.cerrado && !form && <><Button title="Revisar y autorizar cierre" disabled={busy || !data.puedeCerrar} onPress={() => { setNotice(''); setForm('cierre'); }} />{!data.puedeCerrar && <Text style={typography.body}>Completa los requisitos pendientes para habilitar el cierre.</Text>}</>}
        {form === 'cierre' && <ContentForm title="Autorizar cierre de práctica" onBusy={setBusy} refresh={refresh} onSaved={saved} confirm="Confirmar cierre y conservar expediente"
          initial={{ resumen: `${data.practica.practicanteNombre}\n${data.practica.aulaNombre}\n${data.practica.horasValidadas} h validadas\nTodos los requisitos del expediente cumplidos. Se bloquearán cambios posteriores.`, motivo: '' }}
          fields={[{ key: 'resumen', label: 'Práctica que se cerrará', readOnly: true }, { key: 'motivo', label: 'Fundamento de autorización del cierre', multiline: true, max: 2000 }]}
          validate={v => { if (v.motivo.trim().length < 5) throw new ApiError(400, 'Explica el fundamento del cierre.'); }}
          submit={async (v, _key, signal) => { result.current = await cerrarExpediente(session, data, v.motivo, signal); }} />}
        {!!form && <Button title="Cancelar y volver al expediente" secondary disabled={busy} onPress={() => setForm(null)} />}
        <Button title={busy && downloading.current ? 'Preparando PDF…' : data.cierre ? 'Descargar expediente final PDF' : 'Descargar expediente en curso PDF'} secondary disabled={busy || !!form} onPress={() => void download()} />
        <Button title="Actualizar expediente" secondary disabled={busy || query.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}

export default function ExpedienteScreen(){return <StudentLegacyRoute route="/expediente"><ExpedienteScreenContent /></StudentLegacyRoute>;}
