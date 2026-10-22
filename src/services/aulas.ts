import { ApiError, request, type Aula, type Session } from './api';

export type AulaDetalle = Aula & { progreso: number; semanaActual: number; semanasTotales: number };
export type Entrega = {
  revision?: number;
  id: string; tareaId: string; alumnoId: string; descripcion: string; comentario: string;
  archivoId: string | null; estado: string; nota: number | null;
  retroalimentacion: string | null; createdAt: string;
};
export type Tarea = {
  revision?: number;
  id: string; aulaId: string; titulo: string; descripcion: string;
  fechaLimite: string | null; createdAt: string; entrega: Entrega | null;
};
export type Calificacion = {
  tareaId: string; tareaTitulo: string; nota: number | null;
  retroalimentacion: string | null; estado: string; entregadaEn: string | null;
};
export type Calificaciones = {
  promedio: number | null; tareasTotal: number; tareasEntregadas: number; detalle: Calificacion[];
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nullableText = (value: unknown) => value === null || text(value);
const nullableNumber = (value: unknown) => value === null || number(value);
const count = (value: unknown): value is number => number(value) && Number.isInteger(value) && value >= 0;
function invalidResponse(): never { throw new ApiError(502, 'No pudimos interpretar los datos del aula. Intenta actualizar.'); }
function aulaPath(session: Session, aulaId: string) {
  if (session.user.role !== 'ALUMNO') throw new ApiError(403, 'Esta sección está disponible para alumnos.');
  if (!aulaId.trim()) throw new ApiError(400, 'El enlace del aula no es válido.');
  return `/alumno/aulas/${encodeURIComponent(aulaId)}`;
}
function isEntrega(value: unknown, tareaId: string, alumnoId: string): value is Entrega {
  return object(value) && text(value.id) && value.tareaId === tareaId && value.alumnoId === alumnoId &&
    text(value.descripcion) && text(value.comentario) && nullableText(value.archivoId) && text(value.estado) &&
    nullableNumber(value.nota) && nullableText(value.retroalimentacion) && text(value.createdAt);
}
function isTarea(value: unknown, aulaId: string, alumnoId: string): value is Tarea {
  return object(value) && text(value.id) && !!value.id.trim() && value.aulaId === aulaId && text(value.titulo) &&
    text(value.descripcion) && nullableText(value.fechaLimite) && text(value.createdAt) &&
    (value.entrega === null || isEntrega(value.entrega, value.id, alumnoId));
}
function isCalificacion(value: unknown): value is Calificacion {
  return object(value) && text(value.tareaId) && text(value.tareaTitulo) && nullableNumber(value.nota) &&
    nullableText(value.retroalimentacion) && text(value.estado) && nullableText(value.entregadaEn);
}

export async function getAula(session: Session, aulaId: string, signal: AbortSignal): Promise<AulaDetalle> {
  const data = await request<unknown>(aulaPath(session, aulaId), session.token, undefined, signal);
  if (!object(data) || data.id !== aulaId || !text(data.nombre) || !text(data.profesorNombre) || !text(data.ciclo) ||
    !text(data.estado) || !['ACTIVA', 'CONCLUIDA'].includes(data.estado) || !count(data.progreso) || data.progreso > 100 ||
    !count(data.semanaActual) || !count(data.semanasTotales)) invalidResponse();
  return data as AulaDetalle;
}

export async function getTareas(session: Session, aulaId: string, signal: AbortSignal): Promise<Tarea[]> {
  const data = await request<unknown>(`${aulaPath(session, aulaId)}/tareas`, session.token, undefined, signal);
  if (!Array.isArray(data) || !data.every(item => isTarea(item, aulaId, session.user.id))) invalidResponse();
  return data;
}

export async function getTarea(session: Session, aulaId: string, tareaId: string, signal: AbortSignal): Promise<Tarea> {
  if (!tareaId.trim()) throw new ApiError(400, 'El enlace de la tarea no es válido.');
  // El contrato publicado ofrece el listado del aula, no un GET de tarea individual.
  const tareas = await getTareas(session, aulaId, signal);
  const tarea = tareas.find(item => item.id === tareaId);
  if (!tarea) throw new ApiError(404, 'La tarea no está disponible en esta aula.');
  return tarea;
}

export async function getCalificaciones(session: Session, aulaId: string, signal: AbortSignal): Promise<Calificaciones> {
  const data = await request<unknown>(`${aulaPath(session, aulaId)}/calificaciones`, session.token, undefined, signal);
  if (!object(data) || !nullableNumber(data.promedio) || !count(data.tareasTotal) || !count(data.tareasEntregadas) ||
    !Array.isArray(data.detalle) || !data.detalle.every(isCalificacion)) invalidResponse();
  return data as Calificaciones;
}

export function parseTareaResponse(value: unknown, aulaId: string, alumnoId = ''): Tarea {
  if (!isTarea(value, aulaId, alumnoId)) invalidResponse();
  return value;
}
