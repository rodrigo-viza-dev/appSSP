import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Field, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { ReviewHoursForm } from '@/features/horas/forms';
import { HoursHistory } from '@/features/horas/history';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { StudentRow, studentStyles as s } from '@/features/alumno/components';
import { FilterChip, PageFooter, PagedList } from '@/features/alumno/paged-components';
import { getHorasCaps, getHorasPage, type HoursFilter, type HoursPage, type RegistroHoras } from '@/services/horas';
import { getPracticeDetail, getPracticePage } from '@/services/staff-pages';
import type { PracticaExpediente } from '@/services/expedientes';
import type { Session } from '@/services/api';
import { useAppRouter } from '@/features/alumno/navigation';
import { academicDate } from '@/utils/date';

const filters = [['TODAS', 'Todas'], ['PENDIENTES', 'Pendientes'], ['VALIDADAS', 'Validadas'], ['RECHAZADAS', 'Rechazadas']] as const;

export function SupervisorHours() {
  const router = useAppRouter(), params = useLocalSearchParams<{ practicaId?: string }>();
  const [selectedId, setSelectedId] = useState(typeof params.practicaId === 'string' ? params.practicaId : '');
  const [filter, setFilter] = useState<HoursFilter>('TODAS');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const practiceSearch = useSearch();
  const caps = useSessionQuery('horas-caps', useCallback((x: Session, signal: AbortSignal) => getHorasCaps(x, signal), []), true);
  const practices = usePagedQuery<PracticaExpediente>(`horas-practicas:${practiceSearch.query}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getPracticePage(x, 'TODAS', practiceSearch.query, signal, cursor), [practiceSearch.query]), !selectedId);
  const detail = useSessionQuery(`horas-practica:${selectedId}`, useCallback((x: Session, signal: AbortSignal) => getPracticeDetail(x, selectedId, signal), [selectedId]), !!selectedId);
  const practice = detail.data;
  const hours = usePagedQuery<RegistroHoras, HoursPage>(`horas:${selectedId}:${filter}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getHorasPage(x, selectedId, filter, signal, cursor), [selectedId, filter]), !!selectedId);
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  const choose = (value: PracticaExpediente) => { setSelectedId(value.id); setFilter('TODAS'); setNotice(''); practiceSearch.setValue(''); };
  const change = () => { setSelectedId(''); setFilter('TODAS'); setNotice(''); };
  const refresh = () => { setNotice(''); hours.retry(); detail.retry(); };
  const saved = () => { setNotice('Revisión guardada y confirmada por el servidor.'); hours.retry(); detail.retry(); };
  if (!selectedId) return <PagedList<PracticaExpediente> title="Validar horas" back={back} rows={practiceSearch.waiting ? [] : practices.data?.items ?? []}
    header={<>
      <Text style={s.muted}>Elige la práctica cuya bitácora quieres revisar. Validar o rechazar horas se confirma con el servidor y solo las validadas suman al avance.</Text>
      <Field label="Buscar práctica" value={practiceSearch.value} onChangeText={practiceSearch.setValue} maxLength={120} placeholder="Nombre, aula o periodo" />
      <QueryFeedback {...practices} loading={practiceSearch.waiting || practices.loading && !practices.data} notFound="Las prácticas no están disponibles para tu cuenta." />
    </>}
    render={p => <StudentRow title={p.practicanteNombre} subtitle={`${p.aulaNombre} · ${p.periodo}\n${p.horasAcumuladas} de ${p.horasMinimas} h validadas · ${p.estado === 'CERRADA' ? 'Cerrada' : 'En curso'}`} onPress={() => choose(p)} />}
    empty={!practices.loading && !practices.error && !practiceSearch.waiting ? <Text style={s.muted}>{practiceSearch.query ? 'No hay prácticas que coincidan con la búsqueda.' : 'No tienes prácticas vinculadas a tu cuenta de supervisor.'}</Text> : null}
    footer={<><PageFooter query={practices} noun="prácticas" disabled={practiceSearch.waiting} /><Button title="Actualizar prácticas" secondary disabled={practices.loading || practiceSearch.waiting} onPress={practices.retry} /></>} />;
  const renderRow = (r: RegistroHoras) => <Card key={`${r.id}:${r.revision}`}>
    <Text style={typography.title}>{r.horas} h · {academicDate(r.fecha)}</Text><Text style={typography.body}>{r.descripcion}</Text>
    <Badge title={r.estadoValidacion === 'VALIDADO' ? 'Validado' : r.estadoValidacion === 'RECHAZADO' ? 'Rechazado' : 'Pendiente'} tone={r.estadoValidacion === 'VALIDADO' ? 'success' : 'warning'} />
    {!!r.observacion && <Text style={typography.body}>Observación del supervisor: {r.observacion}</Text>}
    {!!caps.data && <HoursHistory registro={r} />}
    {r.estadoValidacion === 'PENDIENTE' && practice?.estado !== 'CERRADA' && (!!caps.data ? <ReviewHoursForm disabled={busy} registro={r} onSaved={saved} refresh={refresh} onBusy={setBusy} /> : <Text style={typography.body}>Actualiza el servidor para revisar horas con observaciones.</Text>)}
  </Card>;
  return <PagedList<RegistroHoras> title="Validar horas" back={back} rows={hours.data?.items ?? []}
    header={<>
      <Button title="Elegir otra práctica" secondary disabled={busy} onPress={change} />
      {!practice && <QueryFeedback {...detail} notFound="La práctica no está disponible para tu cuenta." />}
      {practice && <>
        <Card><Text style={typography.title}>{practice.practicanteNombre}</Text><Text style={typography.body}>{practice.aulaNombre} · {practice.periodo}</Text><Badge title={practice.estado.replaceAll('_', ' ')} tone="neutral" /></Card>
        <Button title="Evaluar practicante y consultar expediente" secondary disabled={busy} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: practice.id } })} />
        <QueryFeedback {...hours} notFound="La bitácora no está disponible para tu cuenta." />
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        {hours.data && <Card><Text style={typography.title}>{hours.data.horasValidadas} h validadas · Meta: {practice.horasMinimas} h</Text><Text style={typography.body}>{hours.data.horasPendientes} h pendientes · {hours.data.horasRechazadas} h rechazadas</Text><Text style={typography.body}>Solo las horas validadas suman al avance de la práctica.</Text></Card>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{filters.map(([value, title]) => <FilterChip key={value} title={title} selected={filter === value} disabled={busy} onPress={() => setFilter(value)} />)}</View>
      </>}
    </>}
    render={renderRow}
    empty={practice && !hours.loading && !hours.error ? <Text style={s.muted}>{filter === 'TODAS' ? 'Todavía no hay actividades registradas.' : 'No hay actividades en este filtro.'}</Text> : null}
    footer={practice ? <><PageFooter query={hours} noun="actividades" /><Button title="Actualizar bitácora" secondary disabled={busy || hours.loading} onPress={refresh} /></> : null} />;
}
