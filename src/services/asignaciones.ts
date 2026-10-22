import { ApiError, request, type Session } from './api';
import { getAdminData } from './administracion';
export type CentroAsignacion = { id: string; alumnoId: string; nombre: string; supervisorId: string | null; contacto: string };
export type PracticaAsignacion = { id: string; practicanteId: string; practicanteNombre: string; aulaNombre: string; periodo: string; horasMinimas: number; estado: string };
export async function getAsignaciones(s: Session, signal: AbortSignal) {
  if (s.user.role !== 'ADMIN') throw new ApiError(403, 'Sección exclusiva de administración.');
  const [admin, data] = await Promise.all([getAdminData(s, signal), request<{ versionAsignaciones: number; centros: CentroAsignacion[]; practicas: PracticaAsignacion[] }>('/admin/asignaciones', s.token, undefined, signal)]);
  if (data.versionAsignaciones !== 1 || !Array.isArray(data.centros) || !Array.isArray(data.practicas)) throw new ApiError(502, 'Actualiza el servidor para gestionar asignaciones.');
  return { ...admin, ...data };
}
export function guardarAsignacion(s: Session, v: Record<string, string>, centros: CentroAsignacion[], key: string, signal: AbortSignal) {
  const centro = centros.find(c => c.id === v.empresaId);
  if (!centro || !/^\d+$/.test(v.horasMinimas) || Number(v.horasMinimas) < 1 || Number(v.horasMinimas) > 5000 || v.motivo.trim().length < 5) throw new ApiError(400, 'Selecciona el centro y el aula; indica las horas requeridas y su fundamento académico.');
  return request('/admin/practicas', s.token, { alumnoId: centro.alumnoId, empresaId: centro.id, aulaId: v.aulaId, horasMinimas: Number(v.horasMinimas), motivo: v.motivo.trim(), solicitudId: key }, signal, { expectedStatus: 201 });
}
