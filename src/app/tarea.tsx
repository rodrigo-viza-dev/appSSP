import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Header, Label, typography } from '@/components/ui';
import type { Session } from '@/services/api';
import { getTarea } from '@/services/aulas';
import { deliveryLabel } from '@/features/aulas/presentation';
import { academicDate } from '@/utils/date';
import { QueryFeedback } from '@/components/query-feedback';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { DeliveryPanel } from '@/features/tareas/delivery-panel';
import { colors } from '@/theme';

export default function TareaScreen() {
  const params = useLocalSearchParams<{ aulaId?: string | string[]; tareaId?: string | string[] }>();
  const aulaId = typeof params.aulaId === 'string' ? params.aulaId : '';
  const tareaId = typeof params.tareaId === 'string' ? params.tareaId : '';
  const validLink = !!aulaId.trim() && !!tareaId.trim();
  const router = useRouter();
  const load = useCallback((session: Session, signal: AbortSignal) => getTarea(session, aulaId, tareaId, signal), [aulaId, tareaId]);
  const query = useStudentQuery(`tarea:${JSON.stringify([aulaId, tareaId])}`, load, validLink);
  const tarea = query.data;
  const [showDelivery, setShowDelivery] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const back = () => router.canGoBack() ? router.back() : aulaId
    ? router.replace({ pathname: '/aula', params: { id: aulaId } }) : router.replace('/panel');

  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Detalle de tarea" subtitle="Tu trabajo académico" back={back} />
    <Screen>
      {!validLink && <><Text accessibilityRole="alert" style={typography.error}>El enlace de la tarea no es válido. Ábrela desde tu aula.</Text><Button title="Ir a mi panel" onPress={() => router.replace('/panel')} /></>}
      <QueryFeedback {...query} notFound="La tarea no está disponible en esta aula." />
      {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
      {tarea && <>
        <Badge title={deliveryLabel(tarea.entrega?.estado ?? null)} tone={tarea.entrega ? 'neutral' : 'warning'} />
        <Text accessibilityRole="header" style={typography.title}>{tarea.titulo}</Text>
        <Text style={typography.body}>{tarea.descripcion || 'El docente no agregó una descripción.'}</Text>
        <Card><Label>FECHA LÍMITE · HORA DE LIMA</Label><Text style={typography.body}>{academicDate(tarea.fechaLimite)}</Text></Card>
        <Text accessibilityRole="header" style={typography.title}>Mi entrega</Text>
        {tarea.entrega ? <>
          <Card>
            <Text style={typography.body}>{tarea.entrega.descripcion || 'Entrega sin descripción.'}</Text>
            {!!tarea.entrega.comentario && <Text style={typography.body}>Tu comentario: {tarea.entrega.comentario}</Text>}
            <Text style={typography.body}>Enviada: {academicDate(tarea.entrega.createdAt, 'Fecha no disponible')}</Text>
            {tarea.entrega.archivoId !== null && <Text style={typography.body}>Archivo adjunto registrado. Su descarga aún no está habilitada en esta app.</Text>}
          </Card>
          <Card>
            <Label>REVISIÓN DOCENTE</Label>
            <Text style={typography.title}>Nota: {tarea.entrega.nota ?? 'Sin calificar'}</Text>
            <Text style={typography.body}>{tarea.entrega.retroalimentacion || 'Aún no hay observaciones del docente.'}</Text>
          </Card>
        </> : <Card><Text style={typography.body}>Todavía no tienes una entrega registrada para esta tarea.</Text></Card>}
        {!tarea.entrega && (showDelivery ? <DeliveryPanel task={tarea} onBusy={setBusy} onSaved={() => { setNotice('Entrega guardada y confirmada por el servidor.'); query.retry(); }} /> : <Button title="Entregar respuesta escrita" onPress={() => setShowDelivery(true)} />)}
        <Button title="Actualizar tarea" secondary disabled={busy} onPress={query.retry} />
      </>}
    </Screen>
  </View>;
}
