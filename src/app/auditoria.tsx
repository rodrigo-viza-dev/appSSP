import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { useSearch } from '@/features/shared/use-search';
import { FilterChip, PageFooter } from '@/features/alumno/paged-components';
import { useAuth } from '@/state/auth';
import { attendanceAudit, auditAction, getAuditPage, type AuditEntry, type AuditFilter, type AuditPage } from '@/services/auditoria';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';

const filters: { value: AuditFilter; label: string }[] = [{ value: 'TODAS', label: 'Toda la actividad' }, { value: 'ASISTENCIA', label: 'Asistencia' }, { value: 'HORAS', label: 'Horas' }, { value: 'ADMIN', label: 'Administración' }];

export default function AuditScreen() { return <StudentLegacyRoute route="/auditoria"><AuditScreenContent /></StudentLegacyRoute>; }
function AuditScreenContent() {
  const { session } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<AuditFilter>('TODAS'), [expanded, setExpanded] = useState('');
  const search = useSearch();
  const query = usePagedQuery<AuditEntry, AuditPage>(`admin-audit:${filter}:${search.query}`, useCallback((s, signal, cursor) => getAuditPage(s, filter, search.query, signal, cursor), [filter, search.query]), session?.user.role === 'ADMIN');
  const state = (rows: { practicanteId: string; presente: boolean }[], id: string) => {
    const values = rows.filter(r => r.practicanteId === id).map(r => r.presente ? 'Presente' : 'Ausente');
    return values.length ? values.length === 1 ? values[0] : `Varios registros: ${values.join(', ')}` : 'Sin registro';
  };
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Auditoría de actividad" subtitle="Administración · consulta" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <Text style={typography.body}>Consulta por páginas la actividad administrativa, de horas y de asistencia. Las fechas y horas se muestran en Lima.</Text>
      <QueryFeedback {...query} loading={search.waiting || query.loading && !query.data} notFound="Este servidor todavía no ofrece el registro de auditoría." />
      <Field label="Buscar responsable, acción o detalle" value={search.value} onChangeText={search.setValue} maxLength={120} placeholder="Escribe para buscar" />
      <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{filters.map(f => <FilterChip key={f.value} title={f.label} selected={filter === f.value} onPress={() => { setFilter(f.value); setExpanded(''); }} />)}</View>
      {query.data && <Card><Text style={typography.title}>{query.data.total} registros de auditoría</Text><Text style={typography.body}>El total cuenta toda la actividad de la categoría; la lista avanza por páginas.</Text></Card>}
      {query.data?.items.map(entry => {
        const detail = attendanceAudit(entry);
        const name = (id: string) => entry.estudiantes.find(e => e.id === id)?.nombre ?? 'Estudiante no disponible';
        return <Card key={entry.id}>
          <Badge title={entry.accion === 'ASISTENCIA_ACADEMICA' ? 'Asistencia' : entry.accion.startsWith('HORAS_') ? 'Horas' : 'Administración'} tone="neutral" />
          <Text style={typography.title}>{auditAction(entry.accion)}</Text><Text style={typography.body}>Responsable: {entry.userNombre}</Text>
          <Text style={typography.body}>{academicDate(entry.fecha, 'Fecha no disponible')}</Text>
          {detail ? <>
            <Text style={typography.title}>{entry.aulaNombre ?? 'Aula no disponible'}</Text><Text style={typography.body}>Asistencia del {detail.fecha}</Text>
            <Text style={typography.body}>{detail.despues.filter(r => r.presente).length} presentes · {detail.despues.filter(r => !r.presente).length} ausentes después del cambio</Text>
            {detail.conserved > 0 && <Text style={typography.body}>Se conservaron {detail.conserved} registros históricos fuera del padrón actual.</Text>}
            <Button title={expanded === entry.id ? 'Ocultar cambios' : 'Ver cambios'} secondary onPress={() => setExpanded(v => v === entry.id ? '' : entry.id)} />
            {expanded === entry.id && [...new Set([...detail.antes, ...detail.despues].map(r => r.practicanteId))].map(id => <View key={id} style={{ gap: 4 }}><Text style={typography.title}>{name(id)}</Text><Text style={typography.body}>Antes: {state(detail.antes, id)}</Text><Text style={typography.body}>Después: {state(detail.despues, id)}</Text></View>)}
          </> : <Text style={typography.body}>{entry.accion === 'ASISTENCIA_ACADEMICA' ? 'No se pudo interpretar el detalle de asistencia.' : entry.detalle || 'Sin detalle adicional.'}</Text>}
        </Card>;
      })}
      {query.data && query.data.items.length === 0 && !query.loading && <Text style={typography.body}>{search.query ? 'No hay registros que coincidan con la búsqueda.' : 'No hay actividad en esta categoría.'}</Text>}
      <PageFooter query={query} noun="registros" disabled={search.waiting} />
      <Button title="Actualizar auditoría" secondary disabled={query.loading || search.waiting} onPress={() => { setExpanded(''); query.retry(); }} />
    </Screen>
  </View>;
}
