import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getPracticasExpedientes } from '@/services/expedientes';
import { colors } from '@/theme';

function ExpedientesScreenContent() {
  const router = useAppRouter(), params = useLocalSearchParams<{ aulaId?: string; alumnoId?: string }>();
  const query = useSessionQuery('practicas-expedientes', useCallback(getPracticasExpedientes, []), true);
  const rows = query.data?.filter(p => (!params.aulaId || p.aulaId === params.aulaId) && (!params.alumnoId || p.practicanteId === params.alumnoId));
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Expedientes de prácticas" subtitle="Evaluación, requisitos y cierre" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <Text style={typography.body}>Consulta el avance de cada práctica, su evaluación del supervisor y los requisitos pendientes para el cierre.</Text>
      <QueryFeedback {...query} notFound="El servidor aún no tiene disponible el expediente actualizado." />
      {rows?.length === 0 && <Card><Text style={typography.body}>No hay prácticas disponibles para esta cuenta o selección. La coordinación debe asignar la práctica y vincular el centro y supervisor.</Text></Card>}
      {rows?.map(p => <Card key={p.id}>
        <Text style={typography.title}>{p.practicanteNombre}</Text><Text style={typography.body}>{p.aulaNombre} · {p.periodo}</Text>
        <Badge title={p.estado === 'CERRADA' ? 'Práctica cerrada' : 'Práctica en curso'} tone={p.estado === 'CERRADA' ? 'success' : 'neutral'} />
        <Text style={typography.body}>{p.horasAcumuladas} / {p.horasMinimas} h validadas</Text>
        <Button title={`Abrir expediente: ${p.practicanteNombre}`} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: p.id } })} />
      </Card>)}
      <Button title="Actualizar expedientes" secondary disabled={query.loading} onPress={query.retry} />
    </Screen>
  </View>;
}

export default function ExpedientesScreen(){return <StudentLegacyRoute route="/expedientes"><ExpedientesScreenContent /></StudentLegacyRoute>;}
