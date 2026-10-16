import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from 'react';
import { isSession, request, type Session } from '@/services/api';
function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  async function signIn(email: string, password: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = await request<unknown>('/auth/login', undefined, { email: email.trim().toLowerCase(), password });
      if (!isSession(result)) throw new Error('El servidor devolvió una sesión no compatible.');
      setSession(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo ingresar.'); }
    finally { pending.current = false; setBusy(false); }
  }
  const signOut = useCallback((expired = false) => { setSession(null); setMessage(expired ? 'Tu sesión venció. Ingresa nuevamente.' : ''); }, []);
  return { session, busy, message, signIn, signOut };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: PropsWithChildren) { const state = useAuthState(); return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>; }
export function useAuth() { const state = useContext(AuthContext); if (!state) throw new Error('AuthProvider requerido'); return state; }
