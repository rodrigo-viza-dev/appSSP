import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '@/services/api';
import { useAuth } from '@/state/auth';
import { draftKey, readDraft, writeDraft, type Draft } from '@/storage/drafts';
export function useDraft<T extends Record<string, string>>(kind: Draft['kind'], resource: string, title: string, context: unknown, initial: T) {
  const { session } = useAuth();
  const [value, setValue] = useState<T>(initial), [ready, setReady] = useState(false), [notice, setNotice] = useState('');
  const current = useRef(value), details = useRef({ title, context }), alive = useRef(true);
  details.current = { title, context };
  const key = session ? draftKey(session, kind, resource) : '';
  useEffect(() => {
    let active = true; alive.current = true; setReady(false);
    if (!session) return;
    void readDraft(session, key).then(saved => { if (active && saved) { current.current = saved.value as T; setValue(saved.value as T); setNotice(saved.status === 'POR_ENVIAR' ? 'Envío pendiente recuperado. Se conserva la misma solicitud.' : 'Borrador recuperado de este dispositivo.'); } }).catch(() => { if (active) setNotice('No se pudo recuperar el borrador. Revisa el almacenamiento del dispositivo.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; alive.current = false; };
  }, [key]);
  const persist = useCallback(async (next: T, status: Draft['status']) => {
    if (!session) return;
    await writeDraft(key, { version: 1, api: API_URL, userId: session.user.id, kind, resource, ...details.current, value: next, status, updatedAt: new Date().toISOString() });
  }, [key, session, kind, resource]);
  function change(next: T | ((previous: T) => T)) {
    const result = typeof next === 'function' ? next(current.current) : next;
    current.current = result; setValue(result); setNotice('Guardando borrador…');
    void persist(result, 'BORRADOR').then(() => { if (alive.current) setNotice('Borrador guardado en este dispositivo.'); }).catch(() => { if (alive.current) setNotice('No se pudo guardar el borrador. Libera espacio y vuelve a intentar.'); });
  }
  async function pending() { await persist(current.current, 'POR_ENVIAR'); }
  async function clear() { await writeDraft(key, null); if (alive.current) setNotice('Envío confirmado; borrador eliminado.'); }
  return { value, setValue: change, ready, notice, pending, clear };
}
