import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { useAuth } from '@/state/auth';
import { StudentMessages } from '@/features/alumno/communication';
import { StaffMessages } from '@/features/equipo/messages';

export default function MessagesScreen() { const { session } = useAuth(); return <StudentLegacyRoute route="/mensajes">{session?.user.role === 'ALUMNO' ? <StudentMessages /> : <StaffMessages />}</StudentLegacyRoute>; }
