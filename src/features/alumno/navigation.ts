import { createElement, type PropsWithChildren } from 'react';
import { Redirect, useLocalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/state/auth';
const main: Record<string,string>={'/panel':'inicio','/mis-horas':'bitacora','/mis-avisos':'avisos'};
const detail=new Set(['aula','tarea','entrega','centro','borradores','expedientes','expediente','metas','comunidad','foro','anuncio','documentos','mensajes','conversacion','guia','actividad','registrar','cuenta','aviso']);
export function useAppRouter(){
 const router=useRouter(),pathname=usePathname(),{session}=useAuth();
 const student=session?.user.role==='ALUMNO';
 const active=pathname.match(/^\/alumno\/(inicio|bitacora|aulas|avisos|mas)(?:\/|$)/)?.[1];
 function map(href:Href):Href{
  if(!student)return href;
  const path=typeof href==='string'?href:href.pathname;
  if(!path)return href;
  const key=path.split('?')[0];
  if(main[key])return (typeof href==='string'?`/alumno/${main[key]}${path.includes('?')?'?'+path.split('?')[1]:''}`:{...href,pathname:`/alumno/${main[key]}`}) as Href;
  const name=key.slice(1);
  if(!detail.has(name))return href;
  const tab=active??(name==='aula'||name==='tarea'?'aulas':'mas');
  return (typeof href==='string'?`/alumno/${tab}/${name}${path.includes('?')?'?'+path.split('?')[1]:''}`:{...href,pathname:`/alumno/${tab}/${name}`}) as Href;
 }
 return {...router,push:(href:Href)=>router.push(map(href)),replace:(href:Href)=>router.replace(map(href)),navigate:(href:Href)=>router.navigate(map(href))};
}
export function StudentLegacyRoute({route,children}:PropsWithChildren<{route:string}>){
 const {session}=useAuth(),path=usePathname(),params=useLocalSearchParams();
 if(session?.user.role==='ALUMNO'&&!path.startsWith('/alumno/')){
  const tab=main[route]??(['aula','tarea','documentos','comunidad','foro'].includes(route.slice(1))?'aulas':'mas');
  const pathname=main[route]?`/alumno/${tab}`:`/alumno/${tab}${route}`;
  return createElement(Redirect,{href:{pathname,params} as Href});
 }
 return children;
}
