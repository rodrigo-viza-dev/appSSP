import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Header, Label, typography } from '@/components/ui';
import { getAula, getCalificaciones, getTareas } from '@/services/aulas';
import type { Session } from '@/services/api';
import { deliveryLabel } from '@/features/aulas/presentation';
import { academicDate } from '@/utils/date';
import { QueryFeedback } from '@/components/query-feedback';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { colors, serif } from '@/theme';

export default function AulaScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const [section, setSection] = useState<'tareas' | 'notas'>('tareas');
  const loadAula = useCallback((session: Session, signal: AbortSignal) => getAula(session, id, signal), [id]);
  const loadTareas = useCallback((session: Session, signal: AbortSignal) => getTareas(session, id, signal), [id]);
  const loadNotas = useCallback((session: Session, signal: AbortSignal) => getCalificaciones(session, id, signal), [id]);
  const aula = useStudentQuery(`aula:${id}`, loadAula, !!id.trim());
  const tareas = useStudentQuery(`tareas:${id}`, loadTareas, !!aula.data);
  const notas = useStudentQuery(`notas:${id}`, loadNotas, !!aula.data);
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');

  return <View style={s.root}>
    <Header title="Mi aula" subtitle={aula.data?.nombre ?? 'Prácticas preprofesionales'} back={back} />
    <Screen>
      {!id.trim() && <><Text accessibilityRole="alert" style={typography.error}>El enlace del aula no es válido. Ábrela desde tu panel.</Text><Button title="Ir a mi panel" onPress={() => router.replace('/panel')} /></>}
      <QueryFeedback {...aula} notFound="El aula no está disponible o ya no estás inscrito." />
      {aula.data && <>
        <Card>
          <Label>CICLO {aula.data.ciclo}</Label>
          <Text accessibilityRole="header" style={typography.title}>{aula.data.nombre}</Text>
          <Text style={typography.body}>Docente: {aula.data.profesorNombre}</Text>
          <Badge title={aula.data.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" />
          <Text style={typography.body}>Semana {aula.data.semanaActual} de {aula.data.semanasTotales}</Text>
          <View accessibilityRole="progressbar" accessibilityLabel="Avance del aula" accessibilityValue={{ min: 0, max: 100, now: aula.data.progreso }} style={s.track}>
            <View style={[s.fill, { width: `${aula.data.progreso}%` }]} />
          </View>
          <Text style={typography.body}>{aula.data.progreso}% de avance registrado</Text>
        </Card>
        <View style={s.tabs}>
          {(['tareas', 'notas'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: section === value }} onPress={() => setSection(value)} style={[s.tab, section === value && s.selected]}>
            <Text style={[s.tabText, section === value && s.selectedText]}>{value === 'tareas' ? 'Tareas' : 'Calificaciones'}</Text>
          </Pressable>)}
        </View>
        {section === 'tareas' && <>
          <Text accessibilityRole="header" style={typography.title}>Tareas del aula</Text>
          <QueryFeedback {...tareas} notFound="Las tareas de esta aula ya no están disponibles." />
          {tareas.data?.length === 0 && <Card><Text style={typography.body}>Aún no hay tareas publicadas en esta aula.</Text></Card>}
          {tareas.data?.map(tarea => <Card key={tarea.id}>
            <Badge title={deliveryLabel(tarea.entrega?.estado ?? null)} tone={tarea.entrega ? 'neutral' : 'warning'} />
            <Text style={typography.title}>{tarea.titulo}</Text>
            <Text style={typography.body}>Fecha límite: {academicDate(tarea.fechaLimite)}</Text>
            {tarea.entrega?.nota != null && <Text style={typography.body}>Nota: {tarea.entrega.nota}</Text>}
            <Button title={`Ver tarea: ${tarea.titulo}`} secondary onPress={() => router.push({ pathname: '/tarea', params: { aulaId: id, tareaId: tarea.id } })} />
          </Card>)}
          <Text style={s.caption}>Las horas de los plazos se muestran en hora de Lima.</Text>
        </>}
        {section === 'notas' && <>
          <Text accessibilityRole="header" style={typography.title}>Mis calificaciones</Text>
          <QueryFeedback {...notas} notFound="Las calificaciones de esta aula ya no están disponibles." />
          {notas.data && <>
            <Card>
              <Label>PROMEDIO REGISTRADO</Label>
              <Text style={s.average}>{notas.data.promedio ?? 'Sin calificaciones'}</Text>
              <Text style={typography.body}>{notas.data.tareasEntregadas} de {notas.data.tareasTotal} tareas entregadas</Text>
            </Card>
            {notas.data.detalle.length === 0 && <Text style={typography.body}>Aún no hay tareas para calificar en esta aula.</Text>}
            {notas.data.detalle.map(nota => <Card key={nota.tareaId}>
              <Text style={typography.title}>{nota.tareaTitulo}</Text>
              <Badge title={deliveryLabel(nota.estado)} tone="neutral" />
              <Text style={typography.body}>Nota: {nota.nota ?? 'Sin calificar'}</Text>
              {!!nota.retroalimentacion && <Text style={typography.body}>Observaciones: {nota.retroalimentacion}</Text>}
              <Button title={`Ver tarea: ${nota.tareaTitulo}`} secondary onPress={() => router.push({ pathname: '/tarea', params: { aulaId: id, tareaId: nota.tareaId } })} />
            </Card>)}
          </>}
        </>}
        <Button title="Mensajes con el docente" secondary onPress={() => router.push({ pathname: '/mensajes', params: { aulaId: id } })} />
        <Button title="Anuncios del aula" secondary onPress={() => router.push({ pathname: '/comunidad', params: { aulaId: id, seccion: 'anuncios' } })} />
        <Button title="Foros del aula" secondary onPress={() => router.push({ pathname: '/comunidad', params: { aulaId: id, seccion: 'foros' } })} />
        <Button title="Consultar mis metas" secondary onPress={() => router.push('/metas')} />
        <Button title="Actualizar aula" secondary onPress={aula.retry} />
      </>}
    </Screen>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 10 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.primary, fontSize: 14, fontWeight: '600' }, selectedText: { color: colors.white },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary },
  average: { fontSize: 29, fontFamily: serif, color: colors.text },
  caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
});
