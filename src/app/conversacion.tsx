import { StudentLegacyRoute } from '@/features/alumno/navigation';
import { useAuth } from '@/state/auth';
import { StudentConversation } from '@/features/alumno/communication';
import { StaffConversation } from '@/features/equipo/messages';

export default function ConversationScreen() { const { session } = useAuth(); return <StudentLegacyRoute route="/conversacion">{session?.user.role === 'ALUMNO' ? <StudentConversation /> : <StaffConversation />}</StudentLegacyRoute>; }
