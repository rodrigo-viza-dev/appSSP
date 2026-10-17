import { ApiError, request, type Role, type Session } from './api';
import { contentText } from './comunidad';
import type { AulaDocente } from './docencia';
export const roleChoices: { value: Role; label: string }[] = [{ value: 'ALUMNO', label: 'Alumno' }, { value: 'PROFESOR', label: 'Docente' }, { value: 'SUPERVISOR', label: 'Supervisor' }, { value: 'ADMIN', label: 'Administración' }];
export const roleLabel = (role: Role) => roleChoices.find(r => r.value === role)?.label ?? role;
export type UsuarioAdmin = { id: string; nombres: string; apellidos: string; email: string; role: Role; createdAt: string };
export type Matriculas = { aulaId: string; aulaNombre: string; revision: string; alumnos: { alumnoId: string; alumnoNombre: string; email: string; inscrito: boolean }[] };
export type Reporte = { totalAlumnos: number; totalProfesores: number; totalAulas: number; aulasActivas: number; practicasEnCurso: number; practicasCerradas: number; horasPromedio: number | null; aulas: { aulaId: string; aulaNombre: string; periodo: string; profesorNombre: string; estado: 'ACTIVA' | 'CONCLUIDA'; inscritos: number; promedioNotas: number | null; asistenciaPct: number | null }[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const nullable = (v: unknown, max = Infinity) => v === null || finite(v) && v <= max;
function invalid(): never { throw new ApiError(502, 'La respuesta administrativa no es compatible. Consulta los datos actuales.'); }
function admin(s: Session) { if (s.user.role !== 'ADMIN') throw new ApiError(403, 'Sección exclusiva de administración.'); }
function list<T>(v: unknown, parse: (v: unknown) => T): T[] { if (!Array.isArray(v)) invalid(); return v.map(parse); }
function user(v: unknown): UsuarioAdmin {
  if (!object(v) || !text(v.id) || !text(v.nombres) || !text(v.apellidos) || !text(v.email) || !roleChoices.some(r => r.value === v.role) || !text(v.createdAt) || !Number.isFinite(Date.parse(v.createdAt))) invalid();
  return v as UsuarioAdmin;
}
function aula(v: unknown): AulaDocente {
  if (!object(v) || !text(v.id) || !text(v.nombre) || !text(v.codigo) || typeof v.descripcion !== 'string' || !text(v.periodo) || !text(v.profesorId) || !text(v.profesorNombre) || !['ACTIVA', 'CONCLUIDA'].includes(String(v.estado)) || !count(v.inscritos)) invalid();
  return v as AulaDocente;
}
function roster(v: unknown, id: string): Matriculas {
  if (!object(v) || v.aulaId !== id || !text(v.aulaNombre) || !text(v.revision) || !/^[a-f0-9]{64}$/.test(v.revision) || !Array.isArray(v.alumnos) || !v.alumnos.every(a => object(a) && text(a.alumnoId) && text(a.alumnoNombre) && text(a.email) && typeof a.inscrito === 'boolean') || new Set(v.alumnos.map(a => a.alumnoId)).size !== v.alumnos.length) invalid();
  return v as Matriculas;
}
async function capabilities(s: Session, signal: AbortSignal) {
  admin(s);
  const caps = await request<unknown>('/admin/capacidades', s.token, undefined, signal);
  if (!object(caps) || caps.versionAdministracion !== 1) throw new ApiError(502, 'Este servidor todavía no ofrece la administración actualizada.');
}
export async function getAdminData(s: Session, signal: AbortSignal) {
  await capabilities(s, signal);
  const [users, aulas] = await Promise.all([request<unknown>('/admin/usuarios', s.token, undefined, signal), request<unknown>('/admin/aulas', s.token, undefined, signal)]);
  const result = { users: list(users, user), aulas: list(aulas, aula) };
  if (new Set(result.users.map(u => u.id)).size !== result.users.length || new Set(result.aulas.map(a => a.id)).size !== result.aulas.length) invalid();
  return result;
}
export async function getAdminAula(s: Session, id: string, signal: AbortSignal) {
  admin(s);
  const [data, response] = await Promise.all([getAdminData(s, signal), request<unknown>(`/admin/aulas/${encodeURIComponent(id)}/matriculas`, s.token, undefined, signal)]);
  const selected = data.aulas.find(a => a.id === id);
  if (!selected) throw new ApiError(404, 'El aula no está disponible.');
  return { aula: selected, users: data.users, matriculas: roster(response, id) };
}
export function validateAula(v: Record<string, string>, users: UsuarioAdmin[]) {
  contentText(v.nombre, 'Nombre', 200); contentText(v.periodo, 'Periodo', 20);
  if (!/^[A-Za-z0-9-]{2,50}$/.test(v.codigo.trim())) throw new ApiError(400, 'Código: usa entre 2 y 50 letras, números o guiones.');
  if (v.descripcion.trim().length > 4000) throw new ApiError(400, 'La descripción admite hasta 4000 caracteres.');
  if (!users.some(u => u.id === v.profesorId && u.role === 'PROFESOR')) throw new ApiError(400, 'Selecciona un docente responsable.');
}
export async function crearAula(s: Session, users: UsuarioAdmin[], v: Record<string, string>, solicitudId: string, signal: AbortSignal) {
  admin(s); validateAula(v, users);
  const body = { nombre: v.nombre.trim(), codigo: v.codigo.trim().toUpperCase(), periodo: v.periodo.trim(), descripcion: v.descripcion.trim(), profesorId: v.profesorId, solicitudId };
  const saved = aula(await request<unknown>('/admin/aulas', s.token, body, signal, { expectedStatus: 201 }));
  if (saved.nombre !== body.nombre || saved.codigo !== body.codigo || saved.periodo !== body.periodo || saved.descripcion !== body.descripcion || saved.profesorId !== body.profesorId) invalid();
  return saved;
}
export async function cambiarRol(s: Session, selected: UsuarioAdmin, role: string, signal: AbortSignal) {
  admin(s);
  if (selected.id === s.user.id || !roleChoices.some(r => r.value === role) || selected.role === role) throw new ApiError(400, 'Selecciona otro rol para una cuenta diferente de la tuya.');
  const saved = user(await request<unknown>(`/admin/usuarios/${encodeURIComponent(selected.id)}/rol`, s.token, { role, anterior: selected.role }, signal, { method: 'PUT', expectedStatus: 200 }));
  if (saved.id !== selected.id || saved.role !== role) invalid();
  return saved;
}
export async function cambiarEstado(s: Session, selected: AulaDocente, estado: string, signal: AbortSignal) {
  admin(s);
  if (!['ACTIVA', 'CONCLUIDA'].includes(estado) || selected.estado === estado) throw new ApiError(400, 'Selecciona otro estado.');
  const saved = aula(await request<unknown>(`/admin/aulas/${encodeURIComponent(selected.id)}/estado`, s.token, { estado, anterior: selected.estado }, signal, { method: 'PUT', expectedStatus: 200 }));
  if (saved.id !== selected.id || saved.estado !== estado) invalid();
  return saved;
}
export async function asignarDocente(s: Session, selected: AulaDocente, profesorId: string, signal: AbortSignal) {
  admin(s);
  if (!profesorId || profesorId === selected.profesorId) throw new ApiError(400, 'Selecciona otro docente.');
  const saved = aula(await request<unknown>(`/admin/aulas/${encodeURIComponent(selected.id)}/profesor`, s.token, { profesorId, anterior: selected.profesorId }, signal, { method: 'PUT', expectedStatus: 200 }));
  if (saved.id !== selected.id || saved.profesorId !== profesorId) invalid();
  return saved;
}
export async function establecerMatricula(s: Session, selected: Matriculas, alumnoId: string, inscrito: boolean, signal: AbortSignal) {
  admin(s);
  const saved = roster(await request<unknown>(`/admin/aulas/${encodeURIComponent(selected.aulaId)}/matriculas/${encodeURIComponent(alumnoId)}`, s.token, { inscrito, revision: selected.revision }, signal, { method: 'PUT', expectedStatus: 200 }), selected.aulaId);
  if (saved.alumnos.find(a => a.alumnoId === alumnoId)?.inscrito !== inscrito) invalid();
  return saved;
}
export async function getReporte(s: Session, signal: AbortSignal): Promise<Reporte> {
  await capabilities(s, signal);
  const v = await request<unknown>('/admin/reportes', s.token, undefined, signal);
  if (!object(v) || !['totalAlumnos', 'totalProfesores', 'totalAulas', 'aulasActivas', 'practicasEnCurso', 'practicasCerradas'].every(k => count(v[k])) || !nullable(v.horasPromedio) || !Array.isArray(v.aulas) || !v.aulas.every(a => object(a) && text(a.aulaId) && text(a.aulaNombre) && text(a.periodo) && text(a.profesorNombre) && ['ACTIVA', 'CONCLUIDA'].includes(String(a.estado)) && count(a.inscritos) && nullable(a.promedioNotas, 20) && nullable(a.asistenciaPct, 100)) || new Set(v.aulas.map(a => a.aulaId)).size !== v.aulas.length) invalid();
  return v as Reporte;
}
