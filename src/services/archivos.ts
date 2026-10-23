import * as DocumentPicker from 'expo-document-picker';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import { API_URL, ApiError, request, type Session } from './api';
export type Archivo = { id: string; aulaId: string; subidoPorId: string; subidoPorNombre: string; nombreOriginal: string; tipoMime: string; tamanio: number; createdAt: string };
export type PickedDocument = DocumentPicker.DocumentPickerAsset;
const configuredLimit=Number(process.env.EXPO_PUBLIC_UPLOAD_MAX_MB||10);
export const FILE_LIMIT_MB=Number.isSafeInteger(configuredLimit)&&configuredLimit>0&&configuredLimit<=10?configuredLimit:10;
export const newOperationId = () => randomUUID();
export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const file = result.assets[0];
  if (!/\.(pdf|docx|zip)$/i.test(file.name) || !file.size || file.size > FILE_LIMIT_MB * 1024 * 1024) throw new ApiError(400, `Elige un PDF, DOCX o ZIP de hasta ${FILE_LIMIT_MB} MB.`);
  return file;
}
export async function getFiles(s: Session, aulaId: string, signal: AbortSignal) {
  const files = await request<Archivo[]>(`/aulas/${encodeURIComponent(aulaId)}/archivos`, s.token, undefined, signal);
  if (!Array.isArray(files) || !files.every(f => typeof f.id === 'string' && f.aulaId === aulaId && typeof f.nombreOriginal === 'string' && typeof f.tamanio === 'number')) throw new ApiError(502, 'No se pudo interpretar la lista de documentos.');
  return files;
}
export async function uploadDocument(s: Session, aulaId: string, file: PickedDocument, operation: string, signal: AbortSignal): Promise<Archivo> {
  const body = new FormData(); body.append('solicitudId', operation);
  if (Platform.OS === 'web') {
    if (!file.file) throw new ApiError(400, 'Vuelve a seleccionar el documento.');
    body.append('file', file.file, file.name);
  } else body.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
  const response = await fetch(`${API_URL}/api/v1/aulas/${encodeURIComponent(aulaId)}/archivos`, { method: 'POST', headers: { Authorization: `Bearer ${s.token}` }, body, signal });
  if (!response.ok) {
    let detail = 'No se pudo confirmar la carga. Reintentar utiliza la misma solicitud.';
    if ([400, 409, 413, 422].includes(response.status)) { try { const data = await response.json(); if (typeof data.detail === 'string') detail = data.detail; } catch {} }
    throw new ApiError(response.status, response.status === 401 ? 'Tu sesión venció. Ingresa nuevamente.' : detail);
  }
  const saved: Archivo = await response.json();
  if (saved.aulaId !== aulaId || saved.subidoPorId !== s.user.id || saved.tamanio !== file.size || saved.nombreOriginal !== file.name) throw new ApiError(502, 'La carga confirmada no coincide. Consulta los documentos guardados.');
  return saved;
}
