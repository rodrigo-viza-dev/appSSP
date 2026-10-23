import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { ApiError, type Session } from '@/services/api';
import { getExpedienteResumen, getPracticasExpedientes, type ExpedienteResumen } from '@/services/expedientes';
import { descargarExpedientePdf } from '@/services/descargar-pdf';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';
import { useAppRouter } from './navigation';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from './components';

function Disclosure({ title, summary, children }: PropsWithChildren<{ title: string; summary?: string }>) {
  const [open, setOpen] = useState(false);
  return <View style={s.group}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(v => !v)} style={s.row}><View style={{ flex: 1, gap: 5 }}><Text style={s.sectionTitle}>{title}</Text>{!!summary && <Text style={s.muted}>{summary}</Text>}</View><Text style={s.chevron}>{open ? '−' : '+'}</Text></Pressable>
    {open && <View style={{ padding: 18, gap: 14 }}>{children}</View>}
  </View>;
}

export function StudentPracticeRecords() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string; alumnoId?: string }>();
  const query = useStudentQuery('student-practice-records', useCallback(getPracticasExpedientes, []), true);
  const rows = query.data?.filter(p => (!params.aulaId || p.aulaId === params.aulaId) && (!params.alumnoId || p.practicanteId === params.alumnoId));
  return <StudentPage title="Mis expedientes" subtitle="Requisitos, evaluación y cierre de tus prácticas." back={() => router.canGoBack() ? router.back() : router.replace('/alumno/mas')}>
    <QueryFeedback {...query} notFound="Tus expedientes todavía no están disponibles." />
    {rows?.length === 0 && <><Text style={s.title}>Aún no hay prácticas en esta selección</Text><Text style={s.muted}>La coordinación debe asignar tu práctica y vincular el centro y supervisor.</Text></>}
    {!!rows?.length && <StudentGroup>{rows.map(p => <StudentRow key={p.id} title={p.aulaNombre} subtitle={`${p.periodo} · ${p.estado === 'CERRADA' ? 'Cerrada' : 'En curso'}\n${p.horasAcumuladas} de ${p.horasMinimas} h validadas`} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: p.id } })} />)}</StudentGroup>}
    <Button title="Actualizar expedientes" secondary disabled={query.loading} onPress={query.retry} />
  </StudentPage>;
}

function PdfDownload({ id, closed }: { id: string; closed: boolean }) {
  const { session, signOut } = useAuth();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null), mounted = useRef(true);
  const owner = useRef({ session, id }); owner.current = { session, id };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, [session, id]);
  async function download() {
    if (!session || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const current = () => mounted.current && owner.current.session === session && owner.current.id === id;
    setBusy(true); setError(''); setNotice('Preparando el documento…');
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      await descargarExpedientePdf(session, id, controller.signal);
      if (current() && !controller.signal.aborted) setNotice('PDF preparado. Puedes guardarlo desde la descarga o el menú de tu dispositivo.');
    } catch (reason) {
      if (!current()) return;
      setNotice('');
      if (reason instanceof ApiError && reason.status === 401) signOut(true);
      else setError(controller.signal.aborted ? 'La descarga tardó demasiado. Inténtalo nuevamente.' : reason instanceof Error ? reason.message : 'No se pudo descargar el expediente.');
    } finally { clearTimeout(timer); if (pending.current === controller) pending.current = null; if (current()) setBusy(false); }
  }
  return <View style={{ gap: 12 }}><Text accessibilityRole="header" style={s.sectionTitle}>Tu documento</Text><Text style={s.muted}>{closed ? 'El PDF conserva el expediente del cierre.' : 'El PDF muestra el avance actual. Todavía no es un expediente cerrado.'}</Text><Button title={busy ? 'Preparando PDF…' : 'Descargar expediente PDF'} secondary disabled={busy} onPress={() => { void download(); }} />{!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}{!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}</View>;
}

function RequirementList({ data }: { data: ExpedienteResumen }) {
  const router = useAppRouter(), id = data.practica.id;
  const links: Record<string, { title: string; href: Href }> = {
    horas: { title: 'Ver mi bitácora', href: { pathname: '/mis-horas', params: { practicaId: id } } },
    tareas: { title: 'Ver tareas del aula', href: { pathname: '/aula', params: { id: data.practica.aulaId } } },
    metas: { title: 'Ver mis metas', href: { pathname: '/metas', params: { practicaId: id } } },
  };
  return <StudentGroup>{data.checklist.map(item => <View key={item.id} style={{ padding: 18, gap: 10, borderBottomWidth: 1, borderColor: c.border }}>
    <Badge title={item.cumplido ? 'Cumplido' : 'Pendiente'} tone={item.cumplido ? 'success' : 'warning'} />
    <Text style={s.rowTitle}>{item.titulo}</Text><Text style={s.muted}>{item.detalle}</Text>
    {!data.cerrado && links[item.id] && <Pressable accessibilityRole="button" accessibilityLabel={links[item.id].title} style={s.textButton} onPress={() => router.push(links[item.id].href)}><Text style={s.link}>{links[item.id].title} ›</Text></Pressable>}
  </View>)}</StudentGroup>;
}

export function StudentPracticeRecord() {
  const router = useAppRouter(), params = useLocalSearchParams<{ practicaId?: string }>();
  const id = typeof params.practicaId === 'string' ? params.practicaId : '';
  const query = useStudentQuery(`student-practice-record:${id}`, useCallback((session: Session, signal: AbortSignal) => getExpedienteResumen(session, id, signal), [id]), !!id);
  const data = query.data;
  const done = data?.checklist.filter(item => item.cumplido).length ?? 0;
  return <StudentPage title="Mi expediente" back={() => router.canGoBack() ? router.back() : router.replace('/expedientes')}>
    <QueryFeedback {...query} notFound="Esta práctica no está disponible para tu cuenta." />
    {!id && <Text style={s.muted}>Abre tu expediente desde la lista de prácticas.</Text>}
    {data && <>
      <View style={{ gap: 12 }}><Text style={s.eyebrow}>{data.practica.periodo}</Text><Text accessibilityRole="header" style={s.hero}>{data.practica.aulaNombre}</Text><Badge title={data.cerrado ? 'Práctica cerrada' : data.puedeCerrar ? 'Pendiente de autorización docente' : 'Requisitos pendientes'} tone={data.cerrado || data.puedeCerrar ? 'success' : 'warning'} /></View>
      <View style={s.priority}><Text style={s.eyebrow}>Requisitos cumplidos</Text><Text style={s.hero}>{done} de {data.checklist.length}</Text><Text style={s.muted}>{data.cerrado ? 'Este expediente conserva la información del cierre.' : data.puedeCerrar ? 'Los requisitos están cumplidos. Tu docente o la coordinación debe revisar y autorizar el cierre.' : 'Revisa los pendientes para saber qué necesitas completar. El cierre lo autoriza tu docente o la coordinación.'}</Text><Text style={s.rowTitle}>{data.practica.horasValidadas} de {data.practica.horasMinimas} h validadas</Text></View>
      <Text accessibilityRole="header" style={s.sectionTitle}>Requisitos de cierre</Text><RequirementList data={data} />
      <Disclosure title="Evaluación del supervisor" summary={!data.evaluacion ? 'Pendiente de evaluación' : !data.evaluacionVigente ? 'La asignación del supervisor cambió' : data.evaluacion.conclusion === 'FAVORABLE' ? 'Evaluación favorable' : 'Requiere mejoras'}>
        {data.evaluacion ? <>
          {!data.evaluacionVigente && <Text style={s.muted}>La evaluación corresponde a una asignación anterior. El supervisor vigente debe actualizarla.</Text>}
          <Text style={s.eyebrow}>Desempeño</Text><Text style={s.muted}>{data.evaluacion.desempeno}</Text><Text style={s.eyebrow}>Fortalezas</Text><Text style={s.muted}>{data.evaluacion.fortalezas}</Text><Text style={s.eyebrow}>Aspectos por mejorar</Text><Text style={s.muted}>{data.evaluacion.mejoras}</Text><Text style={s.mini}>{data.evaluacion.supervisorNombre} · {academicDate(data.evaluacion.fecha)} · Revisión {data.evaluacion.revision}</Text>
        </> : <Text style={s.muted}>Tu supervisor vinculado todavía no ha completado la evaluación. Esta parte depende de su revisión.</Text>}
      </Disclosure>
      <Disclosure title="Criterios del docente" summary={data.configuracion ? 'Requisitos definidos para esta práctica' : 'Pendientes de confirmación'}>
        {data.configuracion ? <><Text style={s.muted}>{data.configuracion.motivo}</Text><Text style={s.muted}>Nota mínima de las tareas exigidas: {data.configuracion.notaMinima === null ? 'sin umbral numérico; requieren revisión docente.' : `${data.configuracion.notaMinima} / 20.`}</Text><Text style={s.mini}>{data.configuracion.responsable} · {academicDate(data.configuracion.fecha)}</Text></> : <Text style={s.muted}>Tu docente debe confirmar qué tareas y metas requiere el cierre. No se aplican criterios supuestos.</Text>}
      </Disclosure>
      <Disclosure title="Datos de la práctica" summary={data.centro?.nombre ?? 'Centro pendiente de vinculación'}>
        <Text style={s.eyebrow}>Docente</Text><Text style={s.rowTitle}>{data.practica.docenteNombre}</Text><Text style={s.eyebrow}>Centro</Text><Text style={s.rowTitle}>{data.centro?.nombre ?? 'Sin asociar a esta práctica'}</Text>{data.centro && <Text style={s.muted}>RUC {data.centro.ruc} · {data.centro.direccion}</Text>}<Text style={s.eyebrow}>Supervisor</Text><Text style={s.rowTitle}>{data.supervisor?.nombre ?? 'Sin asociar'}</Text>{data.supervisor && <Text style={s.muted}>{data.supervisor.cargo}</Text>}
      </Disclosure>
      {data.cierre && <View style={s.notice}><Text style={s.rowTitle}>Cierre autorizado</Text><Text style={s.muted}>{data.cierre.responsable} · {academicDate(data.cierre.fecha)}</Text><Text style={s.muted}>{data.cierre.motivo}</Text></View>}
      <PdfDownload key={id} id={id} closed={data.cerrado} />
      <Button title="Actualizar expediente" secondary disabled={query.loading} onPress={query.retry} />
    </>}
  </StudentPage>;
}
