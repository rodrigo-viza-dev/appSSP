import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { ApiError, API_URL, type Session } from './api';

export async function descargarExpedientePdf(session: Session, id: string, signal: AbortSignal) {
  if (!await isAvailableAsync()) throw new ApiError(0, 'Este dispositivo no permite guardar o compartir el documento desde la app.');
  const response = await fetch(`${API_URL}/api/v1/expedientes/${encodeURIComponent(id)}/pdf`, { headers: { Authorization: `Bearer ${session.token}`, Accept: 'application/pdf' }, signal });
  if (!response.ok) throw new ApiError(response.status, response.status === 401 ? 'Tu sesión venció. Ingresa nuevamente.' : 'No se pudo descargar el expediente.');
  if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new ApiError(502, 'El servidor no devolvió un PDF.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (signal.aborted) return;
  const file = new File(Paths.cache, `expediente-${Date.now()}.pdf`);
  try {
    file.write(bytes);
    await shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Guardar expediente de prácticas' });
  } finally { if (file.exists) file.delete(); }
}
