import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL, isSession, type Session } from '@/services/api';
const key = `ssp.session.${Array.from(API_URL).map(c => c.charCodeAt(0).toString(16)).join('')}`;
let writes = Promise.resolve();
async function readRaw() {
  await writes.catch(() => {});
  return Platform.OS === 'web' ? globalThis.sessionStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key);
}
export async function readToken() {
  const raw = await readRaw();
  if (!raw) return null;
  try { const saved = JSON.parse(raw); return typeof saved.token === 'string' ? saved.token as string : null; } catch { return raw; }
}
export async function readOfflineSession() {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isSession(saved)) return null;
    const payload = saved.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() ? saved : null;
  } catch { return null; }
}
export function storeToken(token: string | null, user?: Session['user']) {
  const value = token && user ? JSON.stringify({ token, user }) : token;
  const next = writes.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') {
      if (value) globalThis.sessionStorage?.setItem(key, value);
      else globalThis.sessionStorage?.removeItem(key);
    } else if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  });
  writes = next; return next;
}
