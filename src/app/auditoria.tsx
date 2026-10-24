import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { useAuth } from '@/state/auth';
import { attendanceAudit, auditAction, getAuditData } from '@/services/auditoria';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';
export default function AuditScreen() { return <StudentLegacyRoute route="/auditoria"><AuditScreenContent /></StudentLegacyRoute>; }
function AuditScreenContent() {
  const { session } = useAuth();
  const router = useRouter();
  const query = useSessionQuery('admin-audit', useCallback(getAuditData, []), session?.user.role === 'ADMIN');
  const [filter, setFilter] = useState<'all' | 'attendance' | 'hours' | 'admin'>('all');
  const [search, setSearch] = useState(''), [expanded, setExpanded] = useState('');
  const data = query.data;
  const entries = data?.entries.filter(entry => {
    const attendance = entry.accion === 'ASISTENCIA_ACADEMICA';
    const hours = entry.accion.startsWith('HORAS_');
    if (filter === 'attendance' && !attendance || filter === 'hours' && !hours || filter === 'admin' && (attendance || hours)) return false;
    const detail = attendanceAudit(entry);
    const label = `${entry.userNombre} ${auditAction(entry.accion)} ${detail ? `${detail.fecha} ${data.aulas[detail.aulaId] ?? ''}` : attendance ? '' : entry.detalle}`;
    return label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });
  const state = (rows: { practicanteId: string; presente: boolean }[], id: string) => {
    const values = rows.filter(r => r.practicanteId === id).map(r => r.presente ? 'Presente' : 'Ausente');
    return values.length ? values.length === 1 ? values[0] : `Varios registros: ${values.join(', ')}` : 'Sin registro';
  };
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Auditoría de actividad" subtitle="Administración · consulta" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen><Text style={typography.body}>El servidor devuelve hasta 200 registros recientes. Las fechas y horas se muestran en Lima.</Text>
      <QueryFeedback {...query} notFound="Este servidor todavía no ofrece el registro de auditoría." />
      {data && <>
        {data.incompleteNames && <Text style={typography.body}>No se pudieron actualizar algunos nombres de aulas o estudiantes. Los registros siguen disponibles.</Text>}
        <Field label="Buscar responsable, aula o fecha" value={search} onChangeText={setSearch} placeholder="Escribe para filtrar" />
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{([['all', 'Toda la actividad'], ['attendance', 'Asistencia'], ['hours', 'Horas'], ['admin', 'Administración']] as const).map(([key, title]) => <Button key={key} title={title} secondary={filter !== key} onPress={() => { setFilter(key); setExpanded(''); }} />)}</View>
        <Text accessibilityLiveRegion="polite" style={typography.body}>{entries?.length ?? 0} de {data.entries.length} registros</Text>
        {!entries?.length && <Text style={typography.body}>No hay registros que coincidan con la consulta.</Text>}
        {entries?.map(entry => {
          const detail = attendanceAudit(entry);
          return <Card key={entry.id}>
            <Badge title={entry.accion === 'ASISTENCIA_ACADEMICA' ? 'Asistencia' : entry.accion.startsWith('HORAS_') ? 'Horas' : 'Administración'} tone="neutral" />
            <Text style={typography.title}>{auditAction(entry.accion)}</Text><Text style={typography.body}>Responsable: {entry.userNombre}</Text>
            <Text style={typography.body}>{academicDate(entry.fecha, 'Fecha no disponible')}</Text>
            {detail ? <>
              <Text style={typography.title}>{data.aulas[detail.aulaId] ?? 'Aula no disponible'}</Text><Text style={typography.body}>Asistencia del {detail.fecha}</Text>
              <Text style={typography.body}>{detail.despues.filter(r => r.presente).length} presentes · {detail.despues.filter(r => !r.presente).length} ausentes después del cambio</Text>
              {detail.conserved > 0 && <Text style={typography.body}>Se conservaron {detail.conserved} registros históricos fuera del padrón actual.</Text>}
              <Button title={expanded === entry.id ? 'Ocultar cambios' : 'Ver cambios'} secondary onPress={() => setExpanded(v => v === entry.id ? '' : entry.id)} />
              {expanded === entry.id && [...new Set([...detail.antes, ...detail.despues].map(r => r.practicanteId))].map(id => <View key={id} style={{ gap: 4 }}><Text style={typography.title}>{data.users[id] ?? 'Estudiante no disponible'}</Text><Text style={typography.body}>Antes: {state(detail.antes, id)}</Text><Text style={typography.body}>Después: {state(detail.despues, id)}</Text></View>)}
            </> : <Text style={typography.body}>{entry.accion === 'ASISTENCIA_ACADEMICA' ? 'No se pudo interpretar el detalle de asistencia.' : entry.detalle || 'Sin detalle adicional.'}</Text>}
          </Card>;
        })}
      </>}
      <Button title="Actualizar auditoría" secondary disabled={query.loading} onPress={() => { setExpanded(''); query.retry(); }} />
    </Screen>
  </View>;
}
