import { ApiError, request, type Role, type Session } from './api';
import { contentText } from './comunidad';
import type { AulaDocente } from './docencia';
import { page, type Page } from './module-pages';
export const roleChoices: { value: Role; label: string }[] = [{ value: 'ALUMNO', label: 'Alumno' }, { value: 'PROFESOR', label: 'Docente' }, { value: 'SUPERVISOR', label: 'Supervisor' }, { value: 'ADMIN', label: 'Administración' }];
export const roleLabel = (role: Role) => roleChoices.find(r => r.value === role)?.label ?? role;
export type UsuarioAdmin = { id: string; nombres: string; apellidos: string; email: string; role: Role; createdAt: string };
export type AdminUsersPage = Page<UsuarioAdmin> & { totalDocentes: number };
export type AdminAulasPage = Page<AulaDocente> & { aulasActivas: number };
export type Matricula = { id: string; alumnoId: string; alumnoNombre: string; email: string; inscrito: boolean };
export type Matriculas = { revision: string; aulaId: string; aulaNombre: string; items: Matricula[]; total: number; matriculados: number; siguiente: string | null };
export type FilaReporte = { id: string; aulaId: string; aulaNombre: string; periodo: string; profesorNombre: string; estado: 'ACTIVA' | 'CONCLUIDA'; inscritos: number; promedioNotas: number | null; asistenciaPct: number | null };
export type ReporteResumen = { totalAlumnos: number; totalProfesores: number; totalAulas: number; aulasActivas: number; practicasEnCurso: number; practicasCerradas: number; horasPromedio: number | null };
export type ReportePage = Page<FilaReporte> & { resumen: ReporteResumen };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const nullable = (v: unknown, max = Infinity) => v === null || finite(v) && v <= max;
function invalid(): never { throw new ApiError(502, 'La respuesta administrativa no es compatible. Consulta los datos actuales.'); }
function admin(s: Session) { if (s.user.role !== 'ADMIN') throw new ApiError(403, 'Sección exclusiva de administración.'); }
function list<T>(v: unknown, parse: (v: unknown) => T): T[] { if (!Array.isArray(v)) invalid(); return v.map(parse); }
function user(v: unknown): UsuarioAdmin {
  if (!object(v) || !text(v.id) || !text(v.nombres) || typeof v.apellidos !== 'string' || !text(v.email) || !roleChoices.some(r => r.value === v.role) || !text(v.createdAt) || !Number.isFinite(Date.parse(v.createdAt))) invalid();
  return v as UsuarioAdmin;
}
function aula(v: unknown): AulaDocente {
  if (!object(v) || !text(v.id) || !text(v.nombre) || !text(v.codigo) || typeof v.descripcion !== 'string' || !text(v.periodo) || !text(v.profesorId) || !text(v.profesorNombre) || !['ACTIVA', 'CONCLUIDA'].includes(String(v.estado)) || !count(v.inscritos)) invalid();
  return v as AulaDocente;
}
function matricula(v: unknown): Matricula {
  if (!object(v) || !text(v.alumnoId) || !text(v.alumnoNombre) || !text(v.email) || typeof v.inscrito !== 'boolean') invalid();
  return { id: v.alumnoId, alumnoId: v.alumnoId, alumnoNombre: v.alumnoNombre, email: v.email, inscrito: v.inscrito };
}
function roster(v: unknown, id: string): Matriculas {
  if (!object(v) || v.aulaId !== id || !text(v.aulaNombre) || !text(v.revision) || !/^[a-f0-9]{64}$/.test(v.revision) || !count(v.total) || !count(v.matriculados) || !(v.siguiente === null || text(v.siguiente)) || !Array.isArray(v.items) || v.items.length > 40 || v.total < v.items.length) invalid();
  const items = v.items.map(matricula);
  if (new Set(items.map(a => a.alumnoId)).size !== items.length || v.siguiente && !items.length) invalid();
  return { revision: v.revision, aulaId: id, aulaNombre: v.aulaNombre, items, total: v.total, matriculados: v.matriculados, siguiente: v.siguiente as string | null };
}
function fila(v: unknown): FilaReporte {
  if (!object(v) || !text(v.aulaId) || !text(v.aulaNombre) || !text(v.periodo) || !text(v.profesorNombre) || !['ACTIVA', 'CONCLUIDA'].includes(String(v.estado)) || !count(v.inscritos) || !nullable(v.promedioNotas, 20) || !nullable(v.asistenciaPct, 100)) invalid();
  return { ...v, id: v.aulaId } as FilaReporte;
}
function resumen(v: unknown): ReporteResumen {
  if (!object(v) || !['totalAlumnos', 'totalProfesores', 'totalAulas', 'aulasActivas', 'practicasEnCurso', 'practicasCerradas'].every(k => count(v[k])) || !nullable(v.horasPromedio)) invalid();
  return v as ReporteResumen;
}
async function capabilities(s: Session, signal: AbortSignal) {
  admin(s);
  const caps = await request<unknown>('/admin/capacidades', s.token, undefined, signal);
  if (!object(caps) || caps.versionAdministracion !== 1) throw new ApiError(502, 'Este servidor todavía no ofrece la administración actualizada.');
}
async function usersPage(s: Session, rol: string, q: string, limite: number, signal: AbortSignal, cursor?: string | null): Promise<AdminUsersPage> {
  admin(s);
  const query = new URLSearchParams({ limite: String(limite), rol, q: q.trim(), ...(cursor ? { cursor } : {}) });
  const raw = await request<unknown>(`/admin/usuarios/pagina?${query}`, s.token, undefined, signal);
  const result = page(raw, user);
  if (!object(raw) || !count(raw.totalDocentes)) invalid();
  return { ...result, totalDocentes: raw.totalDocentes as number };
}
export const getAdminUsersPage = (s: Session, rol: string, q: string, signal: AbortSignal, cursor?: string | null) => usersPage(s, rol, q, 20, signal, cursor);
export async function getAdminTeachers(s: Session, signal: AbortSignal): Promise<AdminUsersPage> {
  return usersPage(s, 'PROFESOR', '', 40, signal);
}
export async function getAdminAulasPage(s: Session, estado: string, q: string, signal: AbortSignal, cursor?: string | null): Promise<AdminAulasPage> {
  admin(s);
  const query = new URLSearchParams({ limite: '20', estado, q: q.trim(), ...(cursor ? { cursor } : {}) });
  const raw = await request<unknown>(`/admin/aulas/pagina?${query}`, s.token, undefined, signal);
  const result = page(raw, aula);
  if (!object(raw) || !count(raw.aulasActivas)) invalid();
  return { ...result, aulasActivas: raw.aulasActivas as number };
}
export async function getAdminData(s: Session, signal: AbortSignal) {
  await capabilities(s, signal);
  const [users, aulas] = await Promise.all([request<unknown>('/admin/usuarios', s.token, undefined, signal), request<unknown>('/admin/aulas', s.token, undefined, signal)]);
  const result = { users: list(users, user), aulas: list(aulas, aula) };
  if (new Set(result.users.map(u => u.id)).size !== result.users.length || new Set(result.aulas.map(a => a.id)).size !== result.aulas.length) invalid();
  return result;
}
export async function getAdminAula(s: Session, id: string, signal: AbortSignal): Promise<AulaDocente> {
  admin(s);
  return aula(await request<unknown>(`/admin/aulas/${encodeURIComponent(id)}`, s.token, undefined, signal));
}
export async function getMatriculasPage(s: Session, id: string, estado: string, q: string, signal: AbortSignal, cursor?: string | null): Promise<Matriculas> {
  admin(s);
  const query = new URLSearchParams({ limite: '20', estado, q: q.trim(), ...(cursor ? { cursor } : {}) });
  return roster(await request<unknown>(`/admin/aulas/${encodeURIComponent(id)}/matriculas/pagina?${query}`, s.token, undefined, signal), id);
}
export async function getReportePage(s: Session, estado: string, q: string, signal: AbortSignal, cursor?: string | null): Promise<ReportePage> {
  await capabilities(s, signal);
  const query = new URLSearchParams({ limite: '20', estado, q: q.trim(), ...(cursor ? { cursor } : {}) });
  const raw = await request<unknown>(`/admin/reportes/pagina?${query}`, s.token, undefined, signal);
  const result = page(raw, fila);
  if (!object(raw)) invalid();
  return { ...result, resumen: resumen(raw.resumen) };
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
export async function establecerMatricula(s: Session, selected: { aulaId: string; revision: string }, alumnoId: string, inscrito: boolean, signal: AbortSignal) {
  admin(s);
  const saved = await request<unknown>(`/admin/aulas/${encodeURIComponent(selected.aulaId)}/matriculas/${encodeURIComponent(alumnoId)}`, s.token, { inscrito, revision: selected.revision }, signal, { method: 'PUT', expectedStatus: 200 });
  if (!object(saved) || saved.aulaId !== selected.aulaId || !text(saved.revision) || !/^[a-f0-9]{64}$/.test(saved.revision) || !Array.isArray(saved.alumnos)) invalid();
  const row = (saved.alumnos as unknown[]).find(a => object(a) && a.alumnoId === alumnoId);
  if (!object(row) || row.inscrito !== inscrito) invalid();
  return saved;
}
