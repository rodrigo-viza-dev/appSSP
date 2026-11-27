import { ApiError, request, type Session } from './api';
import { contentText, getAulasComunidad, type AulaComunidad } from './comunidad';
export type Contacto = { userId: string; nombre: string; aulaId: string; aulaNombre: string; noLeidos: number };
export type Mensaje = { id: string; aulaId: string; remitenteId: string; remitenteNombre: string; destinatarioId: string; texto: string; mio: boolean; leido: boolean; fecha: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
function invalid(): never { throw new ApiError(502, 'La conversación no es compatible. Consulta los datos actuales.'); }
function member(s: Session) { if (!['ALUMNO', 'PROFESOR'].includes(s.user.role)) throw new ApiError(403, 'Mensajería privada entre docente y alumno del aula.'); }
export function parse(v: unknown, s: Session, aulaId: string, peerId: string): Mensaje {
  if (!object(v) || !text(v.id) || v.aulaId !== aulaId || !text(v.remitenteNombre) || !text(v.texto) || typeof v.mio !== 'boolean' || typeof v.leido !== 'boolean' || !text(v.fecha) || !Number.isFinite(Date.parse(v.fecha)) || v.remitenteId !== (v.mio ? s.user.id : peerId) || v.destinatarioId !== (v.mio ? peerId : s.user.id)) invalid();
  return v as Mensaje;
}
export async function getAulasMensajes(s: Session, signal: AbortSignal) {
  member(s);
  const [caps, aulas] = await Promise.all([request<unknown>('/mensajes/capacidades', s.token, undefined, signal), getAulasComunidad(s, signal)]);
  if (!object(caps) || caps.versionMensajes !== 1 || caps.lecturaExplicita !== true) throw new ApiError(502, 'Este servidor todavía no ofrece la mensajería actualizada.');
  return aulas;
}
export async function getContactos(s: Session, aulaId: string, signal: AbortSignal): Promise<Contacto[]> {
  member(s);
  const v = await request<unknown>(`/aulas/${encodeURIComponent(aulaId)}/contactos`, s.token, undefined, signal);
  if (!Array.isArray(v) || !v.every(c => object(c) && text(c.userId) && c.userId !== s.user.id && c.aulaId === aulaId && text(c.nombre) && text(c.aulaNombre) && typeof c.noLeidos === 'number' && Number.isSafeInteger(c.noLeidos) && c.noLeidos >= 0) || new Set(v.map(c => c.userId)).size !== v.length) invalid();
  return v as Contacto[];
}
function contact(c: unknown, s: Session, aulaId: string): Contacto {
  if (!object(c) || !text(c.userId) || c.userId === s.user.id || c.aulaId !== aulaId || !text(c.nombre) || !text(c.aulaNombre) || typeof c.noLeidos !== 'number' || !Number.isSafeInteger(c.noLeidos) || c.noLeidos < 0) invalid();
  return { userId: c.userId, nombre: c.nombre, aulaId: c.aulaId, aulaNombre: c.aulaNombre, noLeidos: c.noLeidos };
}
export type ContactoPagina = Contacto & { id: string };
export type ContactPage = { items: ContactoPagina[]; total: number; siguiente: string | null; noLeidos: number };
export async function getContactPage(s: Session, aulaId: string, q: string, sinLeer: boolean, signal: AbortSignal, cursor?: string | null): Promise<ContactPage> {
  if (s.user.role !== 'PROFESOR') throw new ApiError(403, 'La lista de contactos por páginas corresponde al docente responsable.');
  const params = new URLSearchParams({ limite: '20', q: q.trim(), sinLeer: String(sinLeer), ...(cursor ? { cursor } : {}) });
  const v = await request<unknown>(`/equipo/aulas/${encodeURIComponent(aulaId)}/contactos/pagina?${params}`, s.token, undefined, signal);
  if (!object(v) || !Array.isArray(v.items) || !Number.isSafeInteger(v.total) || !Number.isSafeInteger(v.noLeidos) || !(v.siguiente === null || typeof v.siguiente === 'string')) invalid();
  const items = v.items.map(row => ({ ...contact(row, s, aulaId), id: (row as Record<string, unknown>).userId as string }));
  if (new Set(items.map(c => c.id)).size !== items.length || items.length > Number(v.total)) invalid();
  return { items, total: Number(v.total), siguiente: v.siguiente as string | null, noLeidos: Number(v.noLeidos) };
}
export async function getChatContext(s: Session, aulaId: string, peerId: string, signal: AbortSignal) {
  member(s);
  if (!peerId.trim()) throw new ApiError(400, 'Abre la conversación desde tus contactos del aula.');
  const [aulas, raw] = await Promise.all([getAulasMensajes(s, signal), request<unknown>(`/aulas/${encodeURIComponent(aulaId)}/contactos/${encodeURIComponent(peerId)}`, s.token, undefined, signal)]);
  const aula = aulas.find(a => a.id === aulaId), contacto = contact(raw, s, aulaId);
  if (!aula || contacto.userId !== peerId) throw new ApiError(404, 'El contacto no está disponible en esta aula.');
  return { aula, contacto };
}
export async function enviarMensaje(s: Session, aula: AulaComunidad, peerId: string, values: Record<string, string>, solicitudId: string, signal: AbortSignal) {
  member(s);
  if (aula.estado !== 'ACTIVA') throw new ApiError(409, 'El aula está concluida y la conversación es de consulta.');
  const texto = contentText(values.texto, 'Mensaje', 10000);
  const saved = parse(await request<unknown>(`/aulas/${encodeURIComponent(aula.id)}/mensajes/${encodeURIComponent(peerId)}`, s.token, { texto, solicitudId }, signal, { expectedStatus: 201 }), s, aula.id, peerId);
  if (!saved.mio || saved.texto !== texto) invalid();
  return saved;
}
export async function leerMensajes(s: Session, aulaId: string, peerId: string, mensajeIds: string[], signal: AbortSignal) {
  member(s);
  if (!mensajeIds.length || mensajeIds.length > 200 || new Set(mensajeIds).size !== mensajeIds.length) throw new ApiError(400, 'Selecciona hasta 200 mensajes distintos.');
  const saved = await request<unknown>(`/aulas/${encodeURIComponent(aulaId)}/mensajes/${encodeURIComponent(peerId)}/lectura`, s.token, { mensajeIds }, signal, { method: 'PUT', expectedStatus: 200 });
  if (!object(saved) || !Array.isArray(saved.mensajeIds) || saved.mensajeIds.length !== mensajeIds.length || new Set(saved.mensajeIds).size !== mensajeIds.length || !saved.mensajeIds.every(id => typeof id === 'string' && mensajeIds.includes(id))) invalid();
}
