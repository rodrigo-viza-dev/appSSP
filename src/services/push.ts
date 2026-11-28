import { Platform } from 'react-native';
import { ApiError, request, type Session } from './api';

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';
const supported = () => Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function key(base64: string) {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
async function capabilities(signal?: AbortSignal) {
  const caps = await request<{ web?: boolean; clave?: string | null }>('/push/capacidades', undefined, undefined, signal).catch(() => null);
  return caps?.web && typeof caps.clave === 'string' ? caps.clave : null;
}
/** Estado de las notificaciones push en este navegador. iPhone solo las admite con la web añadida a la pantalla de inicio. */
export async function getPushState(signal?: AbortSignal): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (!await capabilities(signal)) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration && await registration.pushManager.getSubscription() ? 'on' : 'off';
}
export async function enablePush(s: Session): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const publicKey = await capabilities();
  if (!publicKey) return 'unavailable';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(publicKey) });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new ApiError(502, 'El navegador no entregó una suscripción válida.');
  await request('/push/suscripciones', s.token, { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }, undefined, { expectedStatus: 201 });
  return 'on';
}
export async function disablePush(s: Session): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (subscription) {
    await request('/push/suscripciones/baja', s.token, { endpoint: subscription.endpoint }).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return 'off';
}
