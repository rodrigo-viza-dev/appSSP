import { ApiError, request, type Session } from './api';

export type AsistenciaItem = { practicanteId: string; practicanteNombre: string; presente: boolean };
export type Asistencia = { aulaId: string; fecha: string; items: AsistenciaItem[] };
export function todayLima() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find(v => v.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function validAttendanceDate(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const date = new Date(`${fecha}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === fecha;
}
function path(session: Session, aulaId: string, fecha: string) {
  if (!['PROFESOR', 'ADMIN'].includes(session.user.role)) throw new ApiError(403, 'La asistencia académica está disponible para docencia y administración.');
  if (!aulaId.trim() || !validAttendanceDate(fecha)) throw new ApiError(400, 'Revisa el aula y escribe una fecha válida con formato AAAA-MM-DD.');
  return `/profesor/aulas/${encodeURIComponent(aulaId)}/asistencia`;
}
function parse(data: unknown, aulaId: string, fecha: string): Asistencia {
  const value = data as Partial<Asistencia> | null;
  if (!value || value.aulaId !== aulaId || value.fecha !== fecha || !Array.isArray(value.items) || !value.items.every(v => v && typeof v.practicanteId === 'string' && !!v.practicanteId && typeof v.practicanteNombre === 'string' && typeof v.presente === 'boolean') || new Set(value.items.map(v => v.practicanteId)).size !== value.items.length) throw new ApiError(502, 'La respuesta de asistencia no es compatible. Consulta nuevamente.');
  return value as Asistencia;
}
export async function getAsistencia(session: Session, aulaId: string, fecha: string, signal: AbortSignal) {
  const endpoint = path(session, aulaId, fecha);
  return parse(await request<unknown>(`${endpoint}?fecha=${encodeURIComponent(fecha)}`, session.token, undefined, signal), aulaId, fecha);
}
export async function saveAsistencia(session: Session, base: Asistencia, items: AsistenciaItem[], signal: AbortSignal) {
  const endpoint = path(session, base.aulaId, base.fecha);
  const roster = new Set(base.items.map(v => v.practicanteId));
  if (!items.length || items.length !== roster.size || new Set(items.map(v => v.practicanteId)).size !== roster.size || items.some(v => !roster.has(v.practicanteId) || typeof v.presente !== 'boolean')) throw new ApiError(400, 'La lista cambió. Consulta la asistencia antes de guardarla.');
  const payload = { fecha: base.fecha, items: items.map(({ practicanteId, presente }) => ({ practicanteId, presente })) };
  const saved = parse(await request<unknown>(endpoint, session.token, payload, signal, { method: 'POST', expectedStatus: 200 }), base.aulaId, base.fecha);
  const expected = new Map(items.map(v => [v.practicanteId, v.presente]));
  if (saved.items.length !== items.length || saved.items.some(v => expected.get(v.practicanteId) !== v.presente)) throw new ApiError(502, 'La lista confirmada cambió. Consulta el estado actual antes de guardar otra vez.');
  return saved;
}
