import { ApiError, request, type Session } from './api';
import { contentText } from './comunidad';

export const metaKinds = [{ value: 'ARTICULOS', label: 'Artículos' }, { value: 'NOTAS_PERIODISTICAS', label: 'Notas periodísticas' }, { value: 'NOTAS_PRENSA', label: 'Notas de prensa' }, { value: 'HORAS', label: 'Horas validadas' }];
export type PracticaMetas = { id: string; practicanteId: string; practicanteNombre: string; aulaNombre: string; periodo: string; estado: 'EN_CURSO' | 'LISTA_PARA_CIERRE' | 'CERRADA' };
export type Meta = { id: string; practicaId: string; practicanteId: string; practicanteNombre: string; tipo: string; cantidadObjetivo: number; cantidadAlcanzada: number; descripcion: string | null; creadoPor: string; fechaCreacion: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function invalid(): never { throw new ApiError(502, 'Las metas del servidor no son compatibles. Actualiza la consulta.'); }
function parse(v: unknown, practica: PracticaMetas): Meta {
  if (!object(v) || !text(v.id) || v.practicaId !== practica.id || v.practicanteId !== practica.practicanteId || !text(v.practicanteNombre) || !metaKinds.some(k => k.value === v.tipo) || !count(v.cantidadObjetivo) || v.cantidadObjetivo === 0 || !count(v.cantidadAlcanzada) || !(v.descripcion === null || typeof v.descripcion === 'string') || !text(v.creadoPor) || !text(v.fechaCreacion) || !Number.isFinite(Date.parse(v.fechaCreacion))) invalid();
  return v as Meta;
}
export function metaQuantity(value: string, positive = false): number {
  if (!/^\d{1,7}$/.test(value.trim()) || Number(value) > 1000000 || Number(value) < (positive ? 1 : 0)) throw new ApiError(400, `Escribe una cantidad entera entre ${positive ? 1 : 0} y 1000000.`);
  return Number(value);
}
export async function getPracticasMetas(s: Session, signal: AbortSignal): Promise<PracticaMetas[]> {
  const caps = await request<unknown>('/metas/capacidades', s.token, undefined, signal);
  if (!object(caps) || caps.versionMetas !== 1 || caps.avanceTotal !== true) throw new ApiError(502, 'Este servidor todavía no ofrece el seguimiento de metas actualizado.');
  const values = await request<unknown>('/practicas', s.token, undefined, signal);
  if (!Array.isArray(values) || !values.every(v => object(v) && text(v.id) && text(v.practicanteId) && text(v.practicanteNombre) && text(v.aulaNombre) && text(v.periodo) && ['EN_CURSO', 'LISTA_PARA_CIERRE', 'CERRADA'].includes(String(v.estado)) && (s.user.role !== 'ALUMNO' || v.practicanteId === s.user.id)) || new Set(values.map(v => v.id)).size !== values.length) invalid();
  return values as PracticaMetas[];
}
export async function getMetas(s: Session, practica: PracticaMetas, signal: AbortSignal): Promise<Meta[]> {
  const values = await request<unknown>(`/metas/practica/${encodeURIComponent(practica.id)}`, s.token, undefined, signal);
  if (!Array.isArray(values)) invalid();
  const rows = values.map(v => parse(v, practica));
  if (new Set(rows.map(r => r.id)).size !== rows.length) invalid();
  return rows;
}
function editor(s: Session, p: PracticaMetas) {
  if (!['PROFESOR', 'ADMIN'].includes(s.user.role)) throw new ApiError(403, 'Solo docencia y administración gestiona metas.');
  if (p.estado === 'CERRADA') throw new ApiError(409, 'La práctica está cerrada.');
}
export function validateMeta(v: Record<string, string>) {
  if (!metaKinds.some(k => k.value === v.tipo)) throw new ApiError(400, 'Selecciona un tipo de meta.');
  metaQuantity(v.objetivo, true);
  if (v.descripcion.trim()) contentText(v.descripcion, 'Descripción', 2000);
}
export async function crearMeta(s: Session, practica: PracticaMetas, v: Record<string, string>, solicitudId: string, signal: AbortSignal) {
  editor(s, practica); validateMeta(v);
  const body = { tipo: v.tipo, cantidadObjetivo: metaQuantity(v.objetivo, true), descripcion: v.descripcion.trim() || null, solicitudId };
  const saved = parse(await request<unknown>(`/metas/practica/${encodeURIComponent(practica.id)}`, s.token, body, signal, { expectedStatus: 201 }), practica);
  if (saved.tipo !== body.tipo || saved.cantidadObjetivo !== body.cantidadObjetivo || saved.descripcion !== body.descripcion) invalid();
  return saved;
}
export async function guardarAvanceMeta(s: Session, practica: PracticaMetas, meta: Meta, v: Record<string, string>, signal: AbortSignal) {
  editor(s, practica);
  if (meta.tipo === 'HORAS') throw new ApiError(409, 'Las metas de horas se calculan desde las horas validadas.');
  const { cantidad, motivo } = validateAvanceMeta(meta, v);
  const saved = parse(await request<unknown>(`/metas/${encodeURIComponent(meta.id)}/avance-total`, s.token, { cantidad, anterior: meta.cantidadAlcanzada, motivo }, signal, { method: 'PUT', expectedStatus: 200 }), practica);
  if (saved.id !== meta.id || saved.cantidadAlcanzada !== cantidad || saved.cantidadObjetivo !== meta.cantidadObjetivo || saved.tipo !== meta.tipo) invalid();
  return saved;
}
export function validateAvanceMeta(meta: Meta, v: Record<string, string>) {
  const cantidad = metaQuantity(v.cantidad), motivo = contentText(v.motivo, 'Producción revisada', 2000);
  if (cantidad === meta.cantidadAlcanzada) throw new ApiError(400, 'Modifica el total alcanzado antes de guardar la revisión.');
  return { cantidad, motivo };
}
