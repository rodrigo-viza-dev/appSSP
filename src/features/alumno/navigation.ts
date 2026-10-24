import { createElement, type PropsWithChildren } from 'react';
import { Redirect, useLocalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/state/auth';
import { mapAppHref } from '@/features/shared/navigation-map';
export function useAppRouter(){
 const router=useRouter(),pathname=usePathname(),{session}=useAuth();
 const map=(href:Href)=>mapAppHref(session?.user.role,pathname,href);
 return {...router,push:(href:Href)=>router.push(map(href)),replace:(href:Href)=>router.replace(map(href)),navigate:(href:Href)=>router.navigate(map(href))};
}
export function StudentLegacyRoute({route,children}:PropsWithChildren<{route:string}>){
 const {session}=useAuth(),path=usePathname(),params=useLocalSearchParams();
 if(session&&!path.startsWith('/alumno/')&&!path.startsWith('/equipo/')){
  const href=mapAppHref(session.user.role,path,{pathname:route,params} as Href);
  if(typeof href!=='string'&&href.pathname!==route)return createElement(Redirect,{href});
 }
 return children;
}
