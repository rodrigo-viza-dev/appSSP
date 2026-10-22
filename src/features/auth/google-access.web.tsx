import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { typography } from '@/components/ui';
import { useAuth } from '@/state/auth';
type Identity = { initialize: (options: { client_id: string; hd: string; auto_select: boolean; callback: (r: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void; cancel: () => void };
declare global { interface Window { google?: { accounts: { id: Identity } } } }
let scriptPromise: Promise<void> | null = null;
function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { scriptPromise = null; script.remove(); reject(new Error('No se pudo cargar Google.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export function GoogleAccess({ enabled }: { enabled: boolean }) {
  const container = useRef<View>(null), auth = useAuth(), callback = useRef(auth.signInGoogle); callback.current = auth.signInGoogle;
  const [error, setError] = useState('');
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  useEffect(() => {
    if (!enabled || !clientId) return;
    let alive = true;
    void loadGoogle().then(() => {
      if (!alive || !container.current) return;
      const identity = window.google!.accounts.id;
      identity.initialize({ client_id: clientId, hd: 'unsa.edu.pe', auto_select: false, callback: r => { if (alive) void callback.current(r.credential); } });
      identity.renderButton(container.current as unknown as HTMLElement, { theme: 'outline', size: 'large', text: 'continue_with', locale: 'es', width: 300 });
    }).catch(() => { if (alive) setError('No se pudo cargar Google. Puedes usar tu cuenta SSP.'); });
    return () => { alive = false; window.google?.accounts.id.cancel(); };
  }, [enabled, clientId]);
  return <View style={{ gap: 8 }}>{enabled && clientId ? <View ref={container} style={{ minHeight: 44, pointerEvents: auth.busy ? 'none' : 'auto' }} /> : <Text style={typography.body}>El ingreso con Google aún no está habilitado. Puedes ingresar con tu cuenta SSP.</Text>}
    {!!error && <Text accessibilityRole="alert" style={typography.error}>{error}</Text>}
  </View>;
}
