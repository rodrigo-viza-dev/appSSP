import { ApiError, request, type Session } from './api';
export type Seguimiento = { practicanteId: string; practicanteNombre: string; practicanteEmail: string; aulaId: string; aulaNombre: string; empresaNombre: string | null; promedio: number | null; asistenciaPct: number | null; horasAcumuladas: number; horasMinimas: number; progreso: number; estadoPractica: string | null; entregas: { tareaTitulo: string; nota: number | null; estado: string; retroalimentacion: string | null }[]; motivosRiesgo: string[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const finite = (v: unknown, max = Infinity): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const nullable = (v: unknown, max: number) => v === null || finite(v, max);
export async function getSeguimiento(s: Session, aulaId: string, alumnoId: string, signal: AbortSignal): Promise<Seguimiento> {
  if (!['PROFESOR', 'ADMIN'].includes(s.user.role)) throw new ApiError(403, 'Ficha disponible para el docente responsable y administración.');
  const caps = await request<unknown>('/profesor/seguimiento/capacidades', s.token, undefined, signal);
  if (!object(caps) || caps.versionSeguimiento !== 1) throw new ApiError(502, 'Este servidor todavía no ofrece la ficha de seguimiento actualizada.');
  const v = await request<unknown>(`/profesor/aulas/${encodeURIComponent(aulaId)}/practicantes/${encodeURIComponent(alumnoId)}/seguimiento`, s.token, undefined, signal);
  if (!object(v) || v.aulaId !== aulaId || v.practicanteId !== alumnoId || !text(v.aulaNombre) || !text(v.practicanteNombre) || !text(v.practicanteEmail) || !(v.empresaNombre === null || typeof v.empresaNombre === 'string') || !nullable(v.promedio, 20) || !nullable(v.asistenciaPct, 100) || !finite(v.horasAcumuladas) || !finite(v.horasMinimas) || !finite(v.progreso, 100) || !(v.estadoPractica === null || ['EN_CURSO', 'LISTA_PARA_CIERRE', 'CERRADA'].includes(String(v.estadoPractica))) || !Array.isArray(v.motivosRiesgo) || !v.motivosRiesgo.every(text) || !Array.isArray(v.entregas) || !v.entregas.every(e => object(e) && text(e.tareaTitulo) && nullable(e.nota, 20) && text(e.estado) && (e.retroalimentacion === null || typeof e.retroalimentacion === 'string'))) throw new ApiError(502, 'La ficha de seguimiento no es compatible. Actualiza la consulta.');
  return v as Seguimiento;
}
