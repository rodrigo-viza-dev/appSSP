import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { useAuth } from '@/state/auth';
import { StudentForum } from '@/features/alumno/communication';
import { StaffForum } from '@/features/equipo/community';

export default function ForumScreen() { const { session } = useAuth(); return <StudentLegacyRoute route="/foro">{session?.user.role === 'ALUMNO' ? <StudentForum /> : <StaffForum />}</StudentLegacyRoute>; }
