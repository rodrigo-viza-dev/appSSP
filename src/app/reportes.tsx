import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getReporte } from '@/services/administracion';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export default function ReportsScreen() { return <StudentLegacyRoute route="/reportes"><ReportsScreenContent /></StudentLegacyRoute>; }
function ReportsScreenContent() {
  const router = useRouter(), { session } = useAuth();
  const query = useSessionQuery('reporte-institucional', useCallback(getReporte, []), session?.user.role === 'ADMIN');
  const [search, setSearch] = useState(''), [activeOnly, setActiveOnly] = useState(false);
  const data = query.data;
  const rows = data?.aulas.filter(a => (!activeOnly || a.estado === 'ACTIVA') && `${a.aulaNombre} ${a.periodo} ${a.profesorNombre}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Reporte institucional" subtitle="Resumen del programa y aulas" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen><QueryFeedback {...query} notFound="El reporte no está disponible." />
      {data && <>
        <Card><Text style={typography.title}>Comunidad académica</Text><Text style={typography.body}>{data.totalAlumnos} alumnos · {data.totalProfesores} docentes</Text><Text style={typography.body}>{data.totalAulas} aulas · {data.aulasActivas} activas</Text></Card>
        <Card><Text style={typography.title}>Prácticas y horas validadas</Text><Text style={typography.body}>{data.practicasEnCurso} en curso · {data.practicasCerradas} cerradas</Text><Text style={typography.title}>{data.horasPromedio === null ? 'Sin prácticas para calcular el promedio' : `${data.horasPromedio} h validadas en promedio por práctica`}</Text><Text style={typography.body}>Las horas pendientes y rechazadas no se incluyen.</Text></Card>
        <Field label="Buscar aula en el reporte" value={search} onChangeText={setSearch} placeholder="Aula, periodo o docente" />
        <Button title={activeOnly ? 'Incluir aulas concluidas' : 'Mostrar solo aulas activas'} secondary onPress={() => setActiveOnly(v => !v)} />
        <Text style={typography.body}>{rows?.length ?? 0} aulas en la consulta</Text>
        {rows?.map(a => <Card key={a.aulaId}><Text style={typography.title}>{a.aulaNombre}</Text><Text style={typography.body}>{a.periodo} · {a.profesorNombre}</Text><Badge title={a.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" /><Text style={typography.body}>{a.inscritos} estudiantes matriculados</Text><Text style={typography.body}>Promedio de notas: {a.promedioNotas === null ? 'Sin calificaciones' : `${a.promedioNotas} / 20`}</Text><Text style={typography.body}>Asistencia académica registrada: {a.asistenciaPct === null ? 'Sin registros' : `${a.asistenciaPct}%`}</Text><Button title={`Gestionar desde reporte: ${a.aulaNombre}`} secondary onPress={() => router.push({ pathname: '/administrar-aula', params: { aulaId: a.aulaId } })} /></Card>)}
        {rows?.length === 0 && <Text style={typography.body}>No hay aulas que coincidan con esta consulta.</Text>}
      </>}
      <Button title="Actualizar reporte institucional" secondary disabled={query.loading} onPress={query.retry} />
    </Screen>
  </View>;
}
