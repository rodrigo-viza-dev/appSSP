import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { Badge, Button, Card, Field, Header, Label, typography } from '@/components/ui';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { deliveryLabel } from '@/features/aulas/presentation';
import type { Session } from '@/services/api';
import { getAulaDocente, getEntregasDocente, getLibroDocente, getPracticantesDocente } from '@/services/docencia';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';

export default function AulaDocenteScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const [section, setSection] = useState<'entregas' | 'alumnos' | 'libro'>('entregas');
  const [pendingOnly, setPendingOnly] = useState(true);
  const [search, setSearch] = useState('');
  const aula = useDocenteQuery(`docente:${id}`, useCallback((s: Session, signal: AbortSignal) => getAulaDocente(s, id, signal), [id]), !!id.trim());
  const entregas = useDocenteQuery(`docente-entregas:${id}`, useCallback((s: Session, signal: AbortSignal) => getEntregasDocente(s, id, signal), [id]), !!aula.data && section === 'entregas');
  const alumnos = useDocenteQuery(`docente-alumnos:${id}`, useCallback(getPracticantesDocente, []), !!aula.data && section === 'alumnos');
  const libro = useDocenteQuery(`docente-libro:${id}`, useCallback((s: Session, signal: AbortSignal) => getLibroDocente(s, id, signal), [id]), !!aula.data && section === 'libro');
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    if (focused.current) { entregas.retry(); libro.retry(); }
    focused.current = true;
  }, [entregas.retry, libro.retry]));
  const matches = (value: string) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const deliveries = entregas.data?.filter(v => (!pendingOnly || v.nota === null) && matches(`${v.alumnoNombre} ${v.tareaTitulo}`));
  const students = alumnos.data?.filter(v => v.aulaId === id && matches(`${v.alumnoNombre} ${v.alumnoEmail}`));

  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title={aula.data?.nombre ?? 'Aula docente'} subtitle="Revisión y seguimiento" back={() => router.canGoBack() ? router.back() : router.replace('/docencia')} />
    <Screen>
      {!id.trim() && <Text accessibilityRole="alert" style={typography.error}>El enlace del aula no es válido. Ábrela desde Mis aulas.</Text>}
      <QueryFeedback {...aula} notFound="El aula no está disponible para tu cuenta." />
      {aula.data && <>
        <Text style={typography.body}>{aula.data.codigo} · {aula.data.periodo} · {aula.data.inscritos} inscritos</Text>
        <Button title="Tomar asistencia académica" secondary onPress={() => router.push({ pathname: '/asistencia-docente', params: { aulaId: id } })} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['entregas', 'alumnos', 'libro'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: section === value }} onPress={() => { setSection(value); setSearch(''); }} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: section === value ? colors.primary : colors.white }}><Text style={{ color: section === value ? colors.white : colors.primary, fontWeight: '600' }}>{value === 'entregas' ? 'Entregas' : value === 'alumnos' ? 'Alumnos' : 'Notas'}</Text></Pressable>)}
        </View>
        <Field label={section === 'entregas' ? 'Buscar estudiante o tarea' : 'Buscar estudiante'} value={search} onChangeText={setSearch} placeholder="Escribe para filtrar" />
        {section === 'entregas' && <>
          <Button title={pendingOnly ? 'Mostrar todas las entregas' : 'Mostrar solo sin calificar'} secondary onPress={() => setPendingOnly(v => !v)} />
          <QueryFeedback {...entregas} notFound="Las entregas no están disponibles." />
          {deliveries?.length === 0 && <Card><Text style={typography.body}>{entregas.data?.length === 0 ? 'Todavía no se han recibido entregas en esta aula.' : 'No hay entregas que coincidan con los filtros.'}</Text></Card>}
          {deliveries?.map(v => <Card key={v.id}>
            <Badge title={v.nota === null ? 'Sin calificar' : deliveryLabel(v.estado)} tone={v.nota === null ? 'warning' : 'neutral'} />
            <Text style={typography.title}>{v.tareaTitulo}</Text><Text style={typography.body}>{v.alumnoNombre}</Text>
            <Text style={typography.body}>Entregada: {academicDate(v.createdAt)}</Text><Text style={typography.body}>Nota: {v.nota ?? 'Sin calificar'}</Text>
            <Button title={`Revisar: ${v.alumnoNombre} · ${v.tareaTitulo}`} secondary onPress={() => router.push({ pathname: '/revisar-entrega', params: { aulaId: id, entregaId: v.id } })} />
          </Card>)}
          <Button title="Actualizar entregas" secondary disabled={entregas.loading} onPress={entregas.retry} />
        </>}
        {section === 'alumnos' && <>
          <QueryFeedback {...alumnos} notFound="Los estudiantes no están disponibles." />
          {students?.length === 0 && <Text style={typography.body}>No hay estudiantes que coincidan con esta consulta.</Text>}
          {students?.map(v => <Card key={v.alumnoId}>
            <Text style={typography.title}>{v.alumnoNombre}</Text><Text style={typography.body}>{v.alumnoEmail}</Text>
            <Label>AVANCE ACADÉMICO</Label><Text style={typography.body}>{v.progreso}% · Semana {v.semanaActual} de {v.semanasTotales}</Text>
            <Text style={typography.body}>{v.tareasEntregadas} de {v.tareasTotal} tareas entregadas</Text>
          </Card>)}
          <Button title="Actualizar estudiantes" secondary disabled={alumnos.loading} onPress={alumnos.retry} />
        </>}
        {section === 'libro' && <>
          <QueryFeedback {...libro} notFound="El libro de notas no está disponible." />
          {libro.data && <>
            <Card><Label>PROMEDIO DEL AULA</Label><Text style={typography.title}>{libro.data.promedioGeneral ?? 'Sin calificaciones'}</Text></Card>
            {libro.data.alumnos.length === 0 && <Text style={typography.body}>Aún no hay estudiantes en el libro de notas.</Text>}
            {libro.data.alumnos.filter(v => matches(v.alumnoNombre)).map(v => <Card key={v.alumnoId}>
              <Text style={typography.title}>{v.alumnoNombre}</Text><Text style={typography.body}>Promedio: {v.promedio ?? 'Sin calificaciones'}</Text>
              {libro.data!.tareas.map(t => <Text key={t.id} style={typography.body}>{t.titulo}: {v.notas[t.id] ?? 'Sin calificar'}</Text>)}
              <Text style={typography.body}>Asistencia académica: {v.asistenciaPct === null ? 'Sin registros' : `${v.asistenciaPct}%`}</Text>
              <Text style={typography.body}>{v.horas} h acumuladas según el servidor; pueden incluir horas pendientes.</Text>
            </Card>)}
          </>}
          <Button title="Actualizar notas" secondary disabled={libro.loading} onPress={libro.retry} />
        </>}
      </>}
    </Screen>
  </View>;
}
