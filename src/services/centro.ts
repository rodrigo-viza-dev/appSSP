import { ApiError, request, type Session } from './api';

export type CentroDraft = { razonSocial: string; ruc: string; direccion: string; sector: string; telefono: string; email: string };
export type Centro = CentroDraft & { id: string; practicanteId: string; fechaRegistro: string };
export type SupervisorDraft = { nombres: string; apellidos: string; cargo: string; email: string; telefono: string };
export type Supervisor = SupervisorDraft & { id: string; empresaId: string; userId?: string | null };

const text = (value: unknown): value is string => typeof value === 'string';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const clean = (value: unknown) => text(value) ? value.trim() : '';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function alumno(session: Session) {
  if (session.user.role !== 'ALUMNO') throw new ApiError(403, 'Esta sección está disponible para alumnos.');
}
function required(value: string, label: string, max = 160) {
  if (!value) throw new ApiError(400, `Completa ${label}.`);
  if (value.length > max) throw new ApiError(400, `${label} supera los ${max} caracteres permitidos.`);
}
function contact(email: string, telefono: string) {
  if (!emailPattern.test(email) || email.length > 254) throw new ApiError(400, 'Ingresa un correo de contacto válido.');
  const digits = telefono.replace(/\D/g, '').length;
  if (!/^\+?[\d\s().-]+$/.test(telefono) || digits < 7 || digits > 15 || telefono.length > 25) {
    throw new ApiError(400, 'Ingresa un teléfono de contacto válido, con 7 a 15 dígitos.');
  }
}
export function validateCentro(value: CentroDraft): CentroDraft {
  const data = {
    razonSocial: clean(value?.razonSocial), ruc: clean(value?.ruc), direccion: clean(value?.direccion),
    sector: clean(value?.sector), telefono: clean(value?.telefono), email: clean(value?.email).toLowerCase(),
  };
  required(data.razonSocial, 'la razón social');
  if (!/^\d{11}$/.test(data.ruc)) throw new ApiError(400, 'El RUC debe tener 11 dígitos.');
  required(data.direccion, 'la dirección', 240);
  required(data.sector, 'el sector', 100);
  contact(data.email, data.telefono);
  return data;
}
export function validateSupervisor(value: SupervisorDraft): SupervisorDraft {
  const data = {
    nombres: clean(value?.nombres), apellidos: clean(value?.apellidos), cargo: clean(value?.cargo),
    email: clean(value?.email).toLowerCase(), telefono: clean(value?.telefono),
  };
  required(data.nombres, 'los nombres'); required(data.apellidos, 'los apellidos'); required(data.cargo, 'el cargo', 100);
  contact(data.email, data.telefono);
  return data;
}
function centroResponse(value: unknown, session: Session): Centro {
  if (!object(value) || !text(value.id) || !value.id.trim() || value.practicanteId !== session.user.id ||
    !['razonSocial', 'ruc', 'direccion', 'sector', 'telefono', 'email', 'fechaRegistro'].every(key => text(value[key]))) {
    throw new ApiError(502, 'No pudimos interpretar la ficha del centro. Actualiza la información.');
  }
  return value as Centro;
}
function supervisorResponse(value: unknown, centro: Centro): Supervisor {
  if (!object(value) || !text(value.id) || !value.id.trim() || value.empresaId !== centro.id ||
    !(value.userId == null || text(value.userId)) ||
    !['nombres', 'apellidos', 'cargo', 'email', 'telefono'].every(key => text(value[key]))) {
    throw new ApiError(502, 'No pudimos interpretar los datos del supervisor. Actualiza la información.');
  }
  return value as Supervisor;
}
function supervisorPath(session: Session, centro: Centro) {
  alumno(session);
  if (centro.practicanteId !== session.user.id || !centro.id.trim()) throw new ApiError(403, 'No tienes permiso para consultar este centro.');
  return `/empresa/${encodeURIComponent(centro.id)}/supervisor`;
}
function registrationError(error: unknown): never {
  if (error instanceof ApiError && error.status === 409) throw new ApiError(409, 'Ya existe un registro. Consulta tu ficha para ver los datos guardados.');
  if (error instanceof ApiError && [400, 422].includes(error.status)) throw new ApiError(error.status, 'El servidor rechazó los datos. Revísalos antes de confirmar nuevamente.');
  throw error;
}

export async function getCentro(session: Session, signal: AbortSignal): Promise<Centro | null> {
  alumno(session);
  const data = await request<unknown>('/empresa/mine', session.token, undefined, signal);
  return data === null ? null : centroResponse(data, session);
}
export async function registerCentro(session: Session, value: CentroDraft, signal: AbortSignal): Promise<Centro> {
  alumno(session);
  const payload = validateCentro(value);
  try { return centroResponse(await request<unknown>('/empresa', session.token, payload, signal), session); }
  catch (error) { return registrationError(error); }
}
export async function getSupervisor(session: Session, centro: Centro, signal: AbortSignal): Promise<Supervisor | null> {
  const data = await request<unknown>(supervisorPath(session, centro), session.token, undefined, signal);
  return data === null ? null : supervisorResponse(data, centro);
}
export async function registerSupervisor(session: Session, centro: Centro, value: SupervisorDraft, signal: AbortSignal): Promise<Supervisor> {
  const path = supervisorPath(session, centro);
  const payload = validateSupervisor(value);
  try { return supervisorResponse(await request<unknown>(path, session.token, payload, signal), centro); }
  catch (error) { return registrationError(error); }
}
