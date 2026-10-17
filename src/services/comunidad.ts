import { ApiError, request, type Session } from './api';

export type AulaComunidad = { id: string; nombre: string; periodo: string; estado: 'ACTIVA' | 'CONCLUIDA' };
export type Anuncio = { id: string; aulaId: string; autorNombre: string; titulo: string; mensaje: string; fijado: boolean; fecha: string };
export type Hilo = { id: string; aulaId: string; autorNombre: string; titulo: string; respuestas: number; fecha: string };
export type MensajeForo = { id: string; hiloId: string; autorNombre: string; texto: string; fecha: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
function invalid(): never { throw new ApiError(502, 'El contenido del aula no es compatible. Actualiza la consulta.'); }
function member(s: Session) { if (!['ALUMNO', 'PROFESOR', 'ADMIN'].includes(s.user.role)) throw new ApiError(403, 'Sección para miembros del aula.'); }
const path = (id: string) => { if (!id.trim()) throw new ApiError(400, 'Abre el aula desde tu panel.'); return encodeURIComponent(id); };
function list<T extends { id: string }>(v: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(v)) invalid();
  const rows = v.map(parse);
  if (new Set(rows.map(r => r.id)).size !== rows.length) invalid();
  return rows;
}
function announcement(v: unknown, aulaId: string): Anuncio {
  if (!object(v) || !text(v.id) || v.aulaId !== aulaId || !text(v.autorNombre) || !text(v.titulo) || !text(v.mensaje) || typeof v.fijado !== 'boolean' || !date(v.fecha)) invalid();
  return v as Anuncio;
}
function thread(v: unknown, aulaId: string): Hilo {
  if (!object(v) || !text(v.id) || v.aulaId !== aulaId || !text(v.autorNombre) || !text(v.titulo) || !Number.isSafeInteger(v.respuestas) || Number(v.respuestas) < 0 || !date(v.fecha)) invalid();
  return v as Hilo;
}
function message(v: unknown, hiloId: string): MensajeForo {
  if (!object(v) || !text(v.id) || v.hiloId !== hiloId || !text(v.autorNombre) || !text(v.texto) || !date(v.fecha)) invalid();
  return v as MensajeForo;
}
export function contentText(value: string, label: string, max: number) {
  const result = value.trim();
  if (!result || result.length > max) throw new ApiError(400, `${label}: escribe entre 1 y ${max} caracteres.`);
  return result;
}
export async function getAulasComunidad(s: Session, signal: AbortSignal): Promise<AulaComunidad[]> {
  member(s);
  const caps = await request<unknown>('/comunicacion/capacidades', s.token, undefined, signal);
  if (!object(caps) || caps.versionComunicacion !== 1) throw new ApiError(502, 'Este servidor todavía no ofrece los módulos de comunidad actualizados.');
  return list(await request<unknown>('/comunicacion/aulas', s.token, undefined, signal), v => {
    if (!object(v) || !text(v.id) || !text(v.nombre) || !text(v.periodo) || !['ACTIVA', 'CONCLUIDA'].includes(String(v.estado))) invalid();
    return v as AulaComunidad;
  });
}
export async function getAnuncios(s: Session, aulaId: string, signal: AbortSignal) {
  member(s);
  return list(await request<unknown>(`/aulas/${path(aulaId)}/anuncios`, s.token, undefined, signal), v => announcement(v, aulaId));
}
export async function getHilos(s: Session, aulaId: string, signal: AbortSignal) {
  member(s);
  return list(await request<unknown>(`/aulas/${path(aulaId)}/foros`, s.token, undefined, signal), v => thread(v, aulaId));
}
export async function getMensajesForo(s: Session, hiloId: string, signal: AbortSignal) {
  member(s);
  return list(await request<unknown>(`/foros/${path(hiloId)}/mensajes`, s.token, undefined, signal), v => message(v, hiloId));
}
function open(aula: AulaComunidad) { if (aula.estado !== 'ACTIVA') throw new ApiError(409, 'El aula está concluida y su contenido es de consulta.'); }
export async function publicarAnuncio(s: Session, aula: AulaComunidad, values: Record<string, string>, solicitudId: string, signal: AbortSignal) {
  if (!['PROFESOR', 'ADMIN'].includes(s.user.role)) throw new ApiError(403, 'Solo el docente o administración puede publicar anuncios.');
  open(aula);
  const body = { titulo: contentText(values.titulo, 'Título', 200), mensaje: contentText(values.mensaje, 'Contenido', 10000), fijado: values.fijado === 'si', solicitudId };
  const saved = announcement(await request<unknown>(`/aulas/${path(aula.id)}/anuncios`, s.token, body, signal, { expectedStatus: 201 }), aula.id);
  if (saved.titulo !== body.titulo || saved.mensaje !== body.mensaje || saved.fijado !== body.fijado) invalid();
  return saved;
}
export async function crearHilo(s: Session, aula: AulaComunidad, values: Record<string, string>, solicitudId: string, signal: AbortSignal) {
  member(s); open(aula);
  const titulo = contentText(values.titulo, 'Tema', 200);
  const saved = thread(await request<unknown>(`/aulas/${path(aula.id)}/foros`, s.token, { titulo, solicitudId }, signal, { expectedStatus: 201 }), aula.id);
  if (saved.titulo !== titulo) invalid();
  return saved;
}
export async function responderForo(s: Session, aula: AulaComunidad, hiloId: string, values: Record<string, string>, solicitudId: string, signal: AbortSignal) {
  member(s); open(aula);
  const texto = contentText(values.texto, 'Respuesta', 10000);
  const saved = message(await request<unknown>(`/foros/${path(hiloId)}/mensajes`, s.token, { texto, solicitudId }, signal, { expectedStatus: 201 }), hiloId);
  if (saved.texto !== texto) invalid();
  return saved;
}
