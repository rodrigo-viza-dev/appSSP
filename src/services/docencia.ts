import { ApiError, request, type Session } from './api';
import { parseClassroom } from './staff-pages';

export type AulaDocente = { id: string; nombre: string; codigo: string; descripcion: string; periodo: string; profesorId: string; profesorNombre: string; estado: 'ACTIVA' | 'CONCLUIDA'; inscritos: number };
export type PracticanteDocente = { alumnoId: string; alumnoNombre: string; alumnoEmail: string; aulaId: string; aulaNombre: string; progreso: number; semanaActual: number; semanasTotales: number; estado: string; tareasEntregadas: number; tareasTotal: number };
export type EntregaDocente = { revision?: number; id: string; tareaId: string; tareaTitulo: string; alumnoId: string; alumnoNombre: string; descripcion: string; comentario: string; archivoId: string | null; estado: string; nota: number | null; retroalimentacion: string | null; createdAt: string };
export type LibroDocente = { aulaId: string; aulaNombre: string; tareas: { id: string; titulo: string }[]; alumnos: { alumnoId: string; alumnoNombre: string; codigo: string; notas: Record<string, number | null>; promedio: number | null; asistenciaPct: number | null; horas: number }[]; promedioGeneral: number | null };

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number => finite(v) && Number.isInteger(v) && v >= 0;
const grade = (v: unknown) => v === null || (finite(v) && v >= 0 && v <= 20);
const percent = (v: unknown) => finite(v) && v >= 0 && v <= 100;
const nullableText = (v: unknown) => v === null || text(v);
const unique = (items: { id: string }[]) => new Set(items.map(item => item.id)).size === items.length;
function invalid(): never { throw new ApiError(502, 'Los datos de docencia no son compatibles. Actualiza la información.'); }
function docente(session: Session) {
  if (!['PROFESOR', 'ADMIN'].includes(session.user.role)) throw new ApiError(403, 'Esta sección está disponible para docencia y administración.');
}
function idPath(id: string) { if (!id.trim()) throw new ApiError(400, 'El enlace no es válido. Abre el aula desde tu panel.'); return encodeURIComponent(id); }
function isEntrega(v: unknown): v is EntregaDocente {
  return object(v) && text(v.id) && !!v.id && text(v.tareaId) && text(v.tareaTitulo) && text(v.alumnoId) && text(v.alumnoNombre) && text(v.descripcion) && text(v.comentario) && nullableText(v.archivoId) && text(v.estado) && grade(v.nota) && nullableText(v.retroalimentacion) && text(v.createdAt);
}
export async function getAulasDocente(session: Session, signal: AbortSignal): Promise<AulaDocente[]> {
  docente(session);
  const data = await request<unknown>('/aulas', session.token, undefined, signal);
  if (!Array.isArray(data) || !data.every(v => object(v) && text(v.id) && !!v.id && text(v.nombre) && text(v.codigo) && text(v.descripcion) && text(v.periodo) && text(v.profesorId) && text(v.profesorNombre) && ['ACTIVA', 'CONCLUIDA'].includes(v.estado as string) && count(v.inscritos) && (session.user.role === 'ADMIN' || v.profesorId === session.user.id)) || !unique(data)) invalid();
  return data as AulaDocente[];
}
export async function getAulaDocente(session: Session, aulaId: string, signal: AbortSignal) {
  docente(session);
  const raw = await request<unknown>(`/equipo/aulas/${idPath(aulaId)}`, session.token, undefined, signal);
  const aula = parseClassroom(raw, session);
  if (aula.id !== aulaId || !object(raw) || !text(raw.descripcion)) invalid();
  return { ...aula, descripcion: raw.descripcion };
}
export async function getPracticantesDocente(session: Session, signal: AbortSignal): Promise<PracticanteDocente[]> {
  docente(session);
  const data = await request<unknown>('/profesor/practicantes', session.token, undefined, signal);
  if (!Array.isArray(data) || !data.every(v => object(v) && text(v.alumnoId) && text(v.alumnoNombre) && text(v.alumnoEmail) && text(v.aulaId) && text(v.aulaNombre) && percent(v.progreso) && count(v.semanaActual) && count(v.semanasTotales) && text(v.estado) && count(v.tareasEntregadas) && count(v.tareasTotal))) invalid();
  return data as PracticanteDocente[];
}
export async function getEntregasDocente(session: Session, aulaId: string, signal: AbortSignal): Promise<EntregaDocente[]> {
  docente(session);
  const data = await request<unknown>(`/profesor/aulas/${idPath(aulaId)}/entregas`, session.token, undefined, signal);
  if (!Array.isArray(data) || !data.every(isEntrega) || !unique(data)) invalid();
  return data;
}
export async function getEntregaDocente(session: Session, aulaId: string, entregaId: string, signal: AbortSignal) {
  docente(session);
  const entrega = await request<unknown>(`/equipo/aulas/${idPath(aulaId)}/entregas/${idPath(entregaId)}`, session.token, undefined, signal);
  if (!isEntrega(entrega) || entrega.id !== entregaId || !count(entrega.revision)) invalid();
  return entrega;
}
export async function getLibroDocente(session: Session, aulaId: string, signal: AbortSignal): Promise<LibroDocente> {
  docente(session);
  const data = await request<unknown>(`/profesor/aulas/${idPath(aulaId)}/libro`, session.token, undefined, signal);
  if (!object(data) || data.aulaId !== aulaId || !text(data.aulaNombre) || !grade(data.promedioGeneral) || !Array.isArray(data.tareas) || !data.tareas.every(v => object(v) && text(v.id) && text(v.titulo)) || !unique(data.tareas) || !Array.isArray(data.alumnos)) invalid();
  const tareas = new Set(data.tareas.map(v => v.id));
  if (!data.alumnos.every(v => object(v) && text(v.alumnoId) && text(v.alumnoNombre) && text(v.codigo) && grade(v.promedio) && (v.asistenciaPct === null || percent(v.asistenciaPct)) && count(v.horas) && object(v.notas) && Object.entries(v.notas).every(([id, nota]) => tareas.has(id) && grade(nota)))) invalid();
  return data as LibroDocente;
}
export function validateNota(nota: string) {
  return /^(?:[0-9]|1[0-9]|20)$/.test(nota.trim()) ? '' : 'Escribe una nota entera entre 0 y 20.';
}
export async function calificarEntrega(session: Session, entrega: EntregaDocente, nota: string, retroalimentacion: string, signal: AbortSignal): Promise<EntregaDocente> {
  docente(session);
  if (validateNota(nota)) throw new ApiError(400, validateNota(nota));
  const body = { nota: Number(nota.trim()), retroalimentacion: retroalimentacion.trim(), revisionEntrega: entrega.revision ?? 0 };
  const data = await request<unknown>(`/profesor/entregas/${idPath(entrega.id)}/calificar`, session.token, body, signal, { method: 'PUT', expectedStatus: 200 });
  if (!isEntrega(data) || data.id !== entrega.id || data.tareaId !== entrega.tareaId || data.alumnoId !== entrega.alumnoId || data.estado !== 'CALIFICADA' || data.nota !== body.nota || data.retroalimentacion !== body.retroalimentacion) invalid();
  return data;
}
