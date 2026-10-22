import { useCallback } from 'react';
import { Text } from 'react-native';
import { Card, typography } from '@/components/ui';
import { Attachment } from '@/components/attachment';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { QueryFeedback } from '@/components/query-feedback';
import { request } from '@/services/api';
import type { Entrega } from '@/services/aulas';
export function DeliveryHistory({ aulaId, taskId, alumnoId, revision }: { aulaId: string; taskId: string; alumnoId: string; revision?: number }) {
  const query = useSessionQuery(`entrega-history:${taskId}:${alumnoId}:${revision}`, useCallback((s, signal) => request<{ revision: number; contenido: Entrega; motivo: string }[]>(`/aulas/${encodeURIComponent(aulaId)}/tareas/${encodeURIComponent(taskId)}/entregas/${encodeURIComponent(alumnoId)}/historial`, s.token, undefined, signal), [aulaId, taskId, alumnoId]), true);
  return <><QueryFeedback {...query} notFound="Historial no disponible en este servidor." />{query.data && query.data.length > 1 && <><Text style={typography.title}>Historial de entregas</Text>{query.data.map(v => <Card key={v.revision}><Text style={typography.title}>Versión {v.revision + 1}</Text><Text style={typography.body}>{v.motivo}</Text><Text style={typography.body}>{v.contenido.descripcion}</Text>{!!v.contenido.archivoId && <Attachment aulaId={aulaId} id={v.contenido.archivoId} />}</Card>)}</>}</>;
}
