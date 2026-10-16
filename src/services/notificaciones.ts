import { ApiError, request, type Session } from './api';

export type Notificacion = { id: string; userId: string; tipo: string; titulo: string; mensaje: string; leida: boolean; fecha: string };

function isNotificacion(value: unknown, session: Session): value is Notificacion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.id === 'string' && !!data.id.trim() && data.userId === session.user.id &&
    ['tipo', 'titulo', 'mensaje', 'fecha'].every(key => typeof data[key] === 'string') && typeof data.leida === 'boolean';
}
export async function getNotificaciones(session: Session, signal: AbortSignal): Promise<Notificacion[]> {
  const data = await request<unknown>('/notificaciones', session.token, undefined, signal);
  if (!Array.isArray(data) || !data.every(item => isNotificacion(item, session)) || new Set(data.map(item => item.id)).size !== data.length) {
    throw new ApiError(502, 'No pudimos interpretar tus avisos. Intenta actualizar la bandeja.');
  }
  return data;
}
export async function markNotificacionRead(session: Session, notificacion: Notificacion, signal: AbortSignal): Promise<void> {
  if (!isNotificacion(notificacion, session)) throw new ApiError(403, 'No tienes permiso para modificar este aviso.');
  await request<void>(`/notificaciones/${encodeURIComponent(notificacion.id)}/read`, session.token, undefined, signal, { method: 'PUT', expectedStatus: 204 });
}
export async function markAllNotificacionesRead(session: Session, signal: AbortSignal): Promise<void> {
  await request<void>('/notificaciones/read-all', session.token, undefined, signal, { method: 'PUT', expectedStatus: 204 });
}
