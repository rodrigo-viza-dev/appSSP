import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { ApiError, type Session } from '@/services/api';
import { getNotificaciones, markAllNotificacionesRead, markNotificacionRead, type Notificacion } from '@/services/notificaciones';
import { useAuth } from '@/state/auth';

type Mutation = { session: Session | null; target: string | null; error: string; notice: string; busy: boolean };

function useNotificationsState() {
  const { session, signOut } = useAuth();
  const load = useCallback((account: Session, signal: AbortSignal) => getNotificaciones(account, signal), []);
  const query = useSessionQuery('notificaciones', load, true);
  const [mutation, setMutation] = useState<Mutation>({ session: null, target: null, error: '', notice: '', busy: false });
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [session]);
  const currentMutation = mutation.session === session ? mutation : null;

  async function markRead(item?: Notificacion) {
    if (!session || pending.current || query.loading || query.error || !query.data) return;
    const items = query.data;
    if (item?.leida || (!item && !items.some(value => !value.leida))) return;
    if (item && !items.some(value => value.id === item.id)) return;
    const controller = new AbortController();
    pending.current = controller;
    setMutation({ session, target: item?.id ?? null, error: '', notice: '', busy: true });
    try {
      if (item) await markNotificacionRead(session, item, controller.signal);
      else await markAllNotificacionesRead(session, controller.signal);
      if (controller.signal.aborted) return;
      query.setData(items.map(value => !item || value.id === item.id ? { ...value, leida: true } : value));
      setMutation({ session, target: null, error: '', notice: item ? 'Aviso marcado como leído.' : 'Avisos marcados como leídos.', busy: false });
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) { signOut(true); return; }
      const message = reason instanceof ApiError && reason.status === 403 ? reason.message : 'No pudimos confirmar la lectura. Actualiza la bandeja para comprobar el estado.';
      setMutation({ session, target: null, error: message, notice: '', busy: false });
    } finally { if (pending.current === controller) pending.current = null; }
  }
  function refresh() {
    if (pending.current) return;
    setMutation({ session, target: null, error: '', notice: '', busy: false });
    query.retry();
  }
  return {
    items: query.data, loading: query.loading, error: query.error,
    unread: query.data?.filter(item => !item.leida).length ?? null,
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
