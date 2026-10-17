import { ApiError, request, type Session } from './api';
import { todayLima, validAttendanceDate } from './asistencia';

export type PracticaHoras = { correcciones?: boolean; id: string; practicanteId: string; practicanteNombre: string; aulaNombre: string; periodo: string; horasAcumuladas: number; horasMinimas: number; estado: 'EN_CURSO' | 'LISTA_PARA_CIERRE' | 'CERRADA' };
export type RegistroHoras = { revision?: number; observacion?: string; id: string; practicaId: string; fecha: string; horas: number; descripcion: string; estadoValidacion: 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO' };
export type HorasDraft = { fecha: string; horas: string; descripcion: string; solicitudId: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function invalid(): never { throw new ApiError(502, 'La respuesta de horas no es compatible. Consulta nuevamente.'); }
function practice(v: unknown, session: Session): PracticaHoras {
  if (!object(v) || !text(v.id) || !text(v.practicanteId) || !text(v.practicanteNombre) || !text(v.aulaNombre) || !text(v.periodo) || !count(v.horasAcumuladas) || !count(v.horasMinimas) || !['EN_CURSO', 'LISTA_PARA_CIERRE', 'CERRADA'].includes(String(v.estado))) invalid();
  const value = v as PracticaHoras;
  if (session.user.role === 'ALUMNO' && value.practicanteId !== session.user.id) invalid();
  return value;
}
function record(v: unknown, practicaId: string): RegistroHoras {
  if (!object(v) || !text(v.id) || v.practicaId !== practicaId || !text(v.fecha) || !Number.isFinite(Date.parse(v.fecha)) || !count(v.horas) || v.horas === 0 || !text(v.descripcion) || !['PENDIENTE', 'VALIDADO', 'RECHAZADO'].includes(String(v.estadoValidacion))) invalid();
  if (v.revision !== undefined && (!count(v.revision) || typeof v.observacion !== 'string')) invalid();
  return v as RegistroHoras;
}
export async function getPracticasHoras(session: Session, signal: AbortSignal) {
  if (!['ALUMNO', 'SUPERVISOR'].includes(session.user.role)) throw new ApiError(403, 'Sección para alumnos y supervisores.');
  const caps = await request<unknown>('/practicas/capacidades', session.token, undefined, signal);
  if (!object(caps) || ![1, 2].includes(Number(caps.versionHoras))) throw new ApiError(502, 'Este servidor todavía no ofrece el circuito de horas actualizado.');
  const values = await request<unknown>('/practicas', session.token, undefined, signal);
  if (!Array.isArray(values)) invalid();
  const result = (values as unknown[]).map(v => ({ ...practice(v, session), correcciones: caps.versionHoras === 2 }));
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
export async function revisarHoras(session: Session, registro: RegistroHoras, decision: 'VALIDADO' | 'RECHAZADO', observacion: string, signal: AbortSignal) {
  if (session.user.role !== 'SUPERVISOR') throw new ApiError(403, 'Solo el supervisor puede revisar horas.');
  if (registro.revision === undefined) throw new ApiError(502, 'Actualiza el servidor para revisar horas con observaciones.');
  if (decision === 'RECHAZADO' && !observacion.trim()) throw new ApiError(400, 'Explica qué debe corregir el alumno.');
  const saved = record(await request<unknown>(`/empresa/horas/${encodeURIComponent(registro.id)}`, session.token, { estadoValidacion: decision, observacion: observacion.trim(), revision: registro.revision }, signal, { method: 'PUT', expectedStatus: 200 }), registro.practicaId);
  if (saved.revision !== registro.revision + 1 || saved.observacion !== observacion.trim() || saved.id !== registro.id || saved.estadoValidacion !== decision || saved.horas !== registro.horas || saved.descripcion !== registro.descripcion || saved.fecha !== registro.fecha) invalid();
  return saved;
}

export async function corregirHoras(session: Session, practica: PracticaHoras, registro: RegistroHoras, value: HorasDraft, signal: AbortSignal) {
  if (session.user.role !== 'ALUMNO' || practica.practicanteId !== session.user.id) throw new ApiError(403, 'Solo puedes corregir tus propias horas.');
  if (!practica.correcciones || registro.revision === undefined || registro.estadoValidacion !== 'RECHAZADO') throw new ApiError(409, 'Consulta la bitácora antes de corregir esta actividad.');
  const payload = validateHoras(value);
  if (payload.horas === registro.horas && payload.descripcion === registro.descripcion && payload.fecha === registro.fecha.slice(0, 10)) throw new ApiError(400, 'Modifica la actividad antes de reenviarla.');
  const saved = record(await request<unknown>(`/practicas/${encodeURIComponent(practica.id)}/horas/${encodeURIComponent(registro.id)}`, session.token, { fecha: payload.fecha, horas: payload.horas, descripcion: payload.descripcion, revision: registro.revision }, signal, { method: 'PUT', expectedStatus: 200 }), practica.id);
  if (saved.id !== registro.id || saved.revision !== registro.revision + 1 || saved.estadoValidacion !== 'PENDIENTE' || saved.horas !== payload.horas || saved.descripcion !== payload.descripcion || saved.fecha.slice(0, 10) !== payload.fecha) invalid();
  return saved;
}
export type CambioHoras = { id: string; revision: number; userNombre: string; accion: string; fecha: string; antes: RegistroHoras | null; despues: RegistroHoras };
export async function getHistorialHoras(session: Session, registro: RegistroHoras, signal: AbortSignal): Promise<CambioHoras[]> {
  const values = await request<unknown>(`/practicas/${encodeURIComponent(registro.practicaId)}/horas/${encodeURIComponent(registro.id)}/historial`, session.token, undefined, signal);
  if (!Array.isArray(values)) invalid();
  const rows = values.map((v: unknown) => {
    if (!object(v) || !text(v.id) || !count(v.revision) || !text(v.userNombre) || !['REGISTRO', 'CORRECCION', 'VALIDACION', 'RECHAZO'].includes(String(v.accion)) || !text(v.fecha) || !Number.isFinite(Date.parse(v.fecha))) invalid();
    const despues = record(v.despues, registro.practicaId);
    const antes = v.antes === null ? null : record(v.antes, registro.practicaId);
    if (despues.id !== registro.id || despues.revision !== v.revision || (antes && (antes.id !== registro.id || antes.revision !== Number(v.revision) - 1))) invalid();
    return { ...v, antes, despues } as CambioHoras;
  });
  if (new Set(rows.map(v => v.revision)).size !== rows.length || new Set(rows.map(v => v.id)).size !== rows.length) invalid();
  return rows;
}
