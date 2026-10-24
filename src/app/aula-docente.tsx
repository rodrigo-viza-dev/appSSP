import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { StaffClassroom } from '@/features/equipo/lists';

export default function Screen() {
  return <StudentLegacyRoute route="/aula-docente"><StaffClassroom /></StudentLegacyRoute>;
}
