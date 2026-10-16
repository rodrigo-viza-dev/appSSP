import { useAuth } from '@/state/auth';
import type { Session } from '@/services/api';
import { useSessionQuery } from './use-session-query';

export function useDocenteQuery<T>(key: string, load: (session: Session, signal: AbortSignal) => Promise<T>, enabled = true) {
  const { session } = useAuth();
  return useSessionQuery(key, load, enabled && (session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN'));
}
