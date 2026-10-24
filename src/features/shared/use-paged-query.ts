import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, type Session } from '@/services/api';
import type { Page } from '@/services/module-pages';
import { useAuth } from '@/state/auth';

type Result<T> = { key: string; session: Session; data: Page<T> | null; error: ApiError | null; loading: boolean; moreError: string };
export function usePagedQuery<T extends { id: string }>(resource: string, load: (s: Session, signal: AbortSignal, cursor?: string | null) => Promise<Page<T>>, enabled: boolean) {
  const { session, signOut } = useAuth();
  const [attempt, setAttempt] = useState(0), [result, setResult] = useState<Result<T> | null>(null);
  const key = JSON.stringify([resource, attempt]), cache = useRef<Result<T> | null>(null), pending = useRef<AbortController | null>(null);
  const current = result?.key === key && result.session === session ? result : null;
  useEffect(() => {
    if (!enabled || !session) return;
    if (cache.current?.key === key && cache.current.session === session) { setResult(cache.current); return; }
    const controller = new AbortController(); pending.current = controller;
    setResult({ key, session, data: null, error: null, loading: true, moreError: '' });
    void load(session, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      const next = { key, session, data, error: null, loading: false, moreError: '' };
      cache.current = next; setResult(next);
    }).catch(reason => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      setResult({ key, session, data: null, error: reason instanceof ApiError ? reason : new ApiError(0, 'No se pudo cargar la información.'), loading: false, moreError: '' });
    }).finally(() => { if (pending.current === controller) pending.current = null; });
    return () => { controller.abort(); pending.current?.abort(); pending.current = null; };
  }, [key, load, enabled, session, signOut]);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [key, enabled, session]);
  function replaceData(update: (previous: Page<T>) => Page<T>) {
    if (!current?.data) return;
    const next = { ...current, data: update(current.data) }; cache.current = next; setResult(next);
  }
  function more() {
    if (!session || !current?.data?.siguiente || pending.current) return;
    const snapshot = current, controller = new AbortController(); pending.current = controller;
    setResult({ ...snapshot, loading: true, moreError: '' });
    void load(session, controller.signal, snapshot.data!.siguiente).then(page => {
      if (controller.signal.aborted) return;
      if (page.siguiente && page.siguiente === snapshot.data!.siguiente) throw new ApiError(502, 'La lista no avanzó. Actualiza la consulta.');
      const seen = new Set(snapshot.data!.items.map(row => row.id));
      const next = { ...snapshot, data: { ...page, items: [...snapshot.data!.items, ...page.items.filter(row => !seen.has(row.id))] }, loading: false, moreError: '' };
      cache.current = next; setResult(next);
    }).catch(reason => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      const next = { ...snapshot, loading: false, moreError: reason instanceof Error ? reason.message : 'No se pudo cargar la página.' };
      cache.current = next; setResult(next);
    }).finally(() => { if (pending.current === controller) pending.current = null; });
  }
  return { data: current?.data ?? null, loading: enabled && (!current || current.loading), error: current?.error ?? null, moreError: current?.moreError ?? '', more, replaceData, retry: useCallback(() => setAttempt(n => n + 1), []) };
}
