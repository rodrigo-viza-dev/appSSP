import { ApiError, API_URL, type Session } from './api';

export async function descargarExpedientePdf(session: Session, id: string, signal: AbortSignal) {
  const response = await fetch(`${API_URL}/api/v1/expedientes/${encodeURIComponent(id)}/pdf`, { headers: { Authorization: `Bearer ${session.token}`, Accept: 'application/pdf' }, signal });
  if (!response.ok) throw new ApiError(response.status, response.status === 401 ? 'Tu sesión venció. Ingresa nuevamente.' : 'No se pudo descargar el expediente.');
  if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new ApiError(502, 'El servidor no devolvió un PDF.');
  const blob = await response.blob();
  if (signal.aborted) return;
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'expediente-practicas.pdf';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
