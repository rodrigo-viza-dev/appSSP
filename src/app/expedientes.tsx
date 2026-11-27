import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { useAuth } from '@/state/auth';
import { StudentPracticeRecords } from '@/features/alumno/practice-record';
import { StaffRecords } from '@/features/equipo/messages';

export default function ExpedientesScreen() { const { session } = useAuth(); return <StudentLegacyRoute route="/expedientes">{session?.user.role === 'ALUMNO' ? <StudentPracticeRecords /> : <StaffRecords />}</StudentLegacyRoute>; }
