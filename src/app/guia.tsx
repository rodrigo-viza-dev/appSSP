import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { guideArticles } from '@/content/guide';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export default function GuideScreen() {
  const router = useRouter(), { session } = useAuth();
  const [search, setSearch] = useState(''), [category, setCategory] = useState('Todas'), [expanded, setExpanded] = useState('');
  if (!session) return null;
  const available = guideArticles.filter(a => a.roles.includes(session.user.role));
  const categories = ['Todas', ...new Set(available.map(a => a.category))];
  const rows = available.filter(a => (category === 'Todas' || a.category === category) && `${a.title} ${a.summary} ${a.steps.join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Guía de prácticas" subtitle="Pasos y ejemplos para tu rol" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <Card><Text style={typography.title}>Del registro al seguimiento</Text><Text style={typography.body}>Consulta cómo usar los módulos de la app y preparar información que pueda revisarse. Los objetivos, plazos y criterios académicos los define tu coordinación o docente.</Text></Card>
      <Field label="Buscar en la guía" value={search} onChangeText={setSearch} placeholder="Actividad, meta, foro, conexión…" />
      <View style={{ gap: 8 }}>{categories.map(c => <Button key={c} title={c} secondary={c !== category} onPress={() => setCategory(c)} />)}</View>
      <Text style={typography.body}>{rows.length} artículos disponibles</Text>
      {rows.map(a => <Card key={a.id}>
        <Badge title={a.category} tone="neutral" /><Text style={typography.title}>{a.title}</Text><Text style={typography.body}>{a.summary}</Text>
        <Button title={`${expanded === a.id ? 'Ocultar' : 'Leer'} guía: ${a.title}`} secondary onPress={() => setExpanded(v => v === a.id ? '' : a.id)} />
        {expanded === a.id && <>{a.steps.map((step, i) => <Text key={i} style={typography.body}>{i + 1}. {step}</Text>)}{a.example && <View style={{ gap: 6 }}><Text style={typography.title}>Ejemplo orientativo</Text><Text style={typography.body}>{a.example}</Text></View>}</>}
      </Card>)}
      {rows.length === 0 && <Text style={typography.body}>No hay artículos para esta consulta. Prueba otra palabra o categoría.</Text>}
    </Screen>
  </View>;
}
