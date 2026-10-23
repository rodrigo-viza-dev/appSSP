import { ApiError, request, type Aula, type Session } from './api';
import type { PracticaHoras, RegistroHoras } from './horas';
export type HoursSummary = Record<RegistroHoras['estadoValidacion'], { horas: number; registros: number }>;
export type StudentOverview = { aulas: Aula[]; practica: PracticaHoras | null; resumen: HoursSummary | null; porCorregir: RegistroHoras | null; proximaTarea: { id: string; aulaId: string; titulo: string; aulaNombre: string; fechaLimite: string | null } | null };
export type HoursPage = { practica: PracticaHoras; resumen: HoursSummary; registros: RegistroHoras[]; siguiente: string | null; coincidencias: number };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
function invalid(): never { throw new ApiError(502, 'Los datos del alumno no son compatibles. Actualiza el servidor y vuelve a consultar.'); }
function practice(v: unknown, s: Session): v is PracticaHoras { return object(v) && text(v.id) && v.practicanteId === s.user.id && text(v.practicanteNombre) && text(v.aulaNombre) && text(v.periodo) && count(v.horasAcumuladas) && count(v.horasMinimas) && ['EN_CURSO','LISTA_PARA_CIERRE','CERRADA'].includes(String(v.estado)); }
function summary(v: unknown): v is HoursSummary { return object(v) && ['VALIDADO','PENDIENTE','RECHAZADO'].every(k => object(v[k]) && count(v[k].horas) && count(v[k].registros)); }
function record(v: unknown, id: string): v is RegistroHoras { return object(v) && text(v.id) && v.practicaId === id && text(v.fecha) && Number.isFinite(Date.parse(v.fecha)) && count(v.horas) && v.horas > 0 && text(v.descripcion) && ['PENDIENTE','VALIDADO','RECHAZADO'].includes(String(v.estadoValidacion)) && count(v.revision) && typeof v.observacion === 'string'; }
export async function getStudentOverview(s: Session, signal: AbortSignal): Promise<StudentOverview> {
 const v = await request<unknown>('/alumno/inicio', s.token, undefined, signal);
 if (!object(v) || !Array.isArray(v.aulas) || !v.aulas.every(a => object(a) && ['id','nombre','profesorNombre','ciclo','estado'].every(k => text(a[k]))) || new Set(v.aulas.map(a=>a.id)).size !== v.aulas.length) invalid();
 if (v.practica === null ? v.resumen !== null || v.porCorregir !== null : !practice(v.practica,s) || !summary(v.resumen) || v.practica.horasAcumuladas !== v.resumen.VALIDADO.horas || v.porCorregir !== null && (!record(v.porCorregir,v.practica.id) || v.porCorregir.estadoValidacion !== 'RECHAZADO')) invalid();
 const task = v.proximaTarea;
 if (task !== null && (!object(task) || !['id','aulaId','titulo','aulaNombre'].every(k=>text(task[k])) || task.fechaLimite !== null && (!text(task.fechaLimite) || !Number.isFinite(Date.parse(task.fechaLimite))) || !v.aulas.some(a=>a.id===task.aulaId))) invalid();
 return v as StudentOverview;
}
export async function getHoursPage(s: Session, id: string, signal: AbortSignal, state = '', cursor: string | null = null): Promise<HoursPage> {
 const params = new URLSearchParams({limite:'20'}); if (state) params.set('estado',state); if (cursor) params.set('cursor',cursor);
 const v = await request<unknown>(`/alumno/practicas/${encodeURIComponent(id)}/bitacora?${params}`,s.token,undefined,signal);
 if (!object(v) || !practice(v.practica,s) || v.practica.id !== id || !summary(v.resumen) || !count(v.coincidencias) || !Array.isArray(v.registros) || v.registros.length > 20 || !v.registros.every(r=>record(r,id) && (!state || r.estadoValidacion===state)) || new Set(v.registros.map(r=>r.id)).size !== v.registros.length || v.siguiente !== null && !text(v.siguiente) || v.practica.horasAcumuladas !== v.resumen.VALIDADO.horas) invalid();
 return v as HoursPage;
}
export async function getStudentActivity(s: Session, id: string, activityId: string, signal: AbortSignal) {
 const v = await request<unknown>(`/alumno/practicas/${encodeURIComponent(id)}/actividad/${encodeURIComponent(activityId)}`,s.token,undefined,signal);
 if (!object(v) || !practice(v.practica,s) || v.practica.id!==id || !record(v.registro,id) || v.registro.id!==activityId) invalid();
 return v as {practica: PracticaHoras; registro: RegistroHoras};
}
