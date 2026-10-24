import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { StudentPage } from '@/features/alumno/components';
import { useAppRouter } from '@/features/alumno/navigation';
import { staffAllows } from '@/features/shared/navigation-map';
import { StaffAccount } from './screens';
import Docencia from '@/app/docencia';
import Aula from '@/app/aula-docente';
import Tareas from '@/app/tareas-docente';
import Entrega from '@/app/revisar-entrega';
import Asistencia from '@/app/asistencia-docente';
import Seguimiento from '@/app/seguimiento';
import Expedientes from '@/app/expedientes';
import Expediente from '@/app/expediente';
import Metas from '@/app/metas';
import Comunidad from '@/app/comunidad';
import Foro from '@/app/foro';
import Documentos from '@/app/documentos';
import Mensajes from '@/app/mensajes';
import Conversacion from '@/app/conversacion';
import Guia from '@/app/guia';
import Horas from '@/app/mis-horas';
import Administracion from '@/app/administracion';
import AdministrarAula from '@/app/administrar-aula';
import Asignaciones from '@/app/asignaciones';
import Auditoria from '@/app/auditoria';
import Reportes from '@/app/reportes';
import Avisos from '@/app/mis-avisos';

const views: Record<string, () => React.JSX.Element | null> = { cuenta: StaffAccount, docencia: Docencia, 'aula-docente': Aula, 'tareas-docente': Tareas, 'revisar-entrega': Entrega, 'asistencia-docente': Asistencia, seguimiento: Seguimiento, expedientes: Expedientes, expediente: Expediente, metas: Metas, comunidad: Comunidad, foro: Foro, documentos: Documentos, mensajes: Mensajes, conversacion: Conversacion, guia: Guia, 'mis-horas': Horas, administracion: Administracion, 'administrar-aula': AdministrarAula, asignaciones: Asignaciones, auditoria: Auditoria, reportes: Reportes, 'mis-avisos': Avisos };
export default function StaffDetail() {
  const params = useLocalSearchParams<{ vista?: string }>(), router = useAppRouter(), { session } = useAuth();
  const view = typeof params.vista === 'string' ? params.vista : '';
  const Content = staffAllows(session?.user.role, view) ? views[view] : null;
  return Content ? <Content /> : <StudentPage title="Sección no disponible"><Button title="Volver a Inicio" onPress={() => router.replace('/panel')} /></StudentPage>;
}
export function generateStaticParams() { return Object.keys(views).map(vista => ({ vista })); }
