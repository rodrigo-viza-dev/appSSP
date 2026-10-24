import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Field } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getDashboard } from '@/services/api';
import { getPracticasExpedientes } from '@/services/expedientes';
import { useAuth } from '@/state/auth';
import { useNotifications } from '@/state/notificaciones';
import { StudentGroup, StudentPage, StudentRow, studentStyles as s } from '@/features/alumno/components';
import { useAppRouter } from '@/features/alumno/navigation';
import { isStaff, staffLabels } from '@/features/shared/navigation-map';

export function StaffHome() {
  const { session } = useAuth(), router = useAppRouter(), notices = useNotifications();
  const query = useSessionQuery('staff-dashboard', useCallback(getDashboard, []), isStaff(session?.user.role));
  if (!session || !isStaff(session.user.role)) return null;
  const role = session.user.role, labels = staffLabels[role];
  return <StudentPage title="PrácticasCC" subtitle={labels.role}><Text style={s.muted}>Hola, {session.user.nombres.split(' ')[0]}</Text><Text accessibilityRole="header" style={s.hero}>{role === 'PROFESOR' ? 'Tu aula, a la vista.' : role === 'SUPERVISOR' ? 'Acompaña cada práctica.' : 'Organiza el seguimiento académico.'}</Text><QueryFeedback {...query} notFound="Tu resumen no está disponible." />{query.data && query.data.kind !== 'ALUMNO' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{query.data.metrics.map(metric => <View key={metric.label} style={[s.group, { width: '47%', padding: 16, gap: 10 }]}><Text style={s.muted}>{metric.label}</Text><Text style={s.number}>{metric.value ?? 'Sin datos'}</Text></View>)}</View>}<Button title={role === 'PROFESOR' ? 'Abrir mis aulas' : role === 'SUPERVISOR' ? 'Ver mis practicantes' : 'Abrir gestión académica'} onPress={() => router.navigate('/equipo/trabajo' as never)} /><StudentGroup><StudentRow title={labels.review} subtitle={role === 'PROFESOR' ? 'Fichas y avance de las prácticas asignadas' : role === 'SUPERVISOR' ? 'Revisar actividades y validar horas' : 'Consultar el avance institucional'} onPress={() => router.navigate('/equipo/revision' as never)} /><StudentRow title="Mis avisos" subtitle={notices.unread === null ? 'Consulta los avisos de tu cuenta' : `${notices.unread} sin leer`} onPress={() => router.navigate('/equipo/avisos' as never)} /></StudentGroup>{role === 'SUPERVISOR' && <Text style={s.muted}>La evaluación se completa en el expediente de cada practicante. El docente o la coordinación autoriza el cierre.</Text>}<Button title="Actualizar resumen" secondary disabled={query.loading} onPress={query.retry} /></StudentPage>;
}

export function StaffPracticeList() {
  const { session } = useAuth(), router = useAppRouter();
  const [search, setSearch] = useState('');
  const query = useSessionQuery('staff-assigned-practices', useCallback(getPracticasExpedientes, []), isStaff(session?.user.role));
  const supervisor = session?.user.role === 'SUPERVISOR';
  const rows = query.data?.filter(p => `${p.practicanteNombre} ${p.aulaNombre} ${p.periodo}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <StudentPage title={supervisor ? 'Mis practicantes' : 'Seguimiento'} subtitle="Prácticas asignadas y su avance."><QueryFeedback {...query} notFound="Tus prácticas asignadas no están disponibles." />{!supervisor && <Field label="Buscar practicante" value={search} onChangeText={setSearch} placeholder="Nombre, aula o periodo" />}{rows?.length === 0 && <Text style={s.muted}>{query.data?.length ? 'No hay prácticas para esta búsqueda.' : supervisor ? 'Todavía no hay practicantes vinculados a tus centros.' : 'Aún no hay prácticas asignadas. Puedes consultar alumnos sin práctica desde Aulas.'}</Text>}<StudentGroup>{rows?.map(p => <StudentRow key={p.id} title={p.practicanteNombre} subtitle={`${p.aulaNombre} · ${p.periodo}\n${p.horasAcumuladas} de ${p.horasMinimas} h validadas · ${p.estado === 'CERRADA' ? 'Cerrada' : 'En curso'}`} onPress={() => router.push(supervisor ? { pathname: '/expediente', params: { practicaId: p.id } } : { pathname: '/seguimiento', params: { aulaId: p.aulaId, alumnoId: p.practicanteId } })} />)}</StudentGroup><Button title="Actualizar prácticas" secondary disabled={query.loading} onPress={query.retry} /></StudentPage>;
}

export function StaffManagement() {
  const router = useAppRouter();
  return <StudentPage title="Gestión académica" subtitle="Organiza las cuentas, aulas y asignaciones."><Text style={s.eyebrow}>Organización</Text><StudentGroup><StudentRow title="Usuarios y aulas" subtitle="Roles, creación de aulas y matrículas" onPress={() => router.push('/administracion')} /><StudentRow title="Prácticas y supervisores" subtitle="Asignaciones, cuentas y vínculos de supervisión" onPress={() => router.push('/asignaciones')} /></StudentGroup><Text style={s.eyebrow}>Seguimiento</Text><StudentGroup><StudentRow title="Operación docente" subtitle="Tareas, entregas, asistencia y notas por aula" onPress={() => router.push('/docencia')} /><StudentRow title="Expedientes y cierre" subtitle="Requisitos, evaluaciones y autorizaciones" onPress={() => router.push('/expedientes')} /><StudentRow title="Auditoría de actividad" subtitle="Responsables y cambios registrados" onPress={() => router.push('/auditoria')} /></StudentGroup></StudentPage>;
}

export function StaffMore() {
  const { session, signOut } = useAuth(), router = useAppRouter();
  if (!session || !isStaff(session.user.role)) return null;
  return <StudentPage title="Tu espacio"><StudentGroup><StudentRow title={`${session.user.nombres} ${session.user.apellidos}`} subtitle={staffLabels[session.user.role].role} onPress={() => router.push('/cuenta' as never)} /></StudentGroup><Text style={s.eyebrow}>Prácticas</Text><StudentGroup><StudentRow title="Metas de prácticas" subtitle="Producción y objetivos revisados" onPress={() => router.push('/metas')} /><StudentRow title="Expedientes" subtitle="Evaluaciones y requisitos de cierre" onPress={() => router.push('/expedientes')} /></StudentGroup><Text style={s.eyebrow}>Comunicación y ayuda</Text><StudentGroup>{session.user.role === 'PROFESOR' && <StudentRow title="Mensajes académicos" subtitle="Conversaciones privadas con tus alumnos" onPress={() => router.push('/mensajes')} />}<StudentRow title="Guía de prácticas" subtitle="Orientación para tus funciones" onPress={() => router.push('/guia')} /><StudentRow title="Mi cuenta" subtitle="Datos de la sesión" onPress={() => router.push('/cuenta' as never)} /></StudentGroup><Button title="Cerrar sesión" secondary onPress={() => signOut()} /></StudentPage>;
}

export function StaffAccount() {
  const { session, signOut } = useAuth(), router = useAppRouter();
  if (!session || !isStaff(session.user.role)) return null;
  return <StudentPage title="Mi cuenta" back={() => router.canGoBack() ? router.back() : router.replace('/equipo/mas' as never)}><Text style={s.title}>{session.user.nombres} {session.user.apellidos}</Text><Text selectable style={s.muted}>{session.user.email}</Text><Badge title={staffLabels[session.user.role].role} tone="neutral" /><Text style={s.muted}>Tus funciones dependen del rol vigente y de las aulas, prácticas o centros asignados a tu cuenta.</Text><Button title="Cerrar sesión" secondary onPress={() => signOut()} /></StudentPage>;
}
