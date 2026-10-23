import { useEffect, useRef, useState } from 'react';
import { ApiError, type Session } from '@/services/api';
import { getTaskPage, type TaskFilter, type TaskPage } from '@/services/aulas';
import { useAuth } from '@/state/auth';

type Result = { key: string; session: Session; page: TaskPage | null; error: ApiError | null; loading: boolean; moreError: string };

export function useTaskPage(aulaId: string, filter: TaskFilter, enabled: boolean, revision: number) {
  const { session, signOut } = useAuth();
  const [attempt,setAttempt] = useState(0), [result,setResult] = useState<Result|null>(null);
  const cache = useRef<Result|null>(null), pending = useRef<AbortController|null>(null);
  const key = JSON.stringify([aulaId,filter,revision,attempt]);
  const current = result?.key===key&&result.session===session ? result : null;
  useEffect(()=>{
    if (!enabled||!session||!aulaId) return;
    if (cache.current?.key===key&&cache.current.session===session) { setResult(cache.current); return; }
    const controller=new AbortController();pending.current=controller;
    setResult({key,session,page:null,error:null,loading:true,moreError:''});
    void getTaskPage(session,aulaId,controller.signal,filter).then(page=>{
      if(controller.signal.aborted)return;
      const next={key,session,page,error:null,loading:false,moreError:''};cache.current=next;setResult(next);
    }).catch(reason=>{
      if(controller.signal.aborted)return;
      if(reason instanceof ApiError&&reason.status===401){signOut(true);return;}
      setResult({key,session,page:null,error:reason instanceof ApiError?reason:new ApiError(0,'No se pudieron consultar las tareas.'),loading:false,moreError:''});
    }).finally(()=>{if(pending.current===controller)pending.current=null;});
    return()=>{controller.abort();pending.current?.abort();pending.current=null;};
  },[aulaId,filter,enabled,key,session,signOut]);
  // Si la primera página ya estaba en caché, también se cancela una carga posterior al salir.
  useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[key,enabled,session]);

  function loadMore(){
    if(!session||!current?.page?.siguiente||pending.current)return;
    const snapshot=current,controller=new AbortController();pending.current=controller;
    setResult({...snapshot,loading:true,moreError:''});
    void getTaskPage(session,aulaId,controller.signal,filter,snapshot.page!.siguiente).then(next=>{
      if(controller.signal.aborted)return;
      if(next.siguiente&&next.siguiente===snapshot.page!.siguiente)throw new ApiError(502,'La lista no avanzó. Actualiza las tareas.');
      const merged={...snapshot,page:{...next,items:[...snapshot.page!.items,...next.items.filter(row=>!snapshot.page!.items.some(old=>old.id===row.id))]},loading:false,moreError:''};
      cache.current=merged;setResult(merged);
    }).catch(reason=>{
      if(controller.signal.aborted)return;
      if(reason instanceof ApiError&&reason.status===401){signOut(true);return;}
      const failed={...snapshot,loading:false,moreError:reason instanceof Error?reason.message:'No se pudieron consultar más tareas.'};
      cache.current=failed;setResult(failed);
    }).finally(()=>{if(pending.current===controller)pending.current=null;});
  }
  return {data:current?.page??null,error:current?.error??null,loading:enabled&&(!current||current.loading),moreError:current?.moreError??'',loadMore,retry:()=>setAttempt(n=>n+1)};
}
