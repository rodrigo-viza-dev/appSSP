import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { API_URL, ApiError, type Session } from './api';
export async function descargarArchivo(s: Session, aulaId: string, id: string) {
  if (!await isAvailableAsync()) throw new ApiError(0, 'El dispositivo no permite guardar o compartir documentos.');
  const response = await fetch(`${API_URL}/api/v1/aulas/${encodeURIComponent(aulaId)}/archivos/${encodeURIComponent(id)}/descargar`, { headers: { Authorization: `Bearer ${s.token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new ApiError(response.status, 'No se pudo descargar el documento. Revisa tu conexión y permisos.');
  const mime = response.headers.get('Content-Type')?.split(';')[0] ?? 'application/octet-stream';
  const extension = mime === 'application/pdf' ? 'pdf' : mime.includes('wordprocessingml') ? 'docx' : 'zip';
  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File(Paths.cache, `documento-${Date.now()}.${extension}`);
  try { file.write(bytes); await shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Guardar documento de PrácticasCC' }); }
  finally { if (file.exists) file.delete(); }
}
