import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/ui';
import { Screen } from '@/components/screen';
import { FilePicker } from '@/features/tareas/file-picker';
import { colors } from '@/theme';
import { useAuth } from '@/state/auth';
import { StudentDocuments } from '@/features/alumno/documents';
function DocumentosScreenContent() {
  const { aulaId } = useLocalSearchParams<{ aulaId?: string }>(), router = useAppRouter();
  return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Documentos del aula" subtitle="Materiales y archivos propios" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} /><Screen>{typeof aulaId === 'string' && !!aulaId && <FilePicker aulaId={aulaId} />}</Screen></View>;
}

export default function DocumentosScreen(){const {session}=useAuth();return <StudentLegacyRoute route="/documentos">{session?.user.role==='ALUMNO'?<StudentDocuments />:<DocumentosScreenContent />}</StudentLegacyRoute>;}
