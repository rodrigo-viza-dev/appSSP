import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { useSessionQuery } from './use-session-query';

export function useStudentQuery<T>(key: string, load: (session: Session, signal: AbortSignal) => Promise<T>, enabled: boolean) {
  const { session } = useAuth();
  return useSessionQuery(key, load, enabled && session?.user.role === 'ALUMNO');
}
