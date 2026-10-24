import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, type Session } from '@/services/api';
export type Draft = { version: 1; api: string; userId: string; kind: 'horas' | 'tarea' | 'comunicacion'; resource: string; title: string; context: unknown; value: Record<string, string>; status: 'BORRADOR' | 'POR_ENVIAR'; updatedAt: string };
const prefix = (s: Session) => `ssp.draft.v1:${encodeURIComponent(API_URL)}:${encodeURIComponent(s.user.id)}:`;
export const draftKey = (s: Session, kind: Draft['kind'], resource: string) => `${prefix(s)}${kind}:${encodeURIComponent(resource)}`;
let writes = Promise.resolve();
export function writeDraft(key: string, entry: Draft | null) {
  const next = writes.catch(() => {}).then(() => entry ? AsyncStorage.setItem(key, JSON.stringify(entry)) : AsyncStorage.removeItem(key));
  writes = next; return next;
}
export async function readDraft(s: Session, key: string) {
  await writes.catch(() => {});
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== 'object') throw new Error('Borrador incompatible.');
  const d = v as Draft;
  if (d.version !== 1 || d.api !== API_URL || d.userId !== s.user.id || !['horas', 'tarea', 'comunicacion'].includes(d.kind) || !['BORRADOR', 'POR_ENVIAR'].includes(d.status) || typeof d.resource !== 'string' || typeof d.title !== 'string' || typeof d.updatedAt !== 'string' || !d.value || typeof d.value !== 'object' || Array.isArray(d.value) || !Object.values(d.value).every(v => typeof v === 'string') || draftKey(s, d.kind, d.resource) !== key) throw new Error('Borrador incompatible con esta cuenta o entorno.');
  return d;
}
export async function listDrafts(s: Session) {
  await writes.catch(() => {});
  const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix(s)));
  const entries = await Promise.all(keys.map(async key => ({ key, draft: await readDraft(s, key) })));
  return entries.filter((v): v is { key: string; draft: Draft } => !!v.draft).sort((a, b) => b.draft.updatedAt.localeCompare(a.draft.updatedAt));
}
