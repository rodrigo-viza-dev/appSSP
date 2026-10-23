import { ApiError, request, type Session } from './api';

export type NoticeTarget = { tipo: 'TAREA'; aulaId: string; tareaId: string } | { tipo: 'ACTIVIDAD'; practicaId: string; registroId: string };
export type Notificacion = { id: string; userId: string; tipo: string; titulo: string; mensaje: string; leida: boolean; fecha: string; destino?: NoticeTarget | null };
export type NoticeFilter = 'todos' | 'pendientes' | 'leidos';
export type NoticePage = { items: Notificacion[]; total: number; sinLeer: number; siguiente: string | null };

function validTarget(value: unknown): value is NoticeTarget | null | undefined {
  if (value == null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const keys = data.tipo === 'TAREA' ? ['aulaId', 'tareaId'] : data.tipo === 'ACTIVIDAD' ? ['practicaId', 'registroId'] : null;
  return !!keys && Object.keys(data).length === 3 && keys.every(key => typeof data[key] === 'string' && !!data[key].trim() && data[key].length <= 200);
}

function isNotificacion(value: unknown, session: Session): value is Notificacion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.id === 'string' && !!data.id.trim() && data.userId === session.user.id &&
    ['tipo', 'titulo', 'mensaje', 'fecha'].every(key => typeof data[key] === 'string') && typeof data.leida === 'boolean' && validTarget(data.destino);
}
export async function getNotificaciones(session: Session, signal: AbortSignal): Promise<Notificacion[]> {
  const data = await request<unknown>('/notificaciones', session.token, undefined, signal);
  if (!Array.isArray(data) || !data.every(item => isNotificacion(item, session)) || new Set(data.map(item => item.id)).size !== data.length) {
    throw new ApiError(502, 'No pudimos interpretar tus avisos. Intenta actualizar la bandeja.');
  }
  return data;
}
export async function getNoticePage(session: Session, signal: AbortSignal, filter: NoticeFilter = 'todos', cursor: string | null = null): Promise<NoticePage> {
  const params = new URLSearchParams({ estado: filter, limite: '20' });
  if (cursor) params.set('cursor', cursor);
  const data = await request<unknown>(`/notificaciones/bandeja?${params}`, session.token, undefined, signal);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError(502, 'Actualiza el servidor para consultar la bandeja de avisos.');
  const page = data as Record<string, unknown>;
  if (!Array.isArray(page.items) || page.items.length > 20 || !page.items.every(item => isNotificacion(item, session) && (filter === 'todos' || item.leida === (filter === 'leidos'))) || new Set(page.items.map(item => item.id)).size !== page.items.length || !Number.isSafeInteger(page.total) || Number(page.total) < page.items.length || !Number.isSafeInteger(page.sinLeer) || Number(page.sinLeer) < 0 || page.siguiente !== null && (typeof page.siguiente !== 'string' || !page.siguiente.trim())) throw new ApiError(502, 'No pudimos interpretar tus avisos. Actualiza la bandeja.');
  return page as NoticePage;
}
export async function getNotice(session: Session, id: string, signal: AbortSignal): Promise<Notificacion> {
  const data = await request<unknown>(`/notificaciones/${encodeURIComponent(id)}`, session.token, undefined, signal);
  if (!isNotificacion(data, session) || data.id !== id) throw new ApiError(502, 'No pudimos interpretar este aviso.');
  return data;
}
export async function markNotificacionRead(session: Session, notificacion: Notificacion, signal: AbortSignal): Promise<void> {
  if (!isNotificacion(notificacion, session)) throw new ApiError(403, 'No tienes permiso para modificar este aviso.');
  await request<void>(`/notificaciones/${encodeURIComponent(notificacion.id)}/read`, session.token, undefined, signal, { method: 'PUT', expectedStatus: 204 });
}
export async function markAllNotificacionesRead(session: Session, signal: AbortSignal): Promise<void> {
  await request<void>('/notificaciones/read-all', session.token, undefined, signal, { method: 'PUT', expectedStatus: 204 });
}
