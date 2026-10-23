import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Badge, Button } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useStudentQuery } from '@/features/shared/use-student-query';
import { RegisterHoursForm } from '@/features/horas/forms';
import { HoursHistory } from '@/features/horas/history';
import { getHoursPage, getStudentActivity } from '@/services/alumno';
import type { Session } from '@/services/api';
import { academicDate } from '@/utils/date';
import { useStudent } from './state';
import { useAppRouter } from './navigation';
import { StudentPage, StudentGroup, StudentRow, studentStyles as s } from './components';
import { StudentAccount } from './screens';
import { StudentNoticeDetail } from './notices';
import { StudentDelivery } from './classroom';
import Aula from '@/app/aula';
import Tarea from '@/app/tarea';
import Centro from '@/app/centro';
import Borradores from '@/app/borradores';
import Expedientes from '@/app/expedientes';
import Expediente from '@/app/expediente';
import Metas from '@/app/metas';
import Comunidad from '@/app/comunidad';
import Foro from '@/app/foro';
import Documentos from '@/app/documentos';
import Mensajes from '@/app/mensajes';
import Conversacion from '@/app/conversacion';
import Guia from '@/app/guia';

function Activity(){
 const params=useLocalSearchParams<{practicaId?:string;registroId?:string}>(),router=useAppRouter();
 const id=typeof params.practicaId==='string'?params.practicaId:'',rid=typeof params.registroId==='string'?params.registroId:'';
 const q=useStudentQuery(`actividad:${id}:${rid}`,useCallback((session:Session,signal:AbortSignal)=>getStudentActivity(session,id,rid,signal),[id,rid]),!!id&&!!rid);
 const r=q.data?.registro,p=q.data?.practica;
 return <StudentPage title="Detalle de actividad" back={()=>router.canGoBack()?router.back():router.replace('/mis-horas')}><QueryFeedback {...q} notFound="La actividad ya no está disponible." />{(!id||!rid)&&<Text style={s.muted}>Abre una actividad desde tu bitácora.</Text>}{r&&p&&<><View style={s.line}><Badge title={r.estadoValidacion==='VALIDADO'?'Validada':r.estadoValidacion==='RECHAZADO'?'Por corregir':'En revisión'} tone={r.estadoValidacion==='VALIDADO'?'success':'warning'} /><Text style={s.title}>{r.horas} h</Text></View><StudentGroup><StudentRow title={r.descripcion} subtitle={`${academicDate(r.fecha)} · ${p.aulaNombre}`} /></StudentGroup>{!!r.observacion&&<View style={s.notice}><Text style={s.rowTitle}>Observación del supervisor</Text><Text style={s.muted}>{r.observacion}</Text></View>}{r.estadoValidacion==='RECHAZADO'&&p.estado!=='CERRADA'&&<Button title="Corregir y reenviar" onPress={()=>router.push({pathname:'/registrar',params:{practicaId:id,registroId:rid}} as never)} />}<HoursHistory registro={r} /></>}</StudentPage>;
}

function RegisterActivity(){
 const params=useLocalSearchParams<{practicaId?:string;registroId?:string}>(),router=useAppRouter(),student=useStudent();
 const id=typeof params.practicaId==='string'?params.practicaId:student.data?.practica?.id??'',rid=typeof params.registroId==='string'?params.registroId:'';
 const known=student.data?.practica?.id===id?student.data.practica:null;
 const q=useStudentQuery(`formulario:${id}:${rid}`,useCallback(async(session:Session,signal:AbortSignal)=>rid?getStudentActivity(session,id,rid,signal):{practica:(await getHoursPage(session,id,signal)).practica,registro:undefined},[id,rid]),!!id&&(!!rid||!known));
 const practice=q.data?.practica??known,record=q.data?.registro;
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 return <StudentPage title={rid?'Corregir actividad':'Registrar actividad'} back={()=>router.canGoBack()?router.back():router.replace('/mis-horas')}><QueryFeedback {...q} notFound="La práctica no está disponible." />{saved?<><Text accessibilityRole="header" style={s.title}>Tu actividad fue recibida</Text><Text style={s.muted}>Las horas quedaron pendientes de revisión del supervisor.</Text><Button title="Ver mi bitácora" onPress={()=>router.replace({pathname:'/mis-horas',params:{practicaId:id}})} /></>:practice&&(!rid||record)&&!q.loading?<><Text style={s.rowTitle}>{practice.aulaNombre}</Text>{practice.estado==='CERRADA'?<Text style={s.muted}>Esta práctica está cerrada y se conserva para consulta.</Text>:<><RegisterHoursForm practica={practice} registro={record} onBusy={setBusy} refresh={()=>q.retry()} onSaved={()=>{setSaved(true);student.refresh();}} /><Button title="Guardar borrador y volver" secondary disabled={busy} onPress={()=>router.canGoBack()?router.back():router.replace('/borradores')} /><Text style={s.muted}>La actividad se guarda en este dispositivo al editar. Enviarla requiere tu confirmación.</Text></>}</>:!id&&!q.loading?<Text style={s.muted}>Necesitas una práctica asignada para registrar actividades.</Text>:null}</StudentPage>;
}
const views:Record<string,()=>React.JSX.Element|null>={entrega:StudentDelivery,aviso:StudentNoticeDetail,aula:Aula,tarea:Tarea,centro:Centro,borradores:Borradores,expedientes:Expedientes,expediente:Expediente,metas:Metas,comunidad:Comunidad,foro:Foro,documentos:Documentos,mensajes:Mensajes,conversacion:Conversacion,guia:Guia,cuenta:StudentAccount,actividad:Activity,registrar:RegisterActivity};
export default function StudentDetail(){const {vista}=useLocalSearchParams<{vista?:string}>(),router=useAppRouter();const View=typeof vista==='string'?views[vista]:null;return View?<View/>:<StudentPage title="Sección no disponible"><Button title="Volver a Inicio" onPress={()=>router.replace('/panel')} /></StudentPage>;}

export function generateStaticParams(){return Object.keys(views).map(vista=>({vista}));}
