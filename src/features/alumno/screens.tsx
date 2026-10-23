import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useAuth } from '@/state/auth';
import { useNotifications } from '@/state/notificaciones';
import { ApiError } from '@/services/api';
import { getHoursPage, type HoursPage } from '@/services/alumno';
import type { RegistroHoras } from '@/services/horas';
import { listDrafts } from '@/storage/drafts';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';
import { useStudent } from './state';
import { useAppRouter } from './navigation';
import { HoursSummaryCard, StudentEmpty, StudentGroup, StudentPage, StudentRow, studentStyles as s } from './components';

export function StudentHome(){
 const {session,offline}=useAuth(),q=useStudent(),router=useAppRouter();
 const [draftCount,setDraftCount]=useState<number|null>(null);
 useFocusEffect(useCallback(()=>{let active=true;if(session)void listDrafts(session).then(v=>{if(active)setDraftCount(v.length);}).catch(()=>{if(active)setDraftCount(null);});return()=>{active=false;};},[session,q.revision]));
 const d=q.data,task=d?.proximaTarea,practice=d?.practica,correction=d?.porCorregir;
 const go=(href:Href)=>router.push(href);
 return <StudentPage title="PrácticasCC" subtitle="Ciencias de la Comunicación · UNSA">
  <View style={s.line}><Text style={s.muted}>Hola, {session?.user.nombres.split(' ')[0]}</Text><Pressable accessibilityRole="button" accessibilityLabel="Ver mi cuenta" onPress={()=>go('/cuenta' as Href)} style={{width:48,height:48,borderRadius:24,backgroundColor:c.soft,alignItems:'center',justifyContent:'center'}}><Text style={s.link}>{session?.user.nombres[0]}{session?.user.apellidos[0]}</Text></Pressable></View>
  <Text accessibilityRole="header" style={s.hero}>{q.error?'Tu práctica, a la vista.':correction?'Revisa una actividad.':task?'Tienes una entrega pendiente.':d&&!practice?'Un nuevo comienzo.':d?'Tu práctica sigue en curso.':'Tu práctica, paso a paso.'}</Text>
  {offline&&<Text style={s.notice}>Sin conexión. Puedes continuar los borradores guardados en este dispositivo.</Text>}
  <QueryFeedback {...q} retry={q.refresh} notFound="Actualiza la API local para acceder a la nueva experiencia del alumno." />
  {correction&&<Pressable accessibilityRole="button" onPress={()=>go({pathname:'/actividad' as Href,params:{practicaId:correction.practicaId,registroId:correction.id}} as Href)} style={s.notice}><Text style={s.rowTitle}>Tienes una actividad por corregir ›</Text><Text style={s.muted}>Revisa la observación del supervisor antes de reenviarla.</Text></Pressable>}
  {task&&<View style={s.priority}><View style={s.line}><Text style={s.eyebrow}>Entrega pendiente</Text><Badge title="Por entregar" tone="warning" /></View><Text style={s.title}>{task.titulo}</Text><Text style={s.muted}>{task.aulaNombre}</Text><View style={s.line}><Text style={[s.muted,{flex:1}]}>{academicDate(task.fechaLimite,'Sin plazo indicado')}</Text><Pressable accessibilityRole="button" onPress={()=>go({pathname:'/tarea',params:{aulaId:task.aulaId,tareaId:task.id}})} style={s.textButton}><Text style={s.link}>Ver tarea ›</Text></Pressable></View></View>}
  {practice&&practice.estado!=='CERRADA'&&<Button title="＋ Registrar actividad" onPress={()=>go({pathname:'/registrar' as Href,params:{practicaId:practice.id}} as Href)} />}
  {practice&&d?.resumen&&<HoursSummaryCard practice={practice} summary={d.resumen} />}
  {d&&!practice&&<StudentEmpty title="Tu práctica empieza aquí"><Text style={s.muted}>Aún no tienes una práctica asignada. Puedes revisar tus aulas y consultar la guía.</Text><Button title="Explorar mis aulas" onPress={()=>router.navigate('/alumno/aulas' as Href)} /></StudentEmpty>}
  {!!draftCount&&<StudentGroup><StudentRow title={`${draftCount} borrador${draftCount===1?'':'es'} por continuar`} subtitle="Tu contenido guardado todavía no se ha enviado." onPress={()=>go('/borradores')} /></StudentGroup>}
  {d&&<Button title={q.loading?'Actualizando…':'Actualizar mi resumen'} secondary disabled={q.loading} onPress={q.refresh} />}
 </StudentPage>;
}

export function StudentAulas(){const q=useStudent(),router=useAppRouter();return <StudentPage title="Mis aulas" subtitle="Tus tareas, materiales y conversaciones, por aula."><QueryFeedback {...q} retry={q.refresh} notFound="Las aulas no están disponibles." />{q.data&&<><StudentGroup>{q.data.aulas.map(a=><StudentRow key={a.id} title={a.nombre} subtitle={`${a.profesorNombre} · ${a.ciclo} · ${a.estado==='ACTIVA'?'Activa':'Concluida'}`} onPress={()=>router.push({pathname:'/aula',params:{id:a.id}})} />)}</StudentGroup>{q.data.aulas.length===0&&<StudentEmpty title="Aún no tienes aulas"><Text style={s.muted}>Tus aulas aparecerán cuando se registre tu matrícula.</Text></StudentEmpty>}<Button title="Actualizar aulas" secondary disabled={q.loading} onPress={q.refresh} /></>}</StudentPage>;}

export function StudentMore(){const {session,signOut}=useAuth(),router=useAppRouter();const row=(title:string,subtitle:string,path:string)=><StudentRow key={path} title={title} subtitle={subtitle} onPress={()=>router.push(path as Href)} />;return <StudentPage title="Tu espacio"><StudentGroup>{row(`${session?.user.nombres} ${session?.user.apellidos}`,'Estudiante · Ciencias de la Comunicación','/cuenta')}</StudentGroup><Text style={s.eyebrow}>Mi práctica</Text><StudentGroup>{row('Centro y supervisor','Tu experiencia profesional','/centro')}{row('Metas','Producción y avance de tu práctica','/metas')}{row('Expediente','Requisitos y evaluación','/expedientes')}</StudentGroup><Text style={s.eyebrow}>Tu espacio</Text><StudentGroup>{row('Mensajes','Conversaciones con tus docentes','/mensajes')}{row('Borradores','Contenidos guardados en este dispositivo','/borradores')}{row('Guía de prácticas','Orientación para tu proceso','/guia')}{row('Mi cuenta','Datos de tu sesión','/cuenta')}</StudentGroup><Button title="Cerrar sesión" secondary onPress={()=>signOut()} /></StudentPage>;}

export function StudentAccount(){const {session,signOut}=useAuth(),router=useAppRouter();return <StudentPage title="Mi cuenta" back={()=>router.back()}><Text style={s.title}>{session?.user.nombres} {session?.user.apellidos}</Text><Text selectable style={s.muted}>{session?.user.email}</Text><Badge title="Alumno" tone="neutral" /><Text style={s.muted}>Tu acceso depende de las aulas y prácticas asignadas a tu cuenta.</Text><Button title="Cerrar sesión" secondary onPress={()=>signOut()} /></StudentPage>;}

export function StudentBitacora(){
 const q=useStudent(),{session,signOut}=useAuth(),router=useAppRouter(),params=useLocalSearchParams<{practicaId?:string}>();
 const id=typeof params.practicaId==='string'?params.practicaId:q.data?.practica?.id??'';
 const [filter,setFilter]=useState(''),[page,setPage]=useState<HoursPage|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<ApiError|null>(null),[moreError,setMoreError]=useState(''),[attempt,setAttempt]=useState(0);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{
  setPage(null);setError(null);setMoreError('');if(!session||!id)return;
  const controller=new AbortController();pending.current=controller;setLoading(true);
  void getHoursPage(session,id,controller.signal,filter).then(v=>{if(!controller.signal.aborted)setPage(v);}).catch(e=>{if(!controller.signal.aborted){if(e.status===401)signOut(true);else setError(e);}}).finally(()=>{if(!controller.signal.aborted){setLoading(false);pending.current=null;}});
  return()=>{controller.abort();pending.current?.abort();pending.current=null;};
 },[session,id,filter,attempt,q.revision,signOut]);
 const loadMore=()=>{
  if(!session||!page?.siguiente||pending.current)return;
  const controller=new AbortController();pending.current=controller;setLoading(true);setMoreError('');
  void getHoursPage(session,id,controller.signal,filter,page.siguiente).then(next=>{if(!controller.signal.aborted)setPage(previous=>previous?{...next,registros:[...previous.registros,...next.registros.filter(n=>!previous.registros.some(old=>old.id===n.id))]}:next);}).catch(e=>{if(!controller.signal.aborted){if(e.status===401)signOut(true);else setMoreError(e.message);}}).finally(()=>{if(!controller.signal.aborted){setLoading(false);pending.current=null;}});
 };
 const practice=page?.practica??(q.data?.practica?.id===id?q.data.practica:null);
 const header=<View style={{gap:18,paddingBottom:18}}><View style={s.line}><Badge title={`${page?.resumen.VALIDADO.horas??practice?.horasAcumuladas??0} h validadas`} /><Pressable accessibilityRole="button" disabled={!practice||practice.estado==='CERRADA'} style={s.textButton} onPress={()=>router.push({pathname:'/registrar' as Href,params:{practicaId:id}} as Href)}><Text style={s.link}>＋ Registrar</Text></Pressable></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[['','Todas'],['PENDIENTE','En revisión'],['VALIDADO','Validadas'],['RECHAZADO','Por corregir']].map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:filter===value}} style={[s.chip,filter===value&&s.chipSelected]} onPress={()=>setFilter(value)}><Text style={{fontSize:12,color:filter===value?c.paper:c.primary}}>{label}</Text></Pressable>)}</View><Text style={s.eyebrow}>Más recientes primero</Text><QueryFeedback loading={!page&&loading} error={error} retry={()=>setAttempt(v=>v+1)} notFound="La práctica no está disponible para tu cuenta." /></View>;
 const rows=page?.registros??[];
 return <View style={s.page}><SafeAreaView edges={['top']}><View style={s.heading}><View><Text accessibilityRole="header" style={s.title}>Mi bitácora</Text><Text style={s.muted}>Tu trabajo, registro a registro.</Text></View></View></SafeAreaView>{q.loading&&!q.data?<ActivityIndicator color={c.primary}/>:q.error&&!q.data?<View style={s.content}><QueryFeedback {...q} retry={q.refresh} notFound="La bitácora no está disponible." /></View>:!id?<View style={s.content}><StudentEmpty title="Tu bitácora está por empezar"><Text style={s.muted}>Cuando tengas una práctica asignada, podrás registrar tus actividades aquí.</Text></StudentEmpty></View>:<FlatList<RegistroHoras> key={`${id}:${filter}`} data={rows} keyExtractor={r=>r.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} style={{flex:1}} contentContainerStyle={s.content} ListHeaderComponent={header} renderItem={({item:r})=><Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/actividad' as Href,params:{practicaId:id,registroId:r.id}} as Href)} style={[s.row,{backgroundColor:c.paper,borderRadius:15}]}><View style={{flex:1,gap:7}}><Text style={s.rowTitle}>{r.descripcion}</Text><Text style={s.muted}>{academicDate(r.fecha)}</Text><Badge title={r.estadoValidacion==='VALIDADO'?'Validada':r.estadoValidacion==='RECHAZADO'?'Por corregir':'En revisión'} tone={r.estadoValidacion==='VALIDADO'?'success':'warning'} /></View><Text style={s.rowTitle}>{r.horas} h</Text></Pressable>} ListEmptyComponent={!loading&&!error?<Text style={s.muted}>No hay actividades con este estado.</Text>:null} ListFooterComponent={<View style={{gap:14,paddingTop:18}}>{page&&<Text style={s.muted}>{rows.length} de {page.coincidencias} actividades</Text>}{!!moreError&&<Text accessibilityRole="alert" style={typography.error}>{moreError}</Text>}{page?.siguiente&&<Button title={loading?'Cargando…':moreError?'Reintentar carga':'Ver actividades anteriores'} secondary disabled={loading} onPress={loadMore} />}<Button title="Actualizar bitácora" secondary disabled={loading} onPress={()=>setAttempt(v=>v+1)} /></View>} />}</View>;
}
