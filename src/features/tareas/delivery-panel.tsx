import { useCallback } from 'react';
import { Text } from 'react-native';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { QueryFeedback } from '@/components/query-feedback';
import { typography } from '@/components/ui';
import { getTaskCapabilities } from '@/services/tareas';
import type { Tarea } from '@/services/aulas';
import { DeliveryComposer } from './delivery-composer';
export function DeliveryPanel({ task, onBusy, onSaved }: { task: Tarea; onBusy: (v: boolean) => void; onSaved: () => void }) {
  const query = useStudentQuery('written-delivery-capabilities', useCallback(getTaskCapabilities, []), true);
  return <><QueryFeedback {...query} notFound="Este servidor todavía no ofrece la entrega escrita de tareas." />{query.data && <DeliveryComposer task={task} onBusy={onBusy} onSaved={onSaved} />}</>;
}
