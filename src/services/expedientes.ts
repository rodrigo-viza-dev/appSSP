import { ApiError, request, type Session } from './api';

export type PracticaExpediente = { id: string; practicanteId: string; practicanteNombre: string; aulaId: string; aulaNombre: string; periodo: string; estado: string; horasAcumuladas: number; horasMinimas: number };
export type Requisitos = { tareas: string[]; metas: string[]; notaMinima: number | null; motivo: string; responsable: string; responsableId: string; fecha: string };
export type Evaluacion = { revision: number; desempeno: string; fortalezas: string; mejoras: string; conclusion: 'FAVORABLE' | 'REQUIERE_MEJORAS'; conformidad: true; supervisorId: string; supervisorNombre: string; empresaId: string; fecha: string };
export type Expediente = {
  practica: { id: string; practicanteId: string; practicanteNombre: string; aulaId: string; aulaNombre: string; docenteNombre: string; periodo: string; horasMinimas: number; horasValidadas: number; estado: string; fechaInicio: string | null };
  centro: { id: string; nombre: string; ruc: string; direccion: string } | null;
  supervisor: { id: string; userId: string | null; nombre: string; cargo: string } | null;
  configuracion: Requisitos | null; revisionConfiguracion: number; evaluacion: Evaluacion | null; evaluacionVigente: boolean;
  tareas: { id: string; titulo: string; obligatoria: boolean; entregaId: string | null; nota: number | null; retroalimentacion: string | null; cumplida: boolean }[];
  metas: { id: string; tipo: string; descripcion: string; obligatoria: boolean; objetivo: number; alcanzada: number; cumplida: boolean }[];
  horas: { id: string; fecha: string; horas: number; descripcion: string; estado: string; observacion: string }[];
  checklist: { id: string; titulo: string; cumplido: boolean; detalle: string }[];
  puedeCerrar: boolean; cerrado: boolean; revision: string;
  cierre: { version: number; fecha: string; responsable: string; responsableId: string; motivo: string; revisionConfirmada: string } | null;
};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const texts = (v: unknown): v is string[] => Array.isArray(v) && v.every(text) && new Set(v).size === v.length;
const grade = (v: unknown) => v === null || count(v) && v <= 20;
function invalid(): never { throw new ApiError(502, 'El expediente recibido no es compatible. Actualiza los datos.'); }
function parse(v: unknown, id: string): Expediente {
  if (!object(v) || !object(v.practica) || v.practica.id !== id || !['practicanteId', 'practicanteNombre', 'aulaId', 'aulaNombre', 'docenteNombre', 'periodo', 'estado'].every(k => text((v.practica as Record<string, unknown>)[k])) || !count(v.practica.horasMinimas) || !count(v.practica.horasValidadas)) invalid();
  if (!count(v.revisionConfiguracion) || !text(v.revision) || !/^[a-f0-9]{64}$/.test(v.revision) || typeof v.puedeCerrar !== 'boolean' || typeof v.cerrado !== 'boolean' || typeof v.evaluacionVigente !== 'boolean') invalid();
  if (v.centro !== null && (!object(v.centro) || !['id', 'nombre', 'ruc', 'direccion'].every(k => text((v.centro as Record<string, unknown>)[k])))) invalid();
  if (v.supervisor !== null && (!object(v.supervisor) || !text(v.supervisor.id) || !text(v.supervisor.nombre) || !(v.supervisor.userId === null || text(v.supervisor.userId)) || !text(v.supervisor.cargo))) invalid();
  if (v.configuracion !== null && (!object(v.configuracion) || !texts(v.configuracion.tareas) || !texts(v.configuracion.metas) || !grade(v.configuracion.notaMinima) || !['motivo', 'responsable', 'responsableId', 'fecha'].every(k => text((v.configuracion as Record<string, unknown>)[k])))) invalid();
  if (v.evaluacion !== null && (!object(v.evaluacion) || !count(v.evaluacion.revision) || v.evaluacion.conformidad !== true || !['FAVORABLE', 'REQUIERE_MEJORAS'].includes(String(v.evaluacion.conclusion)) || !['desempeno', 'fortalezas', 'mejoras', 'supervisorId', 'supervisorNombre', 'empresaId', 'fecha'].every(k => text((v.evaluacion as Record<string, unknown>)[k])))) invalid();
  if (!Array.isArray(v.tareas) || !v.tareas.every(t => object(t) && text(t.id) && text(t.titulo) && typeof t.obligatoria === 'boolean' && typeof t.cumplida === 'boolean' && grade(t.nota) && (t.entregaId === null || text(t.entregaId)) && (t.retroalimentacion === null || text(t.retroalimentacion)))) invalid();
  if (!Array.isArray(v.metas) || !v.metas.every(m => object(m) && text(m.id) && text(m.tipo) && text(m.descripcion) && count(m.objetivo) && count(m.alcanzada) && typeof m.obligatoria === 'boolean' && typeof m.cumplida === 'boolean')) invalid();
  if (!Array.isArray(v.horas) || !v.horas.every(h => object(h) && text(h.id) && text(h.fecha) && count(h.horas) && text(h.descripcion) && text(h.estado) && text(h.observacion))) invalid();
  if (!Array.isArray(v.checklist) || !v.checklist.every(c => object(c) && text(c.id) && text(c.titulo) && text(c.detalle) && typeof c.cumplido === 'boolean')) invalid();
  if (v.cierre !== null && (!object(v.cierre) || v.cierre.version !== 1 || !['fecha', 'responsable', 'responsableId', 'motivo', 'revisionConfirmada'].every(k => text((v.cierre as Record<string, unknown>)[k])))) invalid();
  return v as Expediente;
}
export async function getPracticasExpedientes(s: Session, signal: AbortSignal): Promise<PracticaExpediente[]> {
  const caps = await request<unknown>('/expedientes/capacidades', s.token, undefined, signal);
  if (!object(caps) || caps.versionExpediente !== 1) throw new ApiError(502, 'El servidor aún no ofrece evaluación y expediente.');
  const values = await request<unknown>('/practicas', s.token, undefined, signal);
  if (!Array.isArray(values) || !values.every(p => object(p) && ['id', 'practicanteId', 'practicanteNombre', 'aulaId', 'aulaNombre', 'periodo', 'estado'].every(k => text(p[k])) && count(p.horasAcumuladas) && count(p.horasMinimas))) invalid();
  return values as PracticaExpediente[];
}
const path = (id: string) => `/expedientes/${encodeURIComponent(id)}`;
export async function getExpediente(s: Session, id: string, signal: AbortSignal) { return parse(await request<unknown>(path(id), s.token, undefined, signal), id); }
export async function guardarRequisitos(s: Session, data: Expediente, values: { tareas: string[]; metas: string[]; notaMinima: number | null; motivo: string }, signal: AbortSignal) {
  return parse(await request<unknown>(`${path(data.practica.id)}/requisitos`, s.token, { ...values, revision: data.revisionConfiguracion }, signal, { method: 'PUT' }), data.practica.id);
}
export function validateEvaluacion(v: Record<string, string>) {
  if (v.desempeno.trim().length < 10) throw new ApiError(400, 'Describe el desempeño con al menos 10 caracteres.');
  if (v.fortalezas.trim().length < 5 || v.mejoras.trim().length < 5) throw new ApiError(400, 'Completa fortalezas y aspectos por mejorar (al menos 5 caracteres cada uno).');
  if (!['FAVORABLE', 'REQUIERE_MEJORAS'].includes(v.conclusion) || v.conformidad !== 'SI') throw new ApiError(400, 'Selecciona una conclusión y confirma que revisaste la evaluación.');
}
export async function guardarEvaluacion(s: Session, data: Expediente, v: Record<string, string>, signal: AbortSignal) {
  validateEvaluacion(v);
  return parse(await request<unknown>(`${path(data.practica.id)}/evaluacion`, s.token, { revision: data.evaluacion?.revision ?? 0, desempeno: v.desempeno.trim(), fortalezas: v.fortalezas.trim(), mejoras: v.mejoras.trim(), conclusion: v.conclusion, conformidad: true }, signal, { method: 'PUT' }), data.practica.id);
}
export async function cerrarExpediente(s: Session, data: Expediente, motivo: string, signal: AbortSignal) {
  if (motivo.trim().length < 5) throw new ApiError(400, 'Explica la autorización de cierre (al menos 5 caracteres).');
  const result = parse(await request<unknown>(`${path(data.practica.id)}/cerrar`, s.token, { revision: data.revision, motivo: motivo.trim() }, signal), data.practica.id);
  if (!result.cerrado || !result.cierre) invalid();
  return result;
}
