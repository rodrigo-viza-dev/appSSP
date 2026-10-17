import { ApiError, request, type Session } from './api';
import { validAttendanceDate } from './asistencia';
export type AuditEntry = { id: string; userNombre: string; accion: string; detalle: string; fecha: string };
export type AttendanceAudit = { aulaId: string; fecha: string; antes: { practicanteId: string; presente: boolean }[]; despues: { practicanteId: string; presente: boolean }[]; conserved: number };
export type AuditData = { entries: AuditEntry[]; aulas: Record<string, string>; users: Record<string, string>; incompleteNames: boolean };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const nonempty = (v: unknown): v is string => text(v) && !!v.trim();
export function attendanceAudit(entry: AuditEntry): AttendanceAudit | null {
  if (entry.accion !== 'ASISTENCIA_ACADEMICA') return null;
  try {
    const v: unknown = JSON.parse(entry.detalle);
    const rows = (r: unknown): r is { practicanteId: string; presente: boolean; registrado?: boolean }[] => Array.isArray(r) && r.every(i => object(i) && nonempty(i.practicanteId) && typeof i.presente === 'boolean');
    if (!object(v) || !nonempty(v.aulaId) || !text(v.fecha) || !validAttendanceDate(v.fecha) || !rows(v.antes) || !rows(v.despues)) return null;
    return { aulaId: v.aulaId, fecha: v.fecha, antes: v.antes.filter(r => r.registrado !== false), despues: v.despues, conserved: Array.isArray(v.conservadosFueraDelPadron) ? v.conservadosFueraDelPadron.length : 0 };
  } catch { return null; }
}
export function auditAction(action: string) {
  return ({ ASISTENCIA_ACADEMICA: 'Cambio de asistencia', MATRICULA: 'Matrícula de estudiante', RETIRO_MATRICULA: 'Retiro de matrícula', ESTADO_AULA: 'Cambio de estado del aula', ASIGNAR_PROFESOR: 'Asignación de docente', CAMBIO_ROL: 'Cambio de rol' } as Record<string, string>)[action] ?? action.replaceAll('_', ' ');
}
function names(value: unknown, users: boolean): Record<string, string> | null {
  if (!Array.isArray(value) || !value.every(v => object(v) && nonempty(v.id) && (users ? text(v.nombres) && text(v.apellidos) : nonempty(v.nombre)))) return null;
  return Object.fromEntries(value.map(v => [v.id, users ? `${v.nombres} ${v.apellidos}`.trim() : v.nombre]));
}
export async function getAuditData(session: Session, signal: AbortSignal): Promise<AuditData> {
  if (session.user.role !== 'ADMIN') throw new ApiError(403, 'La auditoría está disponible para Administración.');
  const [audit, aulasResult, usersResult] = await Promise.allSettled([
    request<unknown>('/admin/auditoria', session.token, undefined, signal),
    request<unknown>('/aulas', session.token, undefined, signal),
    request<unknown>('/admin/usuarios', session.token, undefined, signal),
  ]);
  if (audit.status === 'rejected') throw audit.reason;
  for (const lookup of [aulasResult, usersResult]) if (lookup.status === 'rejected' && lookup.reason instanceof ApiError && lookup.reason.status === 401) throw lookup.reason;
  const data = audit.value;
  if (!Array.isArray(data) || data.length > 200 || !data.every(v => object(v) && nonempty(v.id) && nonempty(v.userNombre) && nonempty(v.accion) && text(v.detalle) && text(v.fecha) && Number.isFinite(Date.parse(v.fecha))) || new Set(data.map(v => v.id)).size !== data.length) throw new ApiError(502, 'El registro de auditoría no es compatible. Actualiza la consulta.');
  const aulas = aulasResult.status === 'fulfilled' ? names(aulasResult.value, false) : null;
  const users = usersResult.status === 'fulfilled' ? names(usersResult.value, true) : null;
  return { entries: data as AuditEntry[], aulas: aulas ?? {}, users: users ?? {}, incompleteNames: !aulas || !users };
}
