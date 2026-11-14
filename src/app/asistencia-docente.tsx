import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { useStaffData } from '@/features/equipo/data-state';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { AttendanceForm } from '@/features/docencia/attendance-form';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { usePagedQuery } from '@/features/shared/use-paged-query';
import { PageFooter } from '@/features/alumno/paged-components';
import type { Session } from '@/services/api';
import { getAulaDocente } from '@/services/docencia';
import { getAsistencia, getAttendanceHistory, todayLima, validAttendanceDate, type AttendanceDayRow } from '@/services/asistencia';
import { colors } from '@/theme';
import { academicDate } from '@/utils/date';

export default function AsistenciaDocenteScreen() { return <StudentLegacyRoute route="/asistencia-docente"><AsistenciaDocenteScreenContent /></StudentLegacyRoute>; }
function AsistenciaDocenteScreenContent() {
  const params = useLocalSearchParams<{ aulaId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '';
  const router = useRouter(), staff = useStaffData();
  const [fecha, setFecha] = useState(todayLima);
  const [draftFecha, setDraftFecha] = useState(fecha);
  const [dateError, setDateError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const aula = useDocenteQuery(`asistencia-aula:${aulaId}`, useCallback((s: Session, signal: AbortSignal) => getAulaDocente(s, aulaId, signal), [aulaId]), !!aulaId.trim());
  const query = useDocenteQuery(`asistencia:${aulaId}:${fecha}`, useCallback((s: Session, signal: AbortSignal) => getAsistencia(s, aulaId, fecha, signal), [aulaId, fecha]), !!aula.data);
  const history = usePagedQuery<AttendanceDayRow>(`asistencia-historia:${aulaId}`, useCallback((s: Session, signal: AbortSignal, cursor?: string | null) => getAttendanceHistory(s, aulaId, signal, cursor), [aulaId]), !!aula.data);
  const refresh = () => { staff.touch('aula:' + aulaId); setNotice(''); query.retry(); };
  const pick = (row: AttendanceDayRow) => {
    if (saving) return;
    setDateError(''); setNotice('');
    setDraftFecha(row.fecha);
    if (row.fecha === fecha) query.retry(); else setFecha(row.fecha);
  };
  function consult() {
    if (saving) return;
    if (!validAttendanceDate(draftFecha)) { setDateError('Escribe una fecha válida con formato AAAA-MM-DD.'); return; }
    setDateError(''); setNotice('');
    if (fecha === draftFecha) query.retry(); else setFecha(draftFecha);
  }
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Asistencia académica" subtitle={aula.data?.nombre ?? 'Lista del aula'} back={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/aula-docente', params: { id: aulaId } })} />
    <Screen>
      {!aulaId.trim() && <Text accessibilityRole="alert" style={typography.error}>El enlace del aula no es válido.</Text>}
      <QueryFeedback {...aula} notFound="El aula no está disponible para tu cuenta." />
      {aula.data && <>
        <Card><Text style={typography.body}>Esta es la asistencia a las sesiones académicas del aula. No registra jornadas de empresa ni valida horas de prácticas.</Text></Card>
        <Field label="Fecha de asistencia (AAAA-MM-DD)" value={draftFecha} editable={!saving} onChangeText={setDraftFecha} maxLength={10} placeholder="2026-10-16" />
        {!!dateError && <Text accessibilityRole="alert" style={typography.error}>{dateError}</Text>}
        <Button title="Consultar fecha" secondary disabled={saving || query.loading} onPress={consult} />
        <Text style={typography.title}>Lista del {fecha}</Text>
        {query.data && <Card>
          <Badge title={query.data.versionAsistencia !== 1 ? 'Estado de guardado sin confirmar' : query.data.estadoRegistro === 'GUARDADO' ? 'Asistencia guardada' : query.data.estadoRegistro === 'PARCIAL' ? 'Registro por revisar' : 'Propuesta sin guardar'} tone={query.data.estadoRegistro === 'GUARDADO' && query.data.versionAsistencia === 1 ? 'success' : 'warning'} />
          <Text style={typography.body}>{query.data.versionAsistencia !== 1 ? 'Este servidor no distingue valores propuestos de registros guardados. La consulta está disponible; el guardado requiere una actualización.' : query.data.estadoRegistro === 'GUARDADO' ? 'Estos valores provienen de la asistencia guardada para esta fecha.' : query.data.estadoRegistro === 'PARCIAL' ? 'El registro no coincide con el padrón actual. Revisa la lista completa antes de confirmar.' : 'Todavía no hay un registro para esta fecha. Los presentes son una propuesta que debes revisar.'}</Text>
        </Card>}
        {query.data && (fecha > todayLima() || aula.data.estado !== 'ACTIVA') && <Text style={typography.body}>{fecha > todayLima() ? 'No se puede guardar asistencia futura.' : 'El aula está concluida. La asistencia se puede consultar.'}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        <QueryFeedback {...query} notFound="La lista de asistencia no está disponible." />
        {draftFecha !== fecha && <Text style={typography.body}>Consulta la nueva fecha antes de revisar su lista.</Text>}
        {query.data && draftFecha === fecha && (query.data.versionAsistencia === 1 && fecha <= todayLima() && aula.data.estado === 'ACTIVA' ? <AttendanceForm key={`${aulaId}:${fecha}:${query.data.revision}`} data={query.data} onBusy={setSaving} onReview={() => setNotice('')} refresh={refresh} onSaved={saved => { query.setData(saved); history.retry(); staff.touch('aula:' + aulaId); setNotice(`Asistencia del ${saved.fecha} guardada y confirmada por el servidor.`); }} /> : query.data.items.map(item => <Card key={item.practicanteId}><Text style={typography.title}>{item.practicanteNombre}</Text><Text style={typography.body}>{item.presente ? 'Presente' : 'Ausente'}</Text></Card>))}
        <Text style={typography.title}>Días con registro</Text>
        <Text style={typography.body}>El historial muestra las fechas que ya tienen asistencia guardada en este aula. Toca un día para consultarlo o volver a editarlo.</Text>
        <QueryFeedback {...history} loading={history.loading && !history.data} notFound="El historial de asistencia no está disponible." />
        {history.data && (history.data.items.length ? <>
          {history.data.items.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Asistencia del ${row.fecha}: ${row.presentes} presentes de ${row.registrados} registrados`} onPress={() => pick(row)} style={{ minHeight: 64, padding: 18, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={typography.title}>{academicDate(row.fecha)}</Text>
              <Text style={typography.body}>{row.presentes} presentes de {row.registrados} registrados</Text>
            </View>
            <Text style={{ fontSize: 25, color: colors.primary }}>›</Text>
          </Pressable>)}
        </> : <Text style={typography.body}>Todavía no hay días con registro guardado en este aula.</Text>)}
        <PageFooter query={history} noun="días con registro" />
        <Button title="Actualizar historial" secondary disabled={history.loading} onPress={history.retry} />
      </>}
    </Screen>
  </View>;
}
