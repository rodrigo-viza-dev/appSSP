import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { getAulasDocente } from '@/services/docencia';
import { colors } from '@/theme';

export default function DocenciaScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const load = useCallback(getAulasDocente, []);
  const aulas = useDocenteQuery('aulas-docencia', load);
  const filtered = aulas.data?.filter(v => `${v.nombre} ${v.codigo} ${v.periodo} ${v.profesorNombre}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Mis aulas · Docencia" subtitle="Seguimiento académico" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <QueryFeedback {...aulas} notFound="Las aulas no están disponibles para tu cuenta." />
      {aulas.data && <>
        <Field label="Buscar aula" value={search} onChangeText={setSearch} placeholder="Nombre, código, periodo o docente" />
        <Text style={typography.body}>{aulas.data.length} aulas disponibles para tu cuenta</Text>
        {aulas.data.length === 0 && <Card><Text style={typography.body}>Todavía no tienes aulas asignadas. Consulta con la coordinación.</Text></Card>}
        {!!aulas.data.length && filtered?.length === 0 && <Text style={typography.body}>No hay aulas que coincidan con la búsqueda.</Text>}
        {filtered?.map(aula => <Card key={aula.id}>
          <Badge title={aula.estado === 'ACTIVA' ? 'Activa' : 'Concluida'} tone="neutral" />
          <Text style={typography.title}>{aula.nombre}</Text>
          <Text style={typography.body}>{aula.codigo} · {aula.periodo}</Text>
          <Text style={typography.body}>{aula.profesorNombre} · {aula.inscritos} inscritos</Text>
          <Button title={`Gestionar aula: ${aula.nombre}`} secondary onPress={() => router.push({ pathname: '/aula-docente', params: { id: aula.id } })} />
        </Card>)}
        <Button title="Actualizar aulas" secondary disabled={aulas.loading} onPress={aulas.retry} />
      </>}
    </Screen>
  </View>;
}
