import { ApiError, request, type Session } from './api';
import { todayLima, validAttendanceDate } from './asistencia';

export type PracticaHoras = { id: string; practicanteId: string; practicanteNombre: string; aulaNombre: string; periodo: string; horasAcumuladas: number; horasMinimas: number; estado: 'EN_CURSO' | 'LISTA_PARA_CIERRE' | 'CERRADA' };
export type RegistroHoras = { id: string; practicaId: string; fecha: string; horas: number; descripcion: string; estadoValidacion: 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO' };
export type HorasDraft = { fecha: string; horas: string; descripcion: string; solicitudId: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const invalid = (): never => { throw new ApiError(502, 'La respuesta de horas no es compatible. Consulta nuevamente.'); };
function practice(v: unknown, session: Session): PracticaHoras {
  if (!object(v) || !text(v.id) || !text(v.practicanteId) || !text(v.practicanteNombre) || !text(v.aulaNombre) || !text(v.periodo) || !count(v.horasAcumuladas) || !count(v.horasMinimas) || !['EN_CURSO', 'LISTA_PARA_CIERRE', 'CERRADA'].includes(String(v.estado))) invalid();
  const value = v as PracticaHoras;
  if (session.user.role === 'ALUMNO' && value.practicanteId !== session.user.id) invalid();
  return value;
}
function record(v: unknown, practicaId: string): RegistroHoras {
  if (!object(v) || !text(v.id) || v.practicaId !== practicaId || !text(v.fecha) || !Number.isFinite(Date.parse(v.fecha)) || !count(v.horas) || v.horas === 0 || !text(v.descripcion) || !['PENDIENTE', 'VALIDADO', 'RECHAZADO'].includes(String(v.estadoValidacion))) invalid();
  return v as RegistroHoras;
}
export async function getPracticasHoras(session: Session, signal: AbortSignal) {
  if (!['ALUMNO', 'SUPERVISOR'].includes(session.user.role)) throw new ApiError(403, 'Sección para alumnos y supervisores.');
  const caps = await request<unknown>('/practicas/capacidades', session.token, undefined, signal);
  if (!object(caps) || caps.versionHoras !== 1) throw new ApiError(502, 'Este servidor todavía no ofrece el circuito de horas actualizado.');
  const values = await request<unknown>('/practicas', session.token, undefined, signal);
  if (!Array.isArray(values)) invalid();
  const result = (values as unknown[]).map(v => practice(v, session));
  if (new Set(result.map(v => v.id)).size !== result.length) invalid();
  return result;
}
export async function getHoras(session: Session, practicaId: string, signal: AbortSignal) {
  const values = await request<unknown>(`/practicas/${encodeURIComponent(practicaId)}/horas`, session.token, undefined, signal);
  if (!Array.isArray(values)) invalid();
  const result = (values as unknown[]).map(v => record(v, practicaId));
  if (new Set(result.map(v => v.id)).size !== result.length) invalid();
  return result;
}
export function validateHoras(value: HorasDraft) {
  if (!validAttendanceDate(value.fecha) || value.fecha > todayLima()) throw new ApiError(400, 'Escribe una fecha válida que no sea futura (AAAA-MM-DD).');
  if (!/^\d{1,2}$/.test(value.horas.trim()) || Number(value.horas) < 1 || Number(value.horas) > 24) throw new ApiError(400, 'Escribe entre 1 y 24 horas enteras.');
  if (!value.descripcion.trim() || value.descripcion.trim().length > 2000) throw new ApiError(400, 'Describe la actividad realizada (hasta 2000 caracteres).');
  return { ...value, horas: Number(value.horas.trim()), descripcion: value.descripcion.trim() };
}
export async function registrarHoras(session: Session, practica: PracticaHoras, value: HorasDraft, signal: AbortSignal) {
  if (session.user.role !== 'ALUMNO' || practica.practicanteId !== session.user.id) throw new ApiError(403, 'Solo puedes registrar tus propias horas.');
  const payload = validateHoras(value);
  const response = await request<unknown>(`/practicas/${encodeURIComponent(practica.id)}/horas`, session.token, payload, signal, { method: 'POST', expectedStatus: 201 });
  if (!object(response)) invalid();
  const data = response as Record<string, unknown>;
  const saved = record(data.registro, practica.id);
  const updated = practice(data.practica, session);
  if (updated.id !== practica.id || saved.id !== `h-${value.solicitudId}` || saved.horas !== payload.horas || saved.descripcion !== payload.descripcion || saved.fecha.slice(0, 10) !== payload.fecha) invalid();
  return saved;
}
export async function revisarHoras(session: Session, registro: RegistroHoras, decision: 'VALIDADO' | 'RECHAZADO', signal: AbortSignal) {
  if (session.user.role !== 'SUPERVISOR') throw new ApiError(403, 'Solo el supervisor puede revisar horas.');
  const saved = record(await request<unknown>(`/empresa/horas/${encodeURIComponent(registro.id)}`, session.token, { estadoValidacion: decision }, signal, { method: 'PUT', expectedStatus: 200 }), registro.practicaId);
  if (saved.id !== registro.id || saved.estadoValidacion !== decision || saved.horas !== registro.horas || saved.descripcion !== registro.descripcion || saved.fecha !== registro.fecha) invalid();
  return saved;
}
