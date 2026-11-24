import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { FilterChip, PageFooter } from '@/features/alumno/paged-components';
import { getReportePage, type FilaReporte, type ReportePage } from '@/services/administracion';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

type ReportFilter = 'TODAS' | 'ACTIVA' | 'CONCLUIDA';
const reportFilters: { value: ReportFilter; label: string }[] = [{ value: 'TODAS', label: 'Todas las aulas' }, { value: 'ACTIVA', label: 'Solo activas' }, { value: 'CONCLUIDA', label: 'Solo concluidas' }];

export default function ReportsScreen() { return <StudentLegacyRoute route="/reportes"><ReportsScreenContent /></StudentLegacyRoute>; }
function ReportsScreenContent() {
  const router = useRouter(), { session } = useAuth();
  const [filter, setFilter] = useState<ReportFilter>('TODAS');
  const search = useSearch();
  const query = usePagedQuery<FilaReporte, ReportePage>(`reporte:${filter}:${search.query}`, useCallback((s, signal, cursor) => getReportePage(s, filter, search.query, signal, cursor), [filter, search.query]), session?.user.role === 'ADMIN');
  const resumen = query.data?.resumen;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Reporte institucional" subtitle="Resumen del programa y aulas" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="El reporte no está disponible." />
      {resumen && <>
        <Card><Text style={typography.title}>Comunidad académica</Text><Text style={typography.body}>{resumen.totalAlumnos} alumnos · {resumen.totalProfesores} docentes</Text><Text style={typography.body}>{resumen.totalAulas} aulas · {resumen.aulasActivas} activas</Text></Card>
        <Card><Text style={typography.title}>Prácticas y horas validadas</Text><Text style={typography.body}>{resumen.practicasEnCurso} en curso · {resumen.practicasCerradas} cerradas</Text><Text style={typography.title}>{resumen.horasPromedio === null ? 'Sin prácticas para calcular el promedio' : `${resumen.horasPromedio} h validadas en promedio por práctica`}</Text><Text style={typography.body}>Las horas pendientes y rechazadas no se incluyen.</Text></Card>
        <Text style={typography.body}>Los resúmenes cuentan todo el programa; la lista de aulas se consulta por páginas con búsqueda y filtros.</Text>
        <Field label="Buscar aula en el reporte" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Aula, periodo o docente" />
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{reportFilters.map(f => <FilterChip key={f.value} title={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />)}</View>
        {query.data?.items.map(a => <Card key={a.aulaId}><Text style={typography.title}>{a.aulaNombre}</Text><Text style={typography.body}>{a.periodo} · {a.profesorNombre}</Text><Badge title={a.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" /><Text style={typography.body}>{a.inscritos} estudiantes matriculados</Text><Text style={typography.body}>Promedio de notas: {a.promedioNotas === null ? 'Sin calificaciones' : `${a.promedioNotas} / 20`}</Text><Text style={typography.body}>Asistencia académica registrada: {a.asistenciaPct === null ? 'Sin registros' : `${a.asistenciaPct}%`}</Text><Button title={`Gestionar desde reporte: ${a.aulaNombre}`} secondary onPress={() => router.push({ pathname: '/administrar-aula', params: { aulaId: a.aulaId } })} /></Card>)}
        {query.data && query.data.items.length === 0 && !query.loading && <Text style={typography.body}>No hay aulas que coincidan con esta consulta.</Text>}
        <PageFooter query={query} noun="aulas" disabled={search.waiting} />
      </>}
      <Button title="Actualizar reporte institucional" secondary disabled={query.loading} onPress={query.retry} />
    </Screen>
  </View>;
}
