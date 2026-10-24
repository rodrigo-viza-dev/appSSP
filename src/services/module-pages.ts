import { ApiError, request, type Session } from './api';
import { announcement, thread, message, getAulasComunidad, type Anuncio, type Hilo, type MensajeForo } from './comunidad';
import { parse as direct, type Mensaje } from './mensajes';
import type { Archivo } from './archivos';

export type Page<T> = { items: T[]; total: number; siguiente: string | null; noLeidos?: number };
export type AnuncioResumen = Omit<Anuncio, 'mensaje'> & { resumen: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
function invalid(): never { throw new ApiError(502, 'La página recibida no es compatible. Actualiza la consulta.'); }
export function page<T extends { id: string }>(v: unknown, parse: (row: unknown) => T): Page<T> {
  if (!object(v) || !Array.isArray(v.items) || v.items.length > 40 || !Number.isSafeInteger(v.total) || Number(v.total) < v.items.length || !(v.siguiente === null || text(v.siguiente) && v.siguiente.length > 0 && v.siguiente.length <= 2048)) invalid();
  const items = v.items.map(parse);
  if (new Set(items.map(row => row.id)).size !== items.length || v.siguiente && !items.length) invalid();
  if (v.noLeidos !== undefined && (!Number.isSafeInteger(v.noLeidos) || Number(v.noLeidos) < 0)) invalid();
  return { items, total: Number(v.total), siguiente: v.siguiente as string | null, ...(v.noLeidos === undefined ? {} : { noLeidos: Number(v.noLeidos) }) };
}
const query = (cursor?: string | null, extra: Record<string, string> = {}) => new URLSearchParams({ limite: '20', ...extra, ...(cursor ? { cursor } : {}) }).toString();
export async function getAnnouncementPage(s: Session, aulaId: string, pinned: boolean, signal: AbortSignal, cursor?: string | null) {
  return page(await request(`/aulas/${encodeURIComponent(aulaId)}/anuncios/pagina?${query(cursor, { fijados: String(pinned) })}`, s.token, undefined, signal), v => {
    if (!object(v) || !text(v.id) || !v.id || v.aulaId !== aulaId || !text(v.autorNombre) || !text(v.titulo) || !text(v.fecha) || !Number.isFinite(Date.parse(v.fecha)) || typeof v.fijado !== 'boolean' || !text(v.resumen) || v.resumen.length > 180) invalid();
    return v as AnuncioResumen;
  });
}
export async function getAnnouncement(s: Session, aulaId: string, id: string, signal: AbortSignal) {
  const value = announcement(await request(`/aulas/${encodeURIComponent(aulaId)}/anuncios/${encodeURIComponent(id)}/detalle`, s.token, undefined, signal), aulaId);
  if (value.id !== id) invalid();
  return value;
}
export async function getThreadPage(s: Session, aulaId: string, signal: AbortSignal, cursor?: string | null) {
  return page(await request(`/aulas/${encodeURIComponent(aulaId)}/foros/pagina?${query(cursor)}`, s.token, undefined, signal), v => thread(v, aulaId));
}
export async function getThreadContext(s: Session, aulaId: string, id: string, signal: AbortSignal) {
  const [aulas, raw] = await Promise.all([getAulasComunidad(s, signal), request(`/aulas/${encodeURIComponent(aulaId)}/foros/${encodeURIComponent(id)}/detalle`, s.token, undefined, signal)]);
  const aula = aulas.find(a => a.id === aulaId), hilo = thread(raw, aulaId);
  if (!aula || hilo.id !== id) throw new ApiError(404, 'El tema no está disponible en esta aula.');
  return { aula, hilo };
}
export async function getForumMessagePage(s: Session, id: string, signal: AbortSignal, cursor?: string | null): Promise<Page<MensajeForo>> {
  return page(await request(`/foros/${encodeURIComponent(id)}/mensajes/pagina?${query(cursor)}`, s.token, undefined, signal), v => message(v, id));
}
export async function getDirectMessagePage(s: Session, aulaId: string, peer: string, signal: AbortSignal, cursor?: string | null): Promise<Page<Mensaje>> {
  const result = page(await request(`/aulas/${encodeURIComponent(aulaId)}/mensajes/${encodeURIComponent(peer)}/pagina?${query(cursor)}`, s.token, undefined, signal), v => direct(v, s, aulaId, peer));
  if (result.noLeidos === undefined) invalid();
  return result;
}
export async function getFilePage(s: Session, aulaId: string, tipo: string, signal: AbortSignal, cursor?: string | null) {
  return page(await request(`/aulas/${encodeURIComponent(aulaId)}/archivos/pagina?${query(cursor, { tipo })}`, s.token, undefined, signal), v => {
    if (!object(v) || !text(v.id) || !v.id || v.aulaId !== aulaId || !['subidoPorId', 'subidoPorNombre', 'nombreOriginal', 'tipoMime', 'createdAt'].every(k => text(v[k])) || !Number.isSafeInteger(v.tamanio) || Number(v.tamanio) < 0) invalid();
    return v as Archivo;
  });
}
