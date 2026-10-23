import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { getMetas, getPracticasMetas, metaKinds, type Meta } from '@/services/metas';
import type { Session } from '@/services/api';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';
import { useAppRouter } from './navigation';
import { StudentGroup, StudentRow, studentStyles as s } from './components';

export function StudentGoals() {
  const router = useAppRouter(), params = useLocalSearchParams<{ practicaId?: string }>();
  const requested = typeof params.practicaId === 'string' ? params.practicaId : '';
  const [selected, setSelected] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const practices = useStudentQuery('student-goals-practices', useCallback(getPracticasMetas, []), true);
  const chosen = selected || requested;
  const practice = chosen ? practices.data?.find(p => p.id === chosen) : practices.data?.[0];
  const id = practice?.id ?? '';
  const query = useStudentQuery(`student-goals:${id}`, useCallback((session: Session, signal: AbortSignal) => getMetas(session, practice!, signal), [practice]), !!practice);
  const done = query.data?.filter(m => m.cantidadAlcanzada >= m.cantidadObjetivo).length ?? 0;
  const rows = query.data?.filter(m => filter === 'all' || (filter === 'done' ? m.cantidadAlcanzada >= m.cantidadObjetivo : m.cantidadAlcanzada < m.cantidadObjetivo)) ?? [];
  const back = () => router.canGoBack() ? router.back() : router.replace('/alumno/mas');
  const choose = (value: string) => { setSelected(value); setExpanded(null); setFilter('all'); };
  const header = <View style={{ gap: 20, paddingBottom: 18 }}>
    <QueryFeedback {...practices} notFound="No pudimos consultar tus prácticas." />
    {practices.data?.length === 0 && <><Text style={s.title}>Aún no tienes una práctica asignada</Text><Text style={s.muted}>Tus metas aparecerán cuando la coordinación asigne tu práctica.</Text></>}
    {!!chosen && practices.data && !practice && <Text accessibilityRole="alert" style={s.muted}>Esta práctica no está disponible para tu cuenta. Puedes seleccionar otra de tus prácticas.</Text>}
    {practices.data && (practices.data.length > 1 || !!chosen && !practice) && <StudentGroup>{practices.data.map(p => <StudentRow key={p.id} title={p.aulaNombre} subtitle={`${p.periodo} · ${p.estado === 'CERRADA' ? 'Cerrada' : 'En curso'}`} end={p.id === id ? 'Actual' : undefined} onPress={() => choose(p.id)} />)}</StudentGroup>}
    {practice && <>
      <View style={{ gap: 12 }}><Text style={s.eyebrow}>{practice.periodo}</Text><Text accessibilityRole="header" style={s.hero}>{practice.aulaNombre}</Text>{practice.estado === 'CERRADA' && <Badge title="Práctica cerrada · Solo consulta" tone="neutral" />}</View>
      <QueryFeedback {...query} notFound="Las metas de esta práctica no están disponibles." />
      {query.data && <>
        <View style={s.priority}><Text style={s.eyebrow}>Objetivos completados</Text><Text style={s.hero}>{done} de {query.data.length}</Text><Text style={s.muted}>{query.data.length ? `${query.data.length - done} metas en progreso. El avance corresponde a la producción revisada por tu docente y a las horas validadas.` : 'Tu docente todavía no ha definido metas para esta práctica.'}</Text></View>
        {!!query.data.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['all', 'Todas'], ['pending', 'En progreso'], ['done', 'Completadas']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} aria-selected={filter === value} onPress={() => setFilter(value)} style={[s.chip, filter === value && s.chipSelected]}><Text style={{ color: filter === value ? c.paper : c.primary }}>{label}</Text></Pressable>)}</View>}
      </>}
    </>}
  </View>;
  return <View style={s.page}>
    <SafeAreaView edges={['top']}><View style={s.heading}><Pressable accessibilityRole="button" accessibilityLabel="Volver" style={s.back} onPress={back}><Text style={s.chevron}>‹</Text></Pressable><Text accessibilityRole="header" style={s.title}>Mis metas</Text></View></SafeAreaView>
    <FlatList<Meta> key={id} data={rows} keyExtractor={m => m.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content} ListHeaderComponent={header}
      renderItem={({ item: m }) => {
        const title = metaKinds.find(k => k.value === m.tipo)?.label ?? m.tipo;
        const complete = m.cantidadAlcanzada >= m.cantidadObjetivo;
        const percent = Math.min(100, Math.round(m.cantidadAlcanzada / m.cantidadObjetivo * 100));
        const open = expanded === m.id;
        return <View style={[s.group, { padding: 18, gap: 14 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Detalle de meta: ${title}`} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setExpanded(open ? null : m.id)} style={{ gap: 14, minHeight: 48 }}>
            <Badge title={complete ? 'Completada' : 'En progreso'} tone={complete ? 'success' : 'warning'} />
            <View style={s.line}><Text style={[s.sectionTitle, { flex: 1 }]}>{title}</Text><Text style={s.chevron}>{open ? '−' : '+'}</Text></View>
            <Text style={s.title}>{m.cantidadAlcanzada} de {m.cantidadObjetivo}{m.tipo === 'HORAS' ? ' h' : ''}</Text>
            <View accessibilityRole="progressbar" accessibilityLabel={`Avance de ${title}`} accessibilityValue={{ min: 0, max: 100, now: percent }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={s.track}><View style={[s.fill, { width: `${percent}%`, backgroundColor: complete ? c.green : c.primary }]} /></View>
          </Pressable>
          {open && <><Text style={s.muted}>{m.descripcion || 'Objetivo de producción de esta práctica.'}</Text><Text style={s.mini}>Definida por {m.creadoPor} · {academicDate(m.fechaCreacion)}</Text><Text style={s.muted}>{m.tipo === 'HORAS' ? 'Se actualiza con tus horas validadas. Las horas en revisión o rechazadas no cuentan.' : 'Tu docente registra el total de producción que ha revisado. Si falta una actualización, consulta con él.'}</Text>{m.tipo === 'HORAS' && <Button title="Consultar mis horas" secondary onPress={() => router.push({ pathname: '/mis-horas', params: { practicaId: id } })} />}</>}
        </View>;
      }}
      ListEmptyComponent={query.data && query.data.length > 0 && !rows.length ? <Text style={s.muted}>No hay metas en este filtro.</Text> : null}
      ListFooterComponent={<View style={{ gap: 18, paddingTop: 18 }}>{practice && <StudentGroup><StudentRow title="Ver expediente" subtitle="Consulta qué metas exige el cierre de tu práctica." onPress={() => router.push({ pathname: '/expediente', params: { practicaId: id } })} /></StudentGroup>}<Button title="Actualizar metas" secondary disabled={practices.loading || query.loading} onPress={practices.retry} /></View>}
    />
  </View>;
}
