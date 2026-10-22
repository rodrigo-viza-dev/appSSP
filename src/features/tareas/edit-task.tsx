import { ContentForm } from '@/features/shared/content-form';
import { ApiError, request } from '@/services/api';
import type { Tarea } from '@/services/aulas';
import { useAuth } from '@/state/auth';
import { validAttendanceDate } from '@/services/asistencia';
export function EditTask({ task, onSaved, refresh, onBusy }: { task: Tarea; onSaved: () => void; refresh: () => void; onBusy: (v: boolean) => void }) {
  const { session } = useAuth();
  const originalDate = task.fechaLimite ? new Date(Date.parse(task.fechaLimite) - 5 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';
  return <ContentForm title="Editar instrucciones o ampliar plazo" initial={{ titulo: task.titulo, descripcion: task.descripcion, fecha: originalDate, motivo: '' }} fields={[
    { key: 'titulo', label: 'Título de la tarea', max: 200 }, { key: 'descripcion', label: 'Instrucciones', multiline: true, max: 6000 },
    { key: 'fecha', label: 'Fecha límite (AAAA-MM-DD; al cambiarla, hasta 23:59 de Lima; vacío sin plazo)', max: 10 }, { key: 'motivo', label: 'Motivo de la edición o ampliación', multiline: true, max: 1000 },
  ]} confirm="Confirmar edición de tarea y plazo" validate={v => {
    if (!v.titulo.trim() || !v.descripcion.trim() || v.motivo.trim().length < 5 || v.fecha && !validAttendanceDate(v.fecha)) throw new ApiError(400, 'Completa título, instrucciones, fecha válida y motivo.');
  }} submit={(v, key, signal) => request(`/profesor/aulas/${encodeURIComponent(task.aulaId)}/tareas/${encodeURIComponent(task.id)}`, session!.token, { titulo: v.titulo.trim(), descripcion: v.descripcion.trim(), fechaLimite: v.fecha === originalDate ? task.fechaLimite : v.fecha ? `${v.fecha}T23:59:59-05:00` : null, motivo: v.motivo.trim(), revision: task.revision ?? 0, solicitudId: key }, signal, { method: 'PUT' })} onSaved={onSaved} refresh={refresh} onBusy={onBusy} />;
}
