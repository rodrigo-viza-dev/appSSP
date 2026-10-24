import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { StaffClassrooms } from '@/features/equipo/lists';

export default function Screen() {
  return <StudentLegacyRoute route="/docencia"><StaffClassrooms /></StudentLegacyRoute>;
}
