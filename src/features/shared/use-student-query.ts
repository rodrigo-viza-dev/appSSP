import { useCallback, useEffect, useState } from 'react';
import { ApiError, type Session } from '@/services/api';
import { useAuth } from '@/state/auth';

type Query<T> = { key: string; session: Session | null; data: T | null; error: ApiError | null; loading: boolean };

export function useStudentQuery<T>(key: string, load: (session: Session, signal: AbortSignal) => Promise<T>, enabled: boolean) {
  const { session, signOut } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState<Query<T>>({ key: '', session: null, data: null, error: null, loading: false });
  const active = enabled && session?.user.role === 'ALUMNO';

  useEffect(() => {
    if (!active || !session) return;
    const controller = new AbortController();
    setQuery({ key, session, data: null, error: null, loading: true });
    load(session, controller.signal).then(data => {
      if (!controller.signal.aborted) setQuery({ key, session, data, error: null, loading: false });
    }).catch(reason => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      const error = reason instanceof ApiError ? reason : new ApiError(0, 'No se pudo cargar la información. Intenta nuevamente.');
      setQuery({ key, session, data: null, error, loading: false });
    });
    return () => controller.abort();
  }, [key, load, active, session, signOut, attempt]);

  const current = active && query.key === key && query.session === session;
  const setData = useCallback((data: T) => {
    if (active && session) setQuery({ key, session, data, error: null, loading: false });
  }, [active, key, session]);
  return {
    data: current ? query.data : null,
    error: current ? query.error : null,
    loading: active && (!current || query.loading),
    retry: () => setAttempt(value => value + 1),
    setData,
  };
}
