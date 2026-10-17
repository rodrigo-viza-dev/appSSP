import { ApiError, request, type Session } from './api';
import { parseTareaResponse, type Tarea } from './aulas';
import { todayLima, validAttendanceDate } from './asistencia';
export type TaskDraft = { titulo: string; descripcion: string; fecha: string; comentario: string; solicitudId: string };
export async function getTaskCapabilities(session: Session, signal: AbortSignal) {
  const value = await request<{ versionTareas: number; entregaTexto: boolean }>('/tareas/capacidades', session.token, undefined, signal);
  if (value?.versionTareas !== 1 || value.entregaTexto !== true) throw new ApiError(502, 'El servidor todavía no ofrece publicación y entrega escrita de tareas.');
  return value;
}
export async function getTeacherTasks(session: Session, aulaId: string, signal: AbortSignal): Promise<Tarea[]> {
  if (!['PROFESOR', 'ADMIN'].includes(session.user.role)) throw new ApiError(403, 'Sección exclusiva de docencia.');
  await getTaskCapabilities(session, signal);
  const values = await request<unknown>(`/profesor/aulas/${encodeURIComponent(aulaId)}/tareas`, session.token, undefined, signal);
  if (!Array.isArray(values)) throw new ApiError(502, 'No se pudo interpretar el listado de tareas.');
  const tasks = values.map(v => parseTareaResponse(v, aulaId));
  if (new Set(tasks.map(v => v.id)).size !== tasks.length) throw new ApiError(502, 'El listado de tareas contiene duplicados.');
  return tasks;
}
export function validateTaskDraft(value: TaskDraft, publishing: boolean) {
  const descripcion = value.descripcion.trim();
  if (!descripcion || descripcion.length > 6000) throw new ApiError(400, publishing ? 'Escribe las instrucciones (hasta 6000 caracteres).' : 'Escribe tu respuesta (hasta 6000 caracteres).');
  if (publishing && (!value.titulo.trim() || value.titulo.trim().length > 200)) throw new ApiError(400, 'Escribe un título de hasta 200 caracteres.');
  if (publishing && value.fecha && (!validAttendanceDate(value.fecha) || value.fecha < todayLima())) throw new ApiError(400, 'Escribe una fecha límite válida desde hoy (AAAA-MM-DD), o déjala vacía.');
  if (value.comentario.trim().length > 2000) throw new ApiError(400, 'El comentario admite hasta 2000 caracteres.');
  return { titulo: value.titulo.trim(), descripcion, fechaLimite: value.fecha ? `${value.fecha}T23:59:59-05:00` : null, solicitudId: value.solicitudId };
}
export function matchesPublished(task: Tarea, value: TaskDraft) {
  const payload = { titulo: value.titulo.trim(), descripcion: value.descripcion.trim(), fechaLimite: value.fecha ? `${value.fecha}T23:59:59-05:00` : null };
  return task.id === `t-${value.solicitudId}` && task.titulo === payload.titulo && task.descripcion === payload.descripcion && (task.fechaLimite === null ? payload.fechaLimite === null : Date.parse(task.fechaLimite) === Date.parse(payload.fechaLimite ?? ''));
}
export async function publishTask(session: Session, aulaId: string, value: TaskDraft, signal: AbortSignal) {
  if (!['PROFESOR', 'ADMIN'].includes(session.user.role)) throw new ApiError(403, 'Solo docencia publica tareas.');
  const payload = validateTaskDraft(value, true);
  const task = parseTareaResponse(await request<unknown>(`/profesor/aulas/${encodeURIComponent(aulaId)}/tareas`, session.token, payload, signal, { method: 'POST', expectedStatus: 201 }), aulaId);
  if (!matchesPublished(task, value)) throw new ApiError(502, 'La tarea confirmada no coincide. Consulta el listado.');
  return task;
}
export async function submitWrittenTask(session: Session, task: Tarea, value: TaskDraft, signal: AbortSignal) {
  if (session.user.role !== 'ALUMNO') throw new ApiError(403, 'Solo el alumno puede enviar su respuesta.');
  validateTaskDraft(value, false);
  const payload = { descripcion: value.descripcion.trim(), comentario: value.comentario.trim() };
  const saved = parseTareaResponse(await request<unknown>(`/alumno/aulas/${encodeURIComponent(task.aulaId)}/tareas/${encodeURIComponent(task.id)}/entregas`, session.token, payload, signal, { method: 'POST', expectedStatus: 201 }), task.aulaId, session.user.id);
  if (saved.id !== task.id || !saved.entrega || saved.entrega.descripcion !== payload.descripcion || saved.entrega.comentario !== payload.comentario || saved.entrega.archivoId !== null) throw new ApiError(502, 'La entrega confirmada no coincide. Consulta la tarea.');
  return saved;
}
