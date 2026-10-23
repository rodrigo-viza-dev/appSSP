export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://back-cs-de-la-com.vercel.app').replace(/\/$/, '');
export const PRESENTATION_VERSION = process.env.EXPO_PUBLIC_PRESENTATION_VERSION || '';
export const IS_LOCAL_API = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/|$)/i.test(API_URL);
export type Role = 'ALUMNO' | 'PROFESOR' | 'ADMIN' | 'SUPERVISOR';
export type Session = { token: string; user: { id: string; nombres: string; apellidos: string; email: string; role: Role } };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; expectedStatus?: number };
export async function request<T>(path: string, token?: string, body?: unknown, signal?: AbortSignal, options?: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, { method: options?.method ?? (body === undefined ? 'GET' : 'POST'), signal: controller.signal,
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) {
      let detail = '';
      if ([400, 404, 409, 413, 422].includes(response.status) || path.startsWith('/auth/') && [401, 403, 428, 503].includes(response.status)) {
        try { const value: unknown = await response.json(); if (value && typeof value === 'object' && 'detail' in value && typeof value.detail === 'string') detail = value.detail.slice(0, 1500); } catch { /* Se conserva el mensaje general si la respuesta no es JSON. */ }
      }
      throw new ApiError(response.status, response.status === 401 ? (path === '/auth/login' ? 'Correo o contraseña incorrectos para este entorno. Revisa la cuenta SSP que estás usando.' : path === '/auth/google' ? detail || 'Google no pudo verificar esta cuenta.' : 'Tu sesión venció. Ingresa nuevamente.') : response.status === 403 ? detail || 'No tienes permiso para esta acción.' : detail || 'El servidor no pudo completar la solicitud. Intenta nuevamente.');
    }
    if (options?.expectedStatus !== undefined && response.status !== options.expectedStatus) throw new ApiError(502, 'El servidor devolvió una respuesta no compatible. Actualiza los datos.');
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, controller.signal.aborted ? 'La solicitud se interrumpió o tardó demasiado.' : 'No se pudo conectar. Revisa tu conexión; en navegador también puede deberse a la configuración del servidor.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<Session>;
  return typeof data.token === 'string' && !!data.token && !!data.user && typeof data.user.id === 'string' && typeof data.user.nombres === 'string' && typeof data.user.apellidos === 'string' && typeof data.user.email === 'string' && ['ALUMNO', 'PROFESOR', 'ADMIN', 'SUPERVISOR'].includes(data.user.role);
}
export type Aula = { id: string; nombre: string; profesorNombre: string; ciclo: string; estado: string };
export type Practica = { id: string; aulaNombre: string; periodo: string; horasAcumuladas: number; horasMinimas: number; estado: string };
export type Dashboard = { kind: 'ALUMNO'; aulas: Aula[]; practica: Practica | null } | { kind: 'PROFESOR' | 'ADMIN' | 'SUPERVISOR'; metrics: { label: string; value: number | null }[] };
export async function getDashboard(session: Session, signal: AbortSignal): Promise<Dashboard> {
  const get = <T,>(path: string) => request<T>(path, session.token, undefined, signal);
  if (session.user.role === 'ALUMNO') {
    const [aulas, practica] = await Promise.all([get<Aula[]>('/alumno/mis-aulas'), get<Practica | null>('/practicas/actual')]);
    return { kind: 'ALUMNO', aulas, practica };
  }
  const config = {
    PROFESOR: { path: '/profesor/resumen', fields: { alumnosActivos: 'Alumnos activos', entregasPendientes: 'Entregas pendientes', asistenciaPromedio: 'Asistencia promedio (%)' } },
    ADMIN: { path: '/admin/resumen', fields: { alumnosMatriculados: 'Alumnos matriculados', profesoresActivos: 'Profesores activos', aulasActivas: 'Aulas activas', centrosDePracticas: 'Centros de prácticas' } },
    SUPERVISOR: { path: '/empresa/resumen', fields: { practicantesActivos: 'Practicantes activos', horasPorValidar: 'Registros por validar', evaluacionesPendientes: 'Evaluaciones pendientes' } },
  }[session.user.role];
  const data = await get<Record<string, number | null>>(config.path);
  return { kind: session.user.role, metrics: Object.entries(config.fields).map(([key, label]) => ({ label, value: data[key] ?? null })) };
}
