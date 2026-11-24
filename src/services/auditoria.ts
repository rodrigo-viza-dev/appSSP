import { ApiError, request, type Session } from './api';
import { validAttendanceDate } from './asistencia';
import { page, type Page } from './module-pages';
export type EstudianteAudit = { id: string; nombre: string };
export type AuditEntry = { id: string; userNombre: string; accion: string; detalle: string; fecha: string; aulaNombre: string | null; estudiantes: EstudianteAudit[] };
export type AuditFilter = 'TODAS' | 'ASISTENCIA' | 'HORAS' | 'ADMIN';
export type AuditPage = Page<AuditEntry>;
export type AttendanceAudit = { aulaId: string; fecha: string; antes: { practicanteId: string; presente: boolean }[]; despues: { practicanteId: string; presente: boolean }[]; conserved: number };
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
  return ({ HORAS_REGISTRO: 'Registro de horas', HORAS_RECHAZO: 'Rechazo de horas', HORAS_CORRECCION: 'Corrección de horas', HORAS_VALIDACION: 'Validación de horas', ASISTENCIA_ACADEMICA: 'Cambio de asistencia', MATRICULA: 'Matrícula de estudiante', RETIRO_MATRICULA: 'Retiro de matrícula', ESTADO_AULA: 'Cambio de estado del aula', ASIGNAR_PROFESOR: 'Asignación de docente', CAMBIO_ROL: 'Cambio de rol' } as Record<string, string>)[action] ?? action.replaceAll('_', ' ');
}
function estudiante(v: unknown): EstudianteAudit {
  if (!object(v) || !nonempty(v.id) || !text(v.nombre)) throw new ApiError(502, 'El registro de auditoría no es compatible. Actualiza la consulta.');
  return { id: v.id, nombre: v.nombre };
}
function entry(v: unknown): AuditEntry {
  if (!object(v) || !nonempty(v.id) || !nonempty(v.userNombre) || !nonempty(v.accion) || !text(v.detalle) || !text(v.fecha) || !Number.isFinite(Date.parse(v.fecha)) || !(v.aulaNombre === null || nonempty(v.aulaNombre)) || !Array.isArray(v.estudiantes)) throw new ApiError(502, 'El registro de auditoría no es compatible. Actualiza la consulta.');
  return { id: v.id, userNombre: v.userNombre, accion: v.accion, detalle: v.detalle, fecha: v.fecha, aulaNombre: v.aulaNombre as string | null, estudiantes: v.estudiantes.map(estudiante) };
}
export async function getAuditPage(session: Session, categoria: AuditFilter, q: string, signal: AbortSignal, cursor?: string | null): Promise<AuditPage> {
  if (session.user.role !== 'ADMIN') throw new ApiError(403, 'La auditoría está disponible para Administración.');
  const query = new URLSearchParams({ limite: '20', categoria, q: q.trim(), ...(cursor ? { cursor } : {}) });
  return page(await request<unknown>(`/admin/auditoria/pagina?${query}`, session.token, undefined, signal), entry);
}
