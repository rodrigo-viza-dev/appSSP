import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StudentLegacyRoute, useAppRouter as useRouter } from '@/features/alumno/navigation';
import { Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { Badge, Card, Header, Label, typography } from '@/components/ui';
import { useDocenteQuery } from '@/features/shared/use-docente-query';
import { GradeForm } from '@/features/docencia/grade-form';
import { deliveryLabel } from '@/features/aulas/presentation';
import type { Session } from '@/services/api';
import { getEntregaDocente } from '@/services/docencia';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';
import { Attachment } from '@/components/attachment';
import { DeliveryHistory } from '@/features/tareas/delivery-history';

export default function RevisarEntregaScreen() { return <StudentLegacyRoute route="/revisar-entrega"><RevisarEntregaScreenContent /></StudentLegacyRoute>; }
function RevisarEntregaScreenContent() {
  const params = useLocalSearchParams<{ aulaId?: string; entregaId?: string }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '';
  const entregaId = typeof params.entregaId === 'string' ? params.entregaId : '';
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const query = useDocenteQuery(`revisar:${aulaId}:${entregaId}`, useCallback((s: Session, signal: AbortSignal) => getEntregaDocente(s, aulaId, entregaId, signal), [aulaId, entregaId]), !!aulaId.trim() && !!entregaId.trim());
  const entrega = query.data;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Revisar entrega" subtitle={entrega?.alumnoNombre ?? 'Evaluación académica'} back={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/aula-docente', params: { id: aulaId } })} />
    <Screen>
      {(!aulaId.trim() || !entregaId.trim()) && <Text accessibilityRole="alert" style={typography.error}>El enlace no es válido. Abre la entrega desde el aula.</Text>}
      <QueryFeedback {...query} notFound="La entrega no está disponible en esta aula." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {entrega && <>
        <Card>
          <Badge title={deliveryLabel(entrega.estado)} tone="neutral" /><Text style={typography.title}>{entrega.tareaTitulo}</Text>
          <Text style={typography.body}>{entrega.alumnoNombre} · {academicDate(entrega.createdAt)}</Text>
          <Label>CONTENIDO DE LA ENTREGA</Label><Text style={typography.body}>{entrega.descripcion || 'Sin descripción'}</Text>
          {!!entrega.comentario && <Text style={typography.body}>Comentario: {entrega.comentario}</Text>}
          {!!entrega.archivoId && <Attachment aulaId={aulaId} id={entrega.archivoId} />}
          <Text style={typography.body}>Nota actual: {entrega.nota ?? 'Sin calificar'}</Text>
          {!!entrega.retroalimentacion && <Text style={typography.body}>Observaciones actuales: {entrega.retroalimentacion}</Text>}
        </Card>
        <DeliveryHistory aulaId={aulaId} taskId={entrega.tareaId} alumnoId={entrega.alumnoId} revision={entrega.revision} />
        <GradeForm key={`${entrega.id}:${entrega.revision}:${entrega.nota}:${entrega.retroalimentacion}`} entrega={entrega} onReview={() => setNotice('')} onSaved={value => { query.setData(value); setNotice('Calificación guardada y confirmada por el servidor.'); }} refresh={() => { setNotice(''); query.retry(); }} />
      </>}
    </Screen>
  </View>;
}
