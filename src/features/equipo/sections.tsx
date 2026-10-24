import { useAuth } from '@/state/auth';
import Docencia from '@/app/docencia';
import Horas from '@/app/mis-horas';
import Reportes from '@/app/reportes';
import { StaffManagement, StaffPracticeList } from './screens';

export function StaffWork() {
  const role = useAuth().session?.user.role;
  if (role === 'PROFESOR') return <Docencia />;
  if (role === 'SUPERVISOR') return <StaffPracticeList />;
  if (role === 'ADMIN') return <StaffManagement />;
  return null;
}
export function StaffReview() {
  const role = useAuth().session?.user.role;
  if (role === 'PROFESOR') return <StaffPracticeList />;
  if (role === 'SUPERVISOR') return <Horas />;
  if (role === 'ADMIN') return <Reportes />;
  return null;
}
