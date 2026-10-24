import { ApiError, request, type Session } from './api';
import { page, type Page } from './module-pages';
import type { AulaDocente, EntregaDocente, PracticanteDocente } from './docencia';
import type { PracticaExpediente } from './expedientes';

export type ClassroomSummary = Omit<AulaDocente, 'descripcion'>;
export type DeliverySummary = Pick<EntregaDocente, 'id' | 'tareaId' | 'tareaTitulo' | 'alumnoId' | 'alumnoNombre' | 'createdAt' | 'nota' | 'estado'>;
export type StudentSummary = PracticanteDocente & { id: string };
export type GradeSummary = { id: string; alumnoId: string; alumnoNombre: string; aulaId: string; promedio: number | null; asistenciaPct: number | null; horasValidadas: number };
export type GradePage = Page<GradeSummary> & { promedioGeneral: number | null };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const range = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const grade = (v: unknown) => v === null || range(v, 20);
function invalid(): never { throw new ApiError(502, 'Los datos de seguimiento no son compatibles. Actualiza la consulta.'); }
function personal(s: Session, supervisor = false) {
  if (!(supervisor ? ['PROFESOR', 'ADMIN', 'SUPERVISOR'] : ['PROFESOR', 'ADMIN']).includes(s.user.role)) throw new ApiError(403, 'Esta sección no corresponde a tu cuenta.');
}
const query = (cursor: string | null | undefined, q: string, extra: Record<string, string> = {}) => new URLSearchParams({ limite: '20', q: q.trim(), ...extra, ...(cursor ? { cursor } : {}) }).toString();
const path = (id: string) => { if (!id.trim()) throw new ApiError(400, 'Abre el aula desde la lista.'); return '/equipo/aulas/' + encodeURIComponent(id); };
export function parseClassroom(v: unknown, s: Session): ClassroomSummary {
  if (!object(v) || !['id', 'nombre', 'codigo', 'periodo', 'profesorId', 'profesorNombre'].every(k => text(v[k])) || !v.id || !['ACTIVA', 'CONCLUIDA'].includes(String(v.estado)) || !count(v.inscritos) || s.user.role === 'PROFESOR' && v.profesorId !== s.user.id) invalid();
  return v as ClassroomSummary;
}
export async function getClassroomPage(s: Session, q: string, signal: AbortSignal, cursor?: string | null) {
  personal(s);
  return page(await request(`/equipo/aulas/pagina?${query(cursor, q)}`, s.token, undefined, signal), v => parseClassroom(v, s));
}
export async function getStudentPage(s: Session, id: string, q: string, signal: AbortSignal, cursor?: string | null) {
  personal(s);
  return page(await request(`${path(id)}/alumnos/pagina?${query(cursor, q)}`, s.token, undefined, signal), v => {
    if (!object(v) || v.aulaId !== id || !['id', 'alumnoId', 'alumnoNombre', 'alumnoEmail', 'aulaNombre', 'estado'].every(k => text(v[k])) || !v.id || !range(v.progreso, 100) || !['semanaActual', 'semanasTotales', 'tareasEntregadas', 'tareasTotal'].every(k => count(v[k]))) invalid();
    return v as StudentSummary;
  });
}
export async function getDeliveryPage(s: Session, id: string, pendientes: boolean, q: string, signal: AbortSignal, cursor?: string | null) {
  personal(s);
  return page(await request(`${path(id)}/entregas/pagina?${query(cursor, q, { pendientes: String(pendientes) })}`, s.token, undefined, signal), v => {
    if (!object(v) || !['id', 'tareaId', 'tareaTitulo', 'alumnoId', 'alumnoNombre', 'createdAt', 'estado'].every(k => text(v[k])) || !v.id || !Number.isFinite(Date.parse(String(v.createdAt))) || !grade(v.nota) || pendientes && v.nota !== null) invalid();
    return v as DeliverySummary;
  });
}
export async function getGradePage(s: Session, id: string, q: string, signal: AbortSignal, cursor?: string | null): Promise<GradePage> {
  personal(s);
  const raw = await request<unknown>(`${path(id)}/notas/pagina?${query(cursor, q)}`, s.token, undefined, signal);
  const result = page(raw, v => {
    if (!object(v) || !text(v.id) || !v.id || !text(v.alumnoId) || !text(v.alumnoNombre) || v.aulaId !== id || !grade(v.promedio) || !(v.asistenciaPct === null || range(v.asistenciaPct, 100)) || !count(v.horasValidadas)) invalid();
    return v as GradeSummary;
  });
  if (!object(raw) || !grade(raw.promedioGeneral)) invalid();
  return { ...result, promedioGeneral: raw.promedioGeneral as number | null };
}
export async function getPracticePage(s: Session, estado: string, q: string, signal: AbortSignal, cursor?: string | null) {
  personal(s, true);
  return page(await request(`/equipo/practicas/pagina?${query(cursor, q, { estado })}`, s.token, undefined, signal), v => {
    if (!object(v) || !['id', 'practicanteId', 'practicanteNombre', 'aulaId', 'aulaNombre', 'periodo'].every(k => text(v[k])) || !v.id || !['EN_CURSO', 'LISTA_PARA_CIERRE', 'CERRADA'].includes(String(v.estado)) || !count(v.horasAcumuladas) || !count(v.horasMinimas) || estado === 'ABIERTAS' && v.estado === 'CERRADA' || estado === 'CERRADAS' && v.estado !== 'CERRADA') invalid();
    return v as PracticaExpediente;
  });
}
