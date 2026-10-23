import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ApiError } from '@/services/api';
import { getStudentOverview, type StudentOverview } from '@/services/alumno';
import { useAuth } from '@/state/auth';
function useStudentState() {
 const {session,signOut}=useAuth();
 const [data,setData]=useState<StudentOverview|null>(null),[error,setError]=useState<ApiError|null>(null),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const pending=useRef<AbortController|null>(null);
 const refresh=useCallback(()=>{
  if(!session)return;
  pending.current?.abort(); const c=new AbortController();pending.current=c;setLoading(true);setError(null);
  void getStudentOverview(session,c.signal).then(v=>{if(!c.signal.aborted){setData(v);setRevision(n=>n+1);}}).catch(e=>{if(!c.signal.aborted){if(e instanceof ApiError&&e.status===401)signOut(true);else setError(e instanceof ApiError?e:new ApiError(0,'No pudimos consultar tu práctica.'));}}).finally(()=>{if(!c.signal.aborted)setLoading(false);});
 },[session,signOut]);
 useEffect(()=>{setData(null);refresh();return()=>pending.current?.abort();},[refresh]);
 return {data,error,loading,refresh,revision};
}
const StudentContext=createContext<ReturnType<typeof useStudentState>|null>(null);
export function StudentProvider({children}:PropsWithChildren){const value=useStudentState();return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;}
export function useOptionalStudent(){return useContext(StudentContext);}
export function useStudent(){const v=useContext(StudentContext);if(!v)throw new Error('Se requiere StudentProvider');return v;}
