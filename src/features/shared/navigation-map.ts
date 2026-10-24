import type { Href } from 'expo-router';
import type { Role } from '@/services/api';

export type StaffRole = Exclude<Role, 'ALUMNO'>;
const studentMain: Record<string, string> = { '/panel': 'inicio', '/mis-horas': 'bitacora', '/mis-avisos': 'avisos' };
const studentDetails = new Set(['aula', 'tarea', 'entrega', 'centro', 'borradores', 'expedientes', 'expediente', 'metas', 'comunidad', 'foro', 'anuncio', 'documentos', 'mensajes', 'conversacion', 'guia', 'actividad', 'registrar', 'cuenta', 'aviso']);
const commonStaff = ['expedientes', 'expediente', 'metas', 'guia', 'cuenta', 'mis-avisos'];
const teaching = ['docencia', 'aula-docente', 'tareas-docente', 'revisar-entrega', 'asistencia-docente', 'seguimiento', 'comunidad', 'foro', 'documentos'];
export const staffViews: Record<StaffRole, readonly string[]> = {
  PROFESOR: [...commonStaff, ...teaching, 'mensajes', 'conversacion'],
  SUPERVISOR: [...commonStaff, 'mis-horas'],
  ADMIN: [...commonStaff, ...teaching, 'administracion', 'administrar-aula', 'asignaciones', 'auditoria', 'reportes'],
};
export const staffLabels: Record<StaffRole, { role: string; work: string; review: string }> = {
  PROFESOR: { role: 'Docente', work: 'Aulas', review: 'Seguimiento' },
  SUPERVISOR: { role: 'Supervisor', work: 'Practicantes', review: 'Horas' },
  ADMIN: { role: 'Administración', work: 'Gestión', review: 'Reportes' },
};
export function isStaff(role: Role | undefined): role is StaffRole { return role === 'PROFESOR' || role === 'SUPERVISOR' || role === 'ADMIN'; }
export function staffAllows(role: Role | undefined, view: string) { return isStaff(role) && staffViews[role].includes(view); }
function defaultStaffTab(role: StaffRole, name: string) {
  if (['docencia', 'aula-docente', 'tareas-docente', 'revisar-entrega', 'asistencia-docente', 'comunidad', 'foro', 'documentos', 'administracion', 'administrar-aula', 'asignaciones', 'auditoria'].includes(name)) return 'trabajo';
  if (name === 'seguimiento' || name === 'mis-horas' || name === 'reportes') return 'revision';
  if (name === 'expediente' || name === 'expedientes') return role === 'SUPERVISOR' ? 'trabajo' : 'revision';
  return 'mas';
}
export function mapAppHref(role: Role | undefined, pathname: string, href: Href): Href {
  const path = typeof href === 'string' ? href : href.pathname;
  if (!path) return href;
  const key = path.split('?')[0];
  const rewrite = (next: string): Href => (typeof href === 'string' ? `${next}${path.includes('?') ? '?' + path.split('?').slice(1).join('?') : ''}` : { ...href, pathname: next }) as Href;
  if (role === 'ALUMNO') {
    if (studentMain[key]) return rewrite('/alumno/' + studentMain[key]);
    const name = key.slice(1);
    if (!studentDetails.has(name)) return href;
    const active = pathname.match(/^\/alumno\/(inicio|bitacora|aulas|avisos|mas)(?:\/|$)/)?.[1];
    const tab = active ?? (['aula', 'tarea', 'documentos', 'comunidad', 'foro', 'anuncio'].includes(name) ? 'aulas' : 'mas');
    return rewrite(`/alumno/${tab}/${name}`);
  }
  if (!isStaff(role)) return href;
  const name = key.slice(1), active = pathname.match(/^\/equipo\/(inicio|trabajo|revision|avisos|mas)(?:\/|$)/)?.[1];
  const hasParams = typeof href === 'string' ? path.includes('?') : Object.keys(href.params ?? {}).length > 0;
  const main: Record<string, string> = { '/panel': 'inicio', '/mis-avisos': 'avisos', ...(role === 'PROFESOR' ? { '/docencia': 'trabajo' } : {}), ...(role === 'ADMIN' ? { '/reportes': 'revision' } : {}), ...(role === 'SUPERVISOR' && !hasParams ? { '/mis-horas': 'revision' } : {}) };
  if (main[key]) return rewrite('/equipo/' + main[key]);
  if (!staffAllows(role, name)) return href;
  return rewrite(`/equipo/${active ?? defaultStaffTab(role, name)}/${name}`);
}
