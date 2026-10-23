import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { ApiError, type Session } from '@/services/api';
import { getNoticePage, markAllNotificacionesRead, markNotificacionRead, type Notificacion, type NoticeFilter } from '@/services/notificaciones';
import { useAuth } from '@/state/auth';

type Mutation = { session: Session | null; target: string | null; error: string; notice: string; busy: boolean };
type More = { session: Session | null; filter: NoticeFilter; loading: boolean; error: string };

function useNotificationsState() {
  const { session, signOut } = useAuth();
  const [selection, setSelection] = useState<{ session: Session | null; value: NoticeFilter }>({ session: null, value: 'todos' });
  const filter = selection.session === session ? selection.value : 'todos';
  const load = useCallback((account: Session, signal: AbortSignal) => getNoticePage(account, signal, filter), [filter]);
  const query = useSessionQuery('notificaciones:' + filter, load, true);
  const [lastCount, setLastCount] = useState<{ session: Session | null; unread: number }>({ session: null, unread: 0 });
  useEffect(() => { if (query.data) setLastCount({ session, unread: query.data.sinLeer }); }, [session, query.data]);
  const [mutation, setMutation] = useState<Mutation>({ session: null, target: null, error: '', notice: '', busy: false });
  const [more, setMore] = useState<More>({ session: null, filter: 'todos', loading: false, error: '' });
  const pending = useRef<AbortController | null>(null), pendingMore = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [session]);
  useEffect(() => () => { pendingMore.current?.abort(); pendingMore.current = null; }, [session, filter]);
  const currentMutation = mutation.session === session ? mutation : null;
  const currentMore = more.session === session && more.filter === filter ? more : null;
  const unread = query.data?.sinLeer ?? (lastCount.session === session ? lastCount.unread : null);

  async function markRead(item?: Notificacion): Promise<boolean> {
    if (!session || pending.current || pendingMore.current || query.loading || query.error || !query.data) return false;
    const snapshot = query.data;
    const known = item && snapshot.items.find(value => value.id === item.id);
    if (item && item.userId !== session.user.id) return false;
    if (item?.leida || known?.leida || (!item && snapshot.sinLeer === 0)) return true;
    const controller = new AbortController();
    pending.current = controller;
    setMutation({ session, target: item?.id ?? null, error: '', notice: '', busy: true });
    try {
      if (item) await markNotificacionRead(session, item, controller.signal);
      else await markAllNotificacionesRead(session, controller.signal);
      if (controller.signal.aborted) return false;
      const rows = snapshot.items.map(value => !item || value.id === item.id ? { ...value, leida: true } : value);
      const removed = filter === 'pendientes' ? (item ? (known ? 1 : 0) : snapshot.total) : 0;
      query.setData({
        ...snapshot,
        items: filter === 'pendientes' ? rows.filter(value => !value.leida) : rows,
        total: Math.max(0, snapshot.total - removed),
        sinLeer: item ? Math.max(0, snapshot.sinLeer - 1) : 0,
        siguiente: !item && filter === 'pendientes' ? null : snapshot.siguiente,
      });
      if (!item && filter === 'leidos') query.retry();
      setMutation({ session, target: null, error: '', notice: item ? 'Aviso marcado como leído.' : 'Avisos marcados como leídos.', busy: false });
      return true;
    } catch (reason) {
      if (controller.signal.aborted) return false;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return false; }
      const message = reason instanceof ApiError && [403,404].includes(reason.status) ? reason.message : 'No pudimos confirmar la lectura. Actualiza la bandeja para comprobar el estado.';
      setMutation({ session, target: null, error: message, notice: '', busy: false });
      return false;
    } finally { if (pending.current === controller) pending.current = null; }
  }

  function loadMore() {
    if (!session || !query.data?.siguiente || query.loading || pending.current || pendingMore.current) return;
    const snapshot = query.data, controller = new AbortController();
    pendingMore.current = controller;
    setMore({ session, filter, loading: true, error: '' });
    void getNoticePage(session, controller.signal, filter, snapshot.siguiente).then(next => {
      if (controller.signal.aborted) return;
      if (next.siguiente && next.siguiente === snapshot.siguiente) throw new ApiError(502, 'La bandeja no avanzó. Actualiza tus avisos.');
      query.setData({ ...next, items: [...snapshot.items, ...next.items.filter(value => !snapshot.items.some(old => old.id === value.id))] });
      setMore({ session, filter, loading: false, error: '' });
    }).catch(reason => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      setMore({ session, filter, loading: false, error: reason instanceof Error ? reason.message : 'No se pudieron cargar los avisos anteriores.' });
    }).finally(() => { if (pendingMore.current === controller) pendingMore.current = null; });
  }
  function refresh() {
    if (pending.current || pendingMore.current) return;
    setMutation({ session, target: null, error: '', notice: '', busy: false });
    setMore({ session, filter, loading: false, error: '' });
    query.retry();
  }
  function setFilter(value: NoticeFilter) {
    if (pending.current || pendingMore.current) return;
    setSelection({ session, value });
  }
  return {
    items: query.data?.items ?? null, loading: query.loading, error: query.error,
    unread, filter, setFilter, total: query.data?.total ?? 0, hasMore: !!query.data?.siguiente,
    loadingMore: currentMore?.loading ?? false, moreError: currentMore?.error ?? '', loadMore,
    busy: currentMutation?.busy ?? false, target: currentMutation?.target ?? null,
    mutationError: currentMutation?.error ?? '', notice: currentMutation?.notice ?? '', markRead, refresh,
  };
}
const NotificationsContext = createContext<ReturnType<typeof useNotificationsState> | null>(null);
export function NotificationsProvider({ children }: PropsWithChildren) {
  const state = useNotificationsState();
  return <NotificationsContext.Provider value={state}>{children}</NotificationsContext.Provider>;
}
export function useNotifications() {
  const state = useContext(NotificationsContext);
  if (!state) throw new Error('NotificationsProvider requerido');
  return state;
}
