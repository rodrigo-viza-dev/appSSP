import { API_URL, ApiError, type Session } from './api';
export async function descargarArchivo(s: Session, aulaId: string, id: string) {
  const response = await fetch(`${API_URL}/api/v1/aulas/${encodeURIComponent(aulaId)}/archivos/${encodeURIComponent(id)}/descargar`, { headers: { Authorization: `Bearer ${s.token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new ApiError(response.status, 'No se pudo descargar el documento. Revisa tu conexión y permisos.');
  const filename = response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
  link.href = url; link.download = filename ? decodeURIComponent(filename) : 'documento';
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
