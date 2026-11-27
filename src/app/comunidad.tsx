import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { useAuth } from '@/state/auth';
import { StudentCommunity } from '@/features/alumno/communication';
import { StaffCommunity } from '@/features/equipo/community';

export default function CommunityScreen() { const { session } = useAuth(); return <StudentLegacyRoute route="/comunidad">{session?.user.role === 'ALUMNO' ? <StudentCommunity /> : <StaffCommunity />}</StudentLegacyRoute>; }
