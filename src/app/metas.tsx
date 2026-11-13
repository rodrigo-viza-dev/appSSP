import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Field, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { ContentForm } from '@/features/shared/content-form';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { StudentRow, studentStyles as s } from '@/features/alumno/components';
import { FilterChip, PageFooter, PagedList } from '@/features/alumno/paged-components';
import { crearMeta, getGoalPage, guardarAvanceMeta, metaKinds, validateAvanceMeta, validateMeta, type GoalFilter, type GoalPage, type Meta } from '@/services/metas';
import { getPracticeDetail, getPracticePage } from '@/services/staff-pages';
import type { PracticaExpediente } from '@/services/expedientes';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';
import { StudentGoals } from '@/features/alumno/practice-goals';

const filters = [['TODAS', 'Todas las metas'], ['EN_PROGRESO', 'En progreso'], ['COMPLETADAS', 'Completadas']] as const;

function GoalsScreenContent() {
  const router = useAppRouter(), { session } = useAuth();
  const params = useLocalSearchParams<{ practicaId?: string }>();
  const [selectedId, setSelectedId] = useState(typeof params.practicaId === 'string' ? params.practicaId : '');
  const [selected, setSelected] = useState<PracticaExpediente | null>(null);
  const [creating, setCreating] = useState(false), [editing, setEditing] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<GoalFilter>('TODAS');
  const practiceSearch = useSearch(), goalSearch = useSearch();
  const canEdit = session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN';
  const practices = usePagedQuery(`metas-practicas:${practiceSearch.query}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getPracticePage(x, 'TODAS', practiceSearch.query, signal, cursor), [practiceSearch.query]), !!session && !selectedId);
  const detail = useSessionQuery(`meta-practica:${selectedId}`, useCallback((x: Session, signal: AbortSignal) => getPracticeDetail(x, selectedId, signal), [selectedId]), !!selectedId && !selected);
  const practice = selected && selected.id === selectedId ? selected : detail.data;
  const goals = usePagedQuery<Meta, GoalPage>(`metas:${selectedId}:${filter}:${goalSearch.query}`, useCallback((x: Session, signal: AbortSignal, cursor?: string | null) => getGoalPage(x, practice!, filter, goalSearch.query, signal, cursor), [practice, filter, goalSearch.query]), !!practice);
  const closed = practice?.estado === 'CERRADA';
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  const choose = (value: PracticaExpediente) => { setSelected(value); setSelectedId(value.id); setFilter('TODAS'); goalSearch.setValue(''); setCreating(false); setEditing(''); setNotice(''); };
  const change = () => { setSelected(null); setSelectedId(''); setFilter('TODAS'); goalSearch.setValue(''); setCreating(false); setEditing(''); setNotice(''); };
  const refresh = () => { setCreating(false); setEditing(''); setNotice(''); goals.retry(); };
  const saved = () => { setCreating(false); setEditing(''); goals.retry(); setNotice('Meta guardada y confirmada por el servidor.'); };
  if (!selectedId) return <PagedList<PracticaExpediente> title="Metas de prácticas" back={back} rows={practiceSearch.waiting ? [] : practices.data?.items ?? []}
    header={<>
      <Text style={s.muted}>Elige la práctica cuyas metas quieres consultar. Docencia y administración también definen objetivos y registran la producción revisada.</Text>
      <Field label="Buscar práctica" value={practiceSearch.value} onChangeText={practiceSearch.setValue} maxLength={120} placeholder="Nombre, aula o periodo" />
      <QueryFeedback {...practices} loading={practiceSearch.waiting || practices.loading && !practices.data} notFound="Las prácticas no están disponibles para tu cuenta." />
    </>}
    render={p => <StudentRow title={p.practicanteNombre} subtitle={`${p.aulaNombre} · ${p.periodo}\n${p.horasAcumuladas} de ${p.horasMinimas} h validadas · ${p.estado === 'CERRADA' ? 'Cerrada' : 'En curso'}`} onPress={() => choose(p)} />}
    empty={!practices.loading && !practices.error && !practiceSearch.waiting ? <Text style={s.muted}>{practiceSearch.query ? 'No hay prácticas que coincidan con la búsqueda.' : 'No tienes prácticas asignadas para consultar metas.'}</Text> : null}
    footer={<><PageFooter query={practices} noun="prácticas" disabled={practiceSearch.waiting} /><Button title="Actualizar prácticas" secondary disabled={practices.loading || practiceSearch.waiting} onPress={practices.retry} /></>} />;
  const renderGoal = (m: Meta) => {
    const percent = Math.min(100, Math.round(m.cantidadAlcanzada / m.cantidadObjetivo * 100)), done = m.cantidadAlcanzada >= m.cantidadObjetivo;
    return <Card key={`${m.id}:${m.cantidadAlcanzada}`}>
      <Text style={typography.title}>{metaKinds.find(k => k.value === m.tipo)?.label}</Text><Text style={typography.body}>{m.descripcion || 'Objetivo de producción de la práctica.'}</Text>
      <Badge title={done ? 'Meta completada' : 'En progreso'} tone={done ? 'success' : 'warning'} />
      <Text style={typography.title}>{m.cantidadAlcanzada} de {m.cantidadObjetivo} · {percent}%</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 8, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' }}><View style={{ height: 8, width: `${percent}%`, backgroundColor: colors.primary }} /></View>
      <Text style={typography.body}>Definida por {m.creadoPor} · {academicDate(m.fechaCreacion)}</Text>
      {m.tipo === 'HORAS' && <Text style={typography.body}>Avance automático. Las horas pendientes o rechazadas no cuentan.</Text>}
      {canEdit && !closed && m.tipo !== 'HORAS' && (editing === m.id ? <>
        <ContentForm title="Actualizar producción revisada" fields={[{ key: 'cantidad', label: 'Total de producción alcanzado', numeric: true, max: 7 }, { key: 'motivo', label: 'Producción revisada y motivo del cambio', multiline: true, max: 2000 }]} initial={{ cantidad: String(m.cantidadAlcanzada), motivo: '' }} confirm="Confirmar total revisado" validate={v => { validateAvanceMeta(m, v); }} submit={(v, _key, signal) => guardarAvanceMeta(session!, practice!, m, v, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
        <Button title="Cancelar actualización de meta" secondary disabled={busy} onPress={() => setEditing('')} />
      </> : <Button title="Actualizar producción" secondary disabled={busy || creating || !!editing} onPress={() => setEditing(m.id)} />)}
    </Card>;
  };
  return <PagedList<Meta> title="Metas de prácticas" back={back} rows={!practice || goalSearch.waiting ? [] : goals.data?.items ?? []}
    header={<>
      <Button title="Elegir otra práctica" secondary disabled={busy || creating || !!editing} onPress={change} />
      {!practice && <QueryFeedback {...detail} notFound="La práctica no está disponible para tu cuenta." />}
      {practice && <>
        <Card><Text style={typography.title}>{practice.practicanteNombre}</Text><Text style={typography.body}>{practice.aulaNombre} · {practice.periodo}</Text><Badge title={practice.estado.replaceAll('_', ' ')} tone="neutral" /></Card>
        <Button title="Ver requisitos y expediente de esta práctica" secondary disabled={busy || creating || !!editing} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: practice.id } })} />
        <Text style={typography.body}>El docente define los objetivos y registra la producción que ha revisado. Las metas de horas se actualizan desde las horas validadas de la bitácora.</Text>
        <QueryFeedback {...goals} loading={goalSearch.waiting || goals.loading && !goals.data} notFound="Las metas no están disponibles para tu cuenta." />
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        {goals.data && <Card><Text style={typography.title}>{goals.data.completadas} de {goals.data.totalMetas} metas completadas</Text><Text style={typography.body}>{goals.data.totalMetas - goals.data.completadas} metas con producción pendiente.</Text></Card>}
        <Field label="Buscar metas por descripción" editable={!busy && !editing && !creating} value={goalSearch.value} onChangeText={goalSearch.setValue} maxLength={120} placeholder="Descripción de la meta" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{filters.map(([value, title]) => <FilterChip key={value} title={title} selected={filter === value} disabled={busy || !!editing || creating} onPress={() => setFilter(value)} />)}</View>
        {canEdit && !closed && !creating && !editing && <Button title="Definir nueva meta" onPress={() => setCreating(true)} />}
        {creating && <>
          <ContentForm title="Nueva meta de producción" fields={[{ key: 'tipo', label: 'Tipo de meta', choices: metaKinds }, { key: 'objetivo', label: 'Cantidad objetivo', numeric: true, max: 7 }, { key: 'descripcion', label: 'Descripción de la meta (opcional)', multiline: true, max: 2000 }]} initial={{ tipo: 'ARTICULOS', objetivo: '', descripcion: '' }} confirm="Confirmar nueva meta" validate={validateMeta} submit={(v, key, signal) => crearMeta(session!, practice!, v, key, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
          <Button title="Cancelar nueva meta" secondary disabled={busy} onPress={() => setCreating(false)} />
        </>}
      </>}
    </>}
    render={renderGoal}
    empty={practice && !goals.loading && !goals.error && !goalSearch.waiting ? <Text style={s.muted}>{goalSearch.query || filter !== 'TODAS' ? 'No hay metas que coincidan con estos filtros.' : 'Todavía no se han definido metas para esta práctica.'}</Text> : null}
    footer={practice ? <><PageFooter query={goals} noun="metas" disabled={goalSearch.waiting} /><Button title="Actualizar metas" secondary disabled={goals.loading || goalSearch.waiting} onPress={refresh} /></> : null} />;
}

export default function GoalsScreen(){const {session}=useAuth();return <StudentLegacyRoute route="/metas">{session?.user.role==='ALUMNO'?<StudentGoals />:<GoalsScreenContent />}</StudentLegacyRoute>;}
