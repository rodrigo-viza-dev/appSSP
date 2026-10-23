import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Attachment } from '@/components/attachment';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { DeliveryPanel } from '@/features/tareas/delivery-panel';
import { DeliveryHistory } from '@/features/tareas/delivery-history';
import { getAula, getTarea, type TaskFilter, type TaskRow } from '@/services/aulas';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from './components';
import { useAppRouter } from './navigation';
import { useStudent } from './state';
import { useTaskPage } from './use-task-page';

function TaskState({state}:{state:string}) {
  return <Badge title={state==='CALIFICADA'?'Calificada':state==='ENTREGADA'?'Entregada':'Por entregar'} tone={state==='CALIFICADA'?'success':state==='ENTREGADA'?'neutral':'warning'}/>;
}
function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[s.chip,{flex:1,alignItems:'center'},selected&&s.chipSelected]}><Text style={{fontSize:13,fontWeight:'600',color:selected?c.paper:c.primary}}>{label}</Text></Pressable>;
}

export function StudentClassroom() {
  const params=useLocalSearchParams<{id?:string}>(),id=typeof params.id==='string'?params.id:'',router=useAppRouter(),student=useStudent();
  const [section,setSection]=useState<'tareas'|'notas'|'recursos'>('tareas'),[filter,setFilter]=useState<TaskFilter>('pendientes');
  const aula=useStudentQuery(`aula23:${id}`,useCallback((session:Session,signal:AbortSignal)=>getAula(session,id,signal),[id]),!!id);
  const tasks=useTaskPage(id,filter,!!aula.data&&section==='tareas',student.revision);
  const grades=useTaskPage(id,'calificadas',!!aula.data&&section==='notas',student.revision);
  const q=section==='notas'?grades:tasks,summary=q.data?.resumen??tasks.data?.resumen??grades.data?.resumen;
  const back=()=>router.canGoBack()?router.back():router.replace('/alumno/aulas');
  const open=(row:TaskRow)=>router.push({pathname:'/tarea',params:{aulaId:id,tareaId:row.id}});
  const resource=(title:string,subtitle:string,path:string,extra:Record<string,string>={})=><StudentRow key={path+title} title={title} subtitle={subtitle} onPress={()=>router.push({pathname:path,params:{aulaId:id,...extra}} as Href)}/>;
  const header=<View style={{gap:20,paddingBottom:18}}>
    <QueryFeedback {...aula} notFound="El aula no está disponible o ya no estás matriculado."/>
    {!id&&<Text accessibilityRole="alert" style={typography.error}>Selecciona un aula desde Mis aulas.</Text>}
    {aula.data&&<>
      <View style={{gap:12}}><View style={s.line}><Text style={s.eyebrow}>Ciclo {aula.data.ciclo}</Text><Badge title={aula.data.estado==='ACTIVA'?'Activa':'Concluida'} tone="neutral"/></View><Text accessibilityRole="header" style={s.hero}>{aula.data.nombre}</Text><Text style={s.muted}>Docente · {aula.data.profesorNombre}</Text>{aula.data.semanasTotales>0&&<Text style={s.muted}>Semana {aula.data.semanaActual} de {aula.data.semanasTotales}</Text>}<View style={s.track} accessibilityRole="progressbar" accessibilityLabel="Avance del aula" accessibilityValue={{min:0,max:100,now:aula.data.progreso}}><View style={[s.fill,{backgroundColor:c.primary,width:`${aula.data.progreso}%`}]}/></View><Text style={s.mini}>{aula.data.progreso}% de avance registrado</Text></View>
      <View style={{flexDirection:'row',gap:8}}>{([['tareas','Tareas'],['notas','Notas'],['recursos','Recursos']] as const).map(([value,label])=><Choice key={value} label={label} selected={section===value} onPress={()=>setSection(value)}/>)}</View>
      {section==='tareas'&&<><View style={s.line}><Text accessibilityRole="header" style={s.sectionTitle}>Tareas del aula</Text>{summary&&<Text style={s.muted}>{summary.pendientes} por entregar</Text>}</View><View style={{flexDirection:'row',gap:8}}>{([['pendientes','Por entregar'],['entregadas','Entregadas'],['todas','Todas']] as const).map(([value,label])=><Choice key={value} label={label} selected={filter===value} onPress={()=>setFilter(value)}/>)}</View><Text style={s.eyebrow}>Por fecha límite · hora de Lima</Text></>}
      {section==='notas'&&<><Text accessibilityRole="header" style={s.sectionTitle}>Mis calificaciones</Text>{summary&&<View style={[s.notice,{backgroundColor:c.paper}]}><Text style={s.eyebrow}>Promedio registrado</Text><Text style={s.hero}>{summary.promedio===null?'Sin calificaciones':summary.promedio}</Text><Text style={s.muted}>{summary.calificadas} de {summary.total} tareas calificadas · {summary.entregadas} entregadas</Text></View>}</>}
      {section==='recursos'?<><Text style={s.sectionTitle}>Recursos y comunicación</Text><StudentGroup>{resource('Documentos del aula','Materiales del docente y archivos propios','/documentos')}{resource('Mensajes con el docente','Tus conversaciones de esta aula','/mensajes')}{resource('Anuncios del aula','Indicaciones y novedades del docente','/comunidad',{seccion:'anuncios'})}{resource('Foros del aula','Temas y conversaciones del grupo','/comunidad',{seccion:'foros'})}{resource('Mis metas','Objetivos de tu práctica','/metas')}</StudentGroup></>:<QueryFeedback loading={q.loading&&!q.data} error={q.error} retry={q.retry} notFound="Las tareas de esta aula ya no están disponibles."/>}
    </>}
  </View>;
  return <View style={s.page}><SafeAreaView edges={['top']}><View style={s.heading}><Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={s.back}><Text style={s.chevron}>‹</Text></Pressable><Text accessibilityRole="header" style={s.title}>Mi aula</Text></View></SafeAreaView>
    <FlatList<TaskRow> key={`${section}:${filter}`} data={aula.data&&section!=='recursos'?q.data?.items??[]:[]} keyExtractor={row=>row.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content} ListHeaderComponent={header}
      renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`Ver tarea: ${item.titulo}`} onPress={()=>open(item)} style={[s.row,{backgroundColor:c.paper,borderRadius:18}]}><View style={{flex:1,gap:12}}><TaskState state={item.estado}/><Text style={s.rowTitle}>{item.titulo}</Text><Text style={s.muted}>{academicDate(item.fechaLimite)}</Text></View>{item.nota!==null?<Text style={s.title}>{item.nota}</Text>:<Text style={s.chevron}>›</Text>}</Pressable>}
      ListEmptyComponent={aula.data&&section!=='recursos'&&!q.loading&&!q.error?<View style={{gap:12,paddingVertical:16}}><Text style={s.title}>{section==='notas'?'Aún no hay calificaciones.':filter==='pendientes'?'Sin tareas por entregar.':'Aún no hay tareas en este filtro.'}</Text><Text style={s.muted}>{section==='notas'?'Aquí aparecerán las notas que registre tu docente.':filter==='pendientes'?'Puedes consultar las tareas que ya entregaste.':'Las tareas publicadas aparecerán aquí.'}</Text>{section==='tareas'&&filter==='pendientes'&&!!summary?.entregadas&&<Button title="Ver tareas entregadas" secondary onPress={()=>setFilter('entregadas')}/>}</View>:null}
      ListFooterComponent={aula.data?<View style={{gap:14,paddingTop:18}}>{section!=='recursos'&&q.data&&<Text style={s.muted}>{q.data.items.length} de {q.data.total} tareas</Text>}{section!=='recursos'&&!!q.moreError&&<Text accessibilityRole="alert" style={typography.error}>{q.moreError}</Text>}{section!=='recursos'&&q.data?.siguiente&&<Button title={q.loading?'Cargando…':q.moreError?'Reintentar carga':'Ver más tareas'} secondary disabled={q.loading} onPress={q.loadMore}/>}<Button title="Actualizar aula" secondary disabled={aula.loading||q.loading} onPress={()=>{aula.retry();tasks.retry();grades.retry();}}/></View>:null}/>
  </View>;
}

function useTaskDetail() {
  const params=useLocalSearchParams<{aulaId?:string;tareaId?:string}>(),router=useAppRouter();
  const aulaId=typeof params.aulaId==='string'?params.aulaId:'',taskId=typeof params.tareaId==='string'?params.tareaId:'';
  const q=useStudentQuery(`task23:${aulaId}:${taskId}`,useCallback((session:Session,signal:AbortSignal)=>getTarea(session,aulaId,taskId,signal),[aulaId,taskId]),!!aulaId&&!!taskId);
  return {q,aulaId,taskId,router,back:()=>router.canGoBack()?router.back():aulaId?router.replace({pathname:'/aula',params:{id:aulaId}}):router.replace('/alumno/aulas')};
}

export function StudentTask() {
  const {q,aulaId,taskId,router,back}=useTaskDetail(),{session}=useAuth(),task=q.data;
  const [history,setHistory]=useState(false),firstFocus=useRef(true);
  useFocusEffect(useCallback(()=>{if(firstFocus.current)firstFocus.current=false;else q.retry();},[q.retry]));
  return <StudentPage title="Detalle de tarea" back={back}>
    <QueryFeedback {...q} notFound="La tarea no está disponible en esta aula."/>
    {(!aulaId||!taskId)&&<Text style={s.muted}>Selecciona una tarea desde tu aula.</Text>}
    {task&&<><View style={s.line}><Text style={[s.eyebrow,{flex:1}]}>{task.aulaNombre}</Text><TaskState state={task.entrega?.estado??'PENDIENTE'}/></View><Text accessibilityRole="header" style={s.hero}>{task.titulo}</Text><View style={{gap:6}}><Text style={s.eyebrow}>Fecha límite · hora de Lima</Text><Text style={s.rowTitle}>{academicDate(task.fechaLimite)}</Text></View>
      {task.entregaHabilitada?<Button title={task.entrega?'Actualizar mi entrega':'Preparar entrega'} onPress={()=>router.push({pathname:'/entrega' as Href,params:{aulaId,tareaId:taskId}} as Href)}/>:<View style={s.notice}><Text style={s.muted}>{task.bloqueoEntrega}</Text></View>}
      <View style={{gap:12}}><Text accessibilityRole="header" style={s.sectionTitle}>Instrucciones</Text><Text style={[s.rowTitle,{fontWeight:'400',lineHeight:25}]}>{task.descripcion||'El docente no agregó instrucciones.'}</Text></View>
      <Text accessibilityRole="header" style={s.sectionTitle}>Mi entrega</Text>
      {task.entrega?<View style={[s.group,{padding:18,gap:14}]}><TaskState state={task.entrega.estado}/><Text style={s.muted}>Enviada el {academicDate(task.entrega.createdAt,'Fecha no disponible')}</Text><Text style={[s.rowTitle,{fontWeight:'400'}]}>{task.entrega.descripcion||'Entrega con documento adjunto.'}</Text>{!!task.entrega.comentario&&<Text style={s.muted}>{task.entrega.comentario}</Text>}{!!task.entrega.archivoId&&<Attachment aulaId={aulaId} id={task.entrega.archivoId}/>}</View>:<Text style={s.muted}>Todavía no has enviado una entrega para esta tarea.</Text>}
      {task.entrega&&<View style={{gap:12}}><Text accessibilityRole="header" style={s.sectionTitle}>Revisión docente</Text><View style={[s.notice,{backgroundColor:task.entrega.nota!==null?c.greenSoft:c.paper}]}><Text style={s.title}>{task.entrega.nota!==null?`Nota: ${task.entrega.nota}`:'Pendiente de calificación'}</Text><Text style={s.muted}>{task.entrega.retroalimentacion||'Tu docente aún no ha registrado observaciones.'}</Text></View></View>}
      {!!task.entrega&&!!session&&(history?<><DeliveryHistory aulaId={aulaId} taskId={taskId} alumnoId={session.user.id} revision={task.entrega.revision} showSingle/><Button title="Ocultar historial" secondary onPress={()=>setHistory(false)}/></>:<Button title="Ver historial de entregas" secondary onPress={()=>setHistory(true)}/>)}
      <Button title="Actualizar tarea" secondary disabled={q.loading} onPress={q.retry}/>
    </>}
  </StudentPage>;
}

export function StudentDelivery() {
  const {q,router,back}=useTaskDetail(),student=useStudent(),task=q.data;
  const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  return <StudentPage title={saved?'Entrega recibida':'Preparar entrega'} back={back} keyboard>
    {saved?<><Text style={s.hero}>Tu entrega fue recibida.</Text><Text style={s.muted}>Puedes consultar el contenido enviado y su revisión desde la tarea.</Text><Button title="Ver mi entrega" onPress={back}/></>:<>
      <QueryFeedback {...q} notFound="La tarea no está disponible en esta aula."/>
      {task&&<><Text style={s.title}>{task.titulo}</Text><Text style={s.muted}>{academicDate(task.fechaLimite)} · hora de Lima</Text>{task.entregaHabilitada?<><DeliveryPanel key={`${task.id}:${task.entrega?.revision??'nueva'}`} task={task} onBusy={setBusy} onSaved={()=>{setSaved(true);student.refresh();}}/><Button title="Volver al detalle" secondary disabled={busy} onPress={back}/></>:<><Text style={s.notice}>{task.bloqueoEntrega}</Text><Button title="Volver a la tarea" secondary onPress={back}/></>}</>}
      {!task&&!q.loading&&!q.error&&<Button title="Ir a mis aulas" onPress={()=>router.replace('/alumno/aulas')}/>}
    </>}
  </StudentPage>;
}
