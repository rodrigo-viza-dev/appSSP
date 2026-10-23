import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useNotifications } from '@/state/notificaciones';
import { getNotice, type Notificacion, type NoticeFilter } from '@/services/notificaciones';
import type { Session } from '@/services/api';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { academicDate } from '@/utils/date';
import { studentColors as c } from '@/theme/student';
import { StudentPage, studentStyles as s } from './components';
import { useAppRouter } from './navigation';

const kinds: Record<string,string> = { TAREA_ASIGNADA: 'Nueva tarea', TAREA_ACTUALIZADA: 'Tarea actualizada', REVISION_HORAS: 'Revisión de actividad', VENCIMIENTO: 'Vencimiento' };
const kindLabel = (notice: Notificacion) => kinds[notice.tipo] ?? 'Aviso';

export function StudentNotices() {
  const n = useNotifications(), router = useAppRouter();
  const header = <View style={{ gap: 18, paddingBottom: 18 }}>
    <Text accessibilityLiveRegion="polite" style={s.muted}>{n.unread === null ? 'Consultando tu bandeja…' : n.unread === 1 ? '1 aviso sin leer' : `${n.unread} avisos sin leer`}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>{([['todos','Todos'],['pendientes','Sin leer'],['leidos','Leídos']] as [NoticeFilter,string][]).map(([value,label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: n.filter === value, disabled: n.busy || n.loadingMore }} disabled={n.busy || n.loadingMore} onPress={() => n.setFilter(value)} style={[s.chip,{flex:1,alignItems:'center'},n.filter===value&&s.chipSelected]}><Text style={{color:n.filter===value?c.paper:c.primary,fontSize:13,fontWeight:'600'}}>{label}</Text></Pressable>)}</View>
    <QueryFeedback loading={n.loading} error={n.error} retry={n.refresh} notFound="La bandeja no está disponible." />
    {!!n.mutationError && <Text accessibilityRole="alert" style={typography.error}>{n.mutationError}</Text>}
    {!!n.notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{n.notice}</Text>}
    {!!n.unread && <Button title={n.busy?'Marcando avisos…':'Marcar todos como leídos'} secondary disabled={n.busy||n.loading||n.loadingMore} onPress={()=>{void n.markRead();}} />}
  </View>;
  return <View style={s.page}><SafeAreaView edges={['top']}><View style={s.heading}><View><Text accessibilityRole="header" style={s.title}>Mis avisos</Text><Text style={s.muted}>Lo que necesitas revisar, en un solo lugar.</Text></View></View></SafeAreaView>
    <FlatList<Notificacion> data={n.items??[]} key={n.filter} keyExtractor={item=>item.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} contentContainerStyle={s.content} ListHeaderComponent={header}
      renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`Abrir aviso: ${item.titulo}`} onPress={()=>router.push({pathname:'/alumno/avisos/[vista]',params:{vista:'aviso',id:item.id}})} style={[s.row,{backgroundColor:c.paper,borderRadius:18,borderLeftWidth:item.leida?0:3,borderLeftColor:c.primary,alignItems:'flex-start'}]}><View style={{flex:1,gap:10}}><View style={s.line}><Text style={s.eyebrow}>{kindLabel(item)}</Text>{!item.leida&&<Badge title="Sin leer" tone="warning" />}</View><Text style={s.rowTitle}>{item.titulo}</Text><Text numberOfLines={2} style={s.muted}>{item.mensaje}</Text><Text style={s.mini}>{academicDate(item.fecha,'Fecha no disponible')}</Text></View><Text style={s.chevron}>›</Text></Pressable>}
      ListEmptyComponent={!n.loading&&!n.error?<View style={{paddingVertical:22,gap:10}}><Text style={s.title}>{n.filter==='pendientes'?'Estás al día.':'Todavía no hay avisos.'}</Text><Text style={s.muted}>{n.filter==='pendientes'?'No tienes avisos sin leer.':n.filter==='leidos'?'Aquí aparecerán los avisos que marques como leídos.':'Tus próximas tareas y revisiones aparecerán aquí.'}</Text></View>:null}
      ListFooterComponent={<View style={{gap:14,paddingTop:16}}>{!!n.items&&<Text style={s.muted}>{n.items.length} de {n.total} {n.total===1?'aviso':'avisos'}</Text>}{!!n.moreError&&<Text accessibilityRole="alert" style={typography.error}>{n.moreError}</Text>}{n.hasMore&&<Button title={n.loadingMore?'Cargando…':n.moreError?'Reintentar carga':'Ver avisos anteriores'} secondary disabled={n.loadingMore||n.busy||n.loading} onPress={n.loadMore}/>}<Button title="Actualizar avisos" secondary disabled={n.loading||n.busy||n.loadingMore} onPress={n.refresh}/></View>}/>
  </View>;
}

export function StudentNoticeDetail() {
  const params = useLocalSearchParams<{id?:string}>(), router = useAppRouter(), n = useNotifications();
  const id = typeof params.id === 'string' ? params.id : '';
  const load = useCallback((session:Session,signal:AbortSignal)=>getNotice(session,id,signal),[id]);
  const q = useSessionQuery(`aviso:${id}`,load,!!id), item = q.data;
  const cached = n.items?.find(value=>value.id===id), read = item?.leida || cached?.leida;
  const open = () => {
    const target = item?.destino;
    if (target?.tipo === 'TAREA') router.push({pathname:'/tarea',params:{aulaId:target.aulaId,tareaId:target.tareaId}});
    if (target?.tipo === 'ACTIVIDAD') router.push({pathname:'/alumno/avisos/[vista]',params:{vista:'actividad',practicaId:target.practicaId,registroId:target.registroId}});
  };
  return <StudentPage title="Detalle de aviso" back={()=>router.canGoBack()?router.back():router.replace('/mis-avisos')}>
    <QueryFeedback {...q} notFound="Este aviso ya no está disponible para tu cuenta."/>
    {!id&&<Text style={s.muted}>Selecciona un aviso desde tu bandeja.</Text>}
    {item&&<><View style={[s.line,{flexWrap:'wrap'}]}><Badge title={kindLabel(item)} tone="neutral"/><Badge title={read?'Leído':'Sin leer'} tone={read?'neutral':'warning'}/></View><Text accessibilityRole="header" style={s.hero}>{item.titulo}</Text><Text style={[s.rowTitle,{fontWeight:'400',lineHeight:25}]}>{item.mensaje}</Text><Text style={s.muted}>{academicDate(item.fecha,'Fecha no disponible')} · hora de Lima</Text>
      {item.destino?<Button title={item.destino.tipo==='TAREA'?'Ver tarea':'Ver actividad'} onPress={open}/>:<Text style={s.muted}>Este aviso es informativo.</Text>}
      {!!n.mutationError&&<Text accessibilityRole="alert" style={typography.error}>{n.mutationError}</Text>}
      {!read&&<Button title={n.busy?'Marcando aviso…':'Marcar como leído'} secondary disabled={n.busy||n.loading||n.loadingMore||!!n.error} onPress={()=>{void n.markRead(item).then(confirmed=>{if(confirmed)q.setData({...item,leida:true});});}}/>}
      <Button title="Volver a mis avisos" secondary onPress={()=>router.canGoBack()?router.back():router.replace('/mis-avisos')}/>
    </>}
  </StudentPage>;
}
