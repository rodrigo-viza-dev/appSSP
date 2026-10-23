import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Badge } from '@/components/ui';
import type { HoursSummary } from '@/services/alumno';
import type { PracticaHoras } from '@/services/horas';
import { studentColors as c } from '@/theme/student';
import { useAppRouter } from './navigation';
export function StudentPage({children,title,subtitle,back,keyboard=false}:PropsWithChildren<{title:string;subtitle?:string;back?:()=>void;keyboard?:boolean}>){return <View style={s.page}><SafeAreaView edges={['top']}><View style={s.heading}>{back&&<Pressable accessibilityRole="button" accessibilityLabel="Volver" style={s.back} onPress={back}><Text style={s.chevron}>‹</Text></Pressable>}<View style={{flex:1}}><Text accessibilityRole="header" style={s.title}>{title}</Text>{!!subtitle&&<Text style={s.muted}>{subtitle}</Text>}</View></View></SafeAreaView><KeyboardAvoidingView enabled={keyboard} behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></KeyboardAvoidingView></View>;}
export function StudentRow({title,subtitle,onPress,end}: {title:string;subtitle?:string;onPress?:()=>void;end?:string}){return <Pressable accessibilityRole={onPress?'button':undefined} onPress={onPress} disabled={!onPress} style={s.row}><View style={{flex:1,gap:5}}><Text style={s.rowTitle}>{title}</Text>{!!subtitle&&<Text style={s.muted}>{subtitle}</Text>}</View>{!!end&&<Text style={s.rowTitle}>{end}</Text>}{onPress&&<Text style={s.chevron}>›</Text>}</Pressable>;}
export function StudentGroup({children}:PropsWithChildren){return <View style={s.group}>{children}</View>;}
export function HoursSummaryCard({practice,summary}: {practice:PracticaHoras;summary:HoursSummary}){
 const router=useAppRouter(),valid=summary.VALIDADO.horas,pending=summary.PENDIENTE.horas,total=Object.values(summary).reduce((n,v)=>n+v.horas,0),goal=practice.horasMinimas;
 return <View style={{gap:14}}><View style={s.line}><Text style={s.sectionTitle}>Horas de práctica</Text><Pressable accessibilityRole="button" style={s.textButton} onPress={()=>router.navigate({pathname:'/mis-horas',params:{practicaId:practice.id}})}><Text style={s.link}>Ver bitácora ›</Text></Pressable></View><View style={s.line}><View style={[s.metric,{backgroundColor:c.greenSoft}]}><Text style={[s.number,{color:c.green}]}>{valid}<Text style={s.unit}> h</Text></Text><Text style={[s.mini,{color:c.green}]}>Validadas</Text></View><View style={[s.metric,{backgroundColor:c.amberSoft}]}><Text style={[s.number,{color:c.amber}]}>{pending}<Text style={s.unit}> h</Text></Text><Text style={[s.mini,{color:c.amber}]}>Pendientes de revisión</Text></View></View>{goal>0&&<><View accessibilityRole="progressbar" accessibilityLabel="Avance de horas validadas" accessibilityValue={{min:0,max:goal,now:Math.min(goal,valid)}} style={s.track}><View style={[s.fill,{width:`${Math.min(100,valid/goal*100)}%`}]} /></View><Text style={s.muted}>{valid} de {goal} h de la meta de esta práctica</Text></>}<View style={[s.line,{borderTopWidth:1,borderTopColor:c.border,paddingTop:14}]}><Text style={s.muted}>Total registrado</Text><Text style={s.rowTitle}>{total} h</Text></View></View>;
}
export function StudentEmpty({title,children}:PropsWithChildren<{title:string}>){return <View style={{paddingVertical:24,gap:14}}><Text accessibilityRole="header" style={s.title}>{title}</Text>{children}</View>;}
const textFace = { fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : undefined };
export const studentStyles=StyleSheet.create({
 page:{flex:1,backgroundColor:c.background},
 content:{width:'100%',maxWidth:560,alignSelf:'center',padding:20,paddingBottom:32,gap:22},
 heading:{width:'100%',maxWidth:560,alignSelf:'center',padding:20,paddingBottom:12,flexDirection:'row',alignItems:'center',gap:8},
 back:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',marginLeft:-12},
 chevron:{...textFace,fontSize:25,color:c.primary},
 title:{...textFace,fontSize:23,lineHeight:30,fontWeight:'700',color:c.text},
 hero:{...textFace,fontSize:28,lineHeight:34,fontWeight:'700',letterSpacing:-.5,color:c.text},
 sectionTitle:{...textFace,fontSize:16,fontWeight:'700',color:c.text},
 rowTitle:{...textFace,fontSize:15,lineHeight:22,fontWeight:'600',color:c.text},
 muted:{...textFace,fontSize:13,lineHeight:21,color:c.muted},
 mini:{...textFace,fontSize:12,lineHeight:18},
 line:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
 group:{backgroundColor:c.paper,borderRadius:20,borderWidth:1,borderColor:c.border,overflow:'hidden'},
 row:{flexDirection:'row',alignItems:'center',gap:12,padding:17,minHeight:76,borderBottomWidth:1,borderBottomColor:c.border},
 metric:{flex:1,padding:15,borderRadius:15,gap:8},
 number:{...textFace,fontSize:28,lineHeight:34,fontWeight:'700',fontVariant:['tabular-nums']},
 unit:{...textFace,fontSize:15,fontWeight:'500'},
 track:{height:6,backgroundColor:c.border,borderRadius:5,overflow:'hidden'},
 fill:{height:6,backgroundColor:c.green,borderRadius:5},
 link:{...textFace,fontSize:13,color:c.primary,fontWeight:'600'},
 textButton:{minHeight:48,justifyContent:'center'},
 eyebrow:{...textFace,fontSize:11,lineHeight:17,letterSpacing:1.1,color:c.muted,fontWeight:'700',textTransform:'uppercase'},
 priority:{padding:20,borderWidth:1,borderColor:c.border,borderLeftWidth:4,borderLeftColor:c.primary,borderRadius:20,backgroundColor:c.paper,gap:14},
 notice:{borderWidth:1,borderColor:c.border,padding:16,borderRadius:15,backgroundColor:c.amberSoft,gap:8},
 chip:{minHeight:48,paddingHorizontal:12,justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.paper},
 chipSelected:{backgroundColor:c.primary,borderColor:c.primary}
});
const s=studentStyles;
