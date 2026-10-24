import { ApiError, request, type Session } from './api';
import { corregirHoras, getHoras, registrarHoras, validateHoras, type HorasDraft, type PracticaHoras, type RegistroHoras } from './horas';
import { getTarea, parseTareaResponse, type Tarea } from './aulas';
import { listDrafts, readDraft, writeDraft } from '@/storage/drafts';
import { isCommunicationContext, sendCommunication } from './communication-drafts';
const flights = new Map<string, Promise<void>>();
async function send(s: Session, key: string) {
  const entry = await readDraft(s, key);
  if (!entry || entry.status !== 'POR_ENVIAR') return;
  const signal = AbortSignal.timeout(60000);
  if (entry.kind === 'horas') {
    const { practica, registro } = entry.context as { practica: PracticaHoras; registro?: RegistroHoras };
    if (practica.practicanteId !== s.user.id) throw new ApiError(403, 'El borrador pertenece a otra cuenta.');
    const value = entry.value as HorasDraft, payload = validateHoras(value);
    const records = await getHoras(s, practica.id, signal);
    const found = records.find(r => r.id === (registro?.id ?? `h-${value.solicitudId}`));
    const matches = found && found.horas === payload.horas && found.descripcion === payload.descripcion && found.fecha.slice(0, 10) === value.fecha;
    if (registro) {
      if (!(matches && found.revision === (registro.revision ?? 0) + 1)) await corregirHoras(s, practica, registro, value, signal);
    } else if (found) { if (!matches) throw new ApiError(409, 'La solicitud guardada tiene otros datos. Revisa la bitácora.'); }
    else await registrarHoras(s, practica, value, signal);
  } else if (entry.kind === 'tarea') {
    const { task } = entry.context as { task: Tarea }, value = entry.value;
    const revision = Number(value.revision), replacing = revision >= 0;
    const saved = await getTarea(s, task.aulaId, task.id, signal);
    const matches = saved.entrega && saved.entrega.descripcion === value.descripcion.trim() && saved.entrega.comentario === value.comentario.trim() && saved.entrega.archivoId === (value.archivoId || null) && (!replacing || saved.entrega.revision === revision + 1);
    if (!matches) {
      const response = parseTareaResponse(await request(`/alumno/aulas/${encodeURIComponent(task.aulaId)}/tareas/${encodeURIComponent(task.id)}/entregas`, s.token, { descripcion: value.descripcion.trim(), comentario: value.comentario.trim(), archivoId: value.archivoId || null, ...(replacing ? { revision, motivo: value.motivo.trim() } : {}) }, signal, { method: replacing ? 'PUT' : 'POST', expectedStatus: replacing ? 200 : 201 }), task.aulaId, s.user.id);
      if (!response.entrega || response.entrega.descripcion !== value.descripcion.trim() || response.entrega.comentario !== value.comentario.trim() || response.entrega.archivoId !== (value.archivoId || null) || replacing && response.entrega.revision !== revision + 1) throw new ApiError(502, 'La respuesta no coincide. Se conserva el envío pendiente para consultar su resultado.');
    }
  } else if (entry.kind === 'comunicacion') {
    if (!isCommunicationContext(entry.context)) throw new ApiError(400, 'El destino del borrador no es válido.');
    await sendCommunication(s, entry.context, entry.value, signal);
  } else throw new ApiError(400, 'Este tipo de borrador no se puede enviar.');
  await writeDraft(key, null);
}
export function syncDraft(s: Session, key: string) {
  const flightKey = `${s.user.id}:${key}`;
  const existing = flights.get(flightKey);
  if (existing) return existing;
  const flight = send(s, key).finally(() => flights.delete(flightKey));
  flights.set(flightKey, flight); return flight;
}
export async function syncPendingDrafts(s: Session) {
  const entries = (await listDrafts(s)).filter(e => e.draft.status === 'POR_ENVIAR');
  let sent = 0;
  const failures: string[] = [];
  for (const entry of entries) {
    try { await syncDraft(s, entry.key); sent += 1; }
    catch (e) { if (e instanceof ApiError && e.status === 401) throw e; failures.push(`${entry.draft.title}: ${(e as Error).message}`); }
  }
  return { sent, failures };
}
