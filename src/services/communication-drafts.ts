import { ApiError, type Session } from './api';
import { contentText, crearHilo, responderForo, type AulaComunidad } from './comunidad';
import { enviarMensaje } from './mensajes';

export type CommunicationContext = { type: 'mensaje' | 'foro' | 'tema'; aula: AulaComunidad; peerId?: string; hiloId?: string };
export function isCommunicationContext(value: unknown): value is CommunicationContext {
  if (!value || typeof value !== 'object') return false;
  const c = value as CommunicationContext;
  return ['mensaje', 'foro', 'tema'].includes(c.type) && !!c.aula && typeof c.aula.id === 'string' && !!c.aula.id && typeof c.aula.nombre === 'string' && ['ACTIVA', 'CONCLUIDA'].includes(c.aula.estado) && (c.type !== 'mensaje' || typeof c.peerId === 'string' && !!c.peerId) && (c.type !== 'foro' || typeof c.hiloId === 'string' && !!c.hiloId);
}
export const communicationResource = (c: CommunicationContext) => JSON.stringify([c.type, c.aula.id, c.peerId ?? c.hiloId ?? '']);
export function validateCommunication(c: CommunicationContext, value: Record<string, string>) {
  contentText(value[c.type === 'tema' ? 'titulo' : 'texto'] ?? '', c.type === 'tema' ? 'Tema' : 'Mensaje', c.type === 'tema' ? 200 : 10000);
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(value.solicitudId ?? '')) throw new ApiError(400, 'El identificador del borrador no es válido. Conserva el texto y prepara un borrador nuevo.');
}
export async function sendCommunication(s: Session, c: CommunicationContext, value: Record<string, string>, signal: AbortSignal) {
  validateCommunication(c, value);
  if (c.type === 'mensaje') return enviarMensaje(s, c.aula, c.peerId!, value, value.solicitudId, signal);
  if (c.type === 'foro') return responderForo(s, c.aula, c.hiloId!, value, value.solicitudId, signal);
  return crearHilo(s, c.aula, value, value.solicitudId, signal);
}
