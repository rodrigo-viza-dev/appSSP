import { ApiError, request, type Session } from './api';
import { page, type Page } from './module-pages';

export type CentroAula = { id: string; nombre: string; periodo: string };
export type CentroPagina = { id: string; nombre: string; alumnoId: string; alumnoNombre: string; alumnoEmail: string; contacto: string; supervisorId: string | null; supervisorEmail: string | null; aulas: CentroAula[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
function invalid(): never { throw new ApiError(502, 'Los centros del servidor no son compatibles. Actualiza la consulta.'); }
function admin(s: Session) { if (s.user.role !== 'ADMIN') throw new ApiError(403, 'Sección exclusiva de administración.'); }
function centro(v: unknown): CentroPagina {
  if (!object(v) || !text(v.id) || !text(v.nombre) || !text(v.alumnoId) || !text(v.alumnoNombre) || !text(v.alumnoEmail) || !text(v.contacto)
    || !(v.supervisorId === null || text(v.supervisorId)) || !(v.supervisorEmail === null || text(v.supervisorEmail)) || (v.supervisorId === null) !== (v.supervisorEmail === null)
    || !Array.isArray(v.aulas) || v.aulas.length > 20 || !v.aulas.every(a => object(a) && text(a.id) && text(a.nombre) && text(a.periodo))) invalid();
  return v as CentroPagina;
}
/** Centros registrados por páginas (alfabético), con alumno, cuenta de supervisión y aulas activas del alumno. */
export async function getCentroPage(s: Session, q: string, signal: AbortSignal, cursor?: string | null): Promise<Page<CentroPagina>> {
  admin(s);
  const params = new URLSearchParams({ limite: '20', q: q.trim(), ...(cursor ? { cursor } : {}) });
  return page(await request<unknown>(`/admin/centros/pagina?${params}`, s.token, undefined, signal), centro);
}
export function guardarAsignacion(s: Session, centro: CentroPagina, v: Record<string, string>, key: string, signal: AbortSignal) {
  admin(s);
  if (!centro.aulas.some(a => a.id === v.aulaId) || !/^\d+$/.test(v.horasMinimas) || Number(v.horasMinimas) < 1 || Number(v.horasMinimas) > 5000 || v.motivo.trim().length < 5) throw new ApiError(400, 'Selecciona el aula; indica las horas requeridas (1 a 5000) y su fundamento académico.');
  return request('/admin/practicas', s.token, { alumnoId: centro.alumnoId, empresaId: centro.id, aulaId: v.aulaId, horasMinimas: Number(v.horasMinimas), motivo: v.motivo.trim(), solicitudId: key }, signal, { expectedStatus: 201 });
}
export function vincularSupervisor(s: Session, centro: CentroPagina, userId: string | null, motivo: string, signal: AbortSignal) {
  admin(s);
  if (motivo.trim().length < 5 || userId === centro.supervisorId) throw new ApiError(400, 'Selecciona un vínculo distinto y explica el motivo.');
  return request(`/admin/centros/${encodeURIComponent(centro.id)}/supervisor`, s.token, { userId, anterior: centro.supervisorId, motivo: motivo.trim() }, signal, { method: 'PUT' });
}
export function crearSupervisor(s: Session, v: Record<string, string>, key: string, signal: AbortSignal) {
  admin(s);
  return request('/admin/supervisores', s.token, { nombres: v.nombres.trim(), apellidos: v.apellidos.trim(), email: v.email.trim(), password: v.password, solicitudId: key }, signal, { expectedStatus: 201 });
}
