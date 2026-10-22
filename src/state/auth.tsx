import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ApiError, isSession, request, type Session } from '@/services/api';
import { readToken, readOfflineSession, storeToken } from '@/storage/session';
function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState(true), [restoreError, setRestoreError] = useState('');
  const [offline, setOffline] = useState(false);
  const [googleLinkRequired, setGoogleLinkRequired] = useState(false);
  const googleCredential = useRef<string | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const restore = useCallback(async () => {
    const version = ++generation.current;
    setRestoring(true); setRestoreError('');
    try {
      const token = await readToken();
      if (!token) return;
      const user = await request<Session['user']>('/auth/me', token);
      const result = { token, user };
      if (!isSession(result)) throw new ApiError(502, 'El servidor no permite restaurar esta sesión.');
      if (version === generation.current) { setSession(result); setOffline(false); await storeToken(token, user).catch(() => setMessage('No se pudo actualizar la sesión guardada.')); }
    } catch (error) {
      if (version !== generation.current) return;
      if (error instanceof ApiError && error.status === 401) { await storeToken(null); setMessage('Tu sesión venció. Ingresa nuevamente.'); }
      else if (error instanceof ApiError && error.status === 0) {
        const cached = await readOfflineSession();
        if (version !== generation.current) return;
        if (cached) { setSession(cached); setOffline(true); }
        else setRestoreError('No pudimos comprobar tu sesión. Revisa la conexión y vuelve a intentar.');
      } else setRestoreError('No pudimos comprobar tu sesión. Revisa la conexión y vuelve a intentar.');
    } finally { if (version === generation.current) setRestoring(false); }
  }, []);
  useEffect(() => { void restore(); return () => { generation.current += 1; }; }, [restore]);
  async function authenticate(path: string, body: unknown) {
    if (pending.current) return;
    const version = ++generation.current;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = await request<unknown>(path, undefined, body);
      if (!isSession(result)) throw new Error('El servidor devolvió una sesión no compatible.');
      if (version !== generation.current) return;
      try { await storeToken(result.token, result.user); } catch { setMessage('La sesión estará disponible mientras mantengas abierta la app.'); }
      if (version === generation.current) { setSession(result); setOffline(false); setRestoreError(''); googleCredential.current = null; setGoogleLinkRequired(false); }
    } catch (error) { if (path === '/auth/google' && error instanceof ApiError && error.status === 428) setGoogleLinkRequired(true); setMessage(error instanceof Error ? error.message : 'No se pudo ingresar.'); }
    finally { pending.current = false; setBusy(false); }
  }
  const signIn = (email: string, password: string) => authenticate('/auth/login', { email: email.trim().toLowerCase(), password });
  const signInGoogle = (idToken: string) => { googleCredential.current = idToken; return authenticate('/auth/google', { idToken }); };
  const linkGoogle = (passwordSsp: string) => googleCredential.current ? authenticate('/auth/google', { idToken: googleCredential.current, passwordSsp }) : Promise.resolve();
  const cancelGoogleLink = () => { googleCredential.current = null; setGoogleLinkRequired(false); setMessage(''); };
  const signOut = useCallback((expired = false) => {
    generation.current += 1; setSession(null); setRestoring(false); setRestoreError(''); setOffline(false);
    googleCredential.current = null; setGoogleLinkRequired(false);
    setMessage(expired ? 'Tu sesión venció. Ingresa nuevamente.' : '');
    void storeToken(null).catch(() => setMessage('No se pudo borrar la sesión guardada. Vuelve a intentar cerrar sesión.'));
  }, []);
  return { session, busy, message, restoring, restoreError, restore, offline, googleLinkRequired, linkGoogle, cancelGoogleLink, signIn, signInGoogle, signOut };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: PropsWithChildren) { const state = useAuthState(); return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>; }
export function useAuth() { const state = useContext(AuthContext); if (!state) throw new Error('AuthProvider requerido'); return state; }
