import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '@/components/ui';
import { Screen } from '@/components/screen';
import { FilePicker } from '@/features/tareas/file-picker';
import { colors } from '@/theme';
export default function DocumentosScreen() {
  const { aulaId } = useLocalSearchParams<{ aulaId?: string }>(), router = useRouter();
  return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Documentos del aula" subtitle="Materiales y archivos propios" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} /><Screen>{typeof aulaId === 'string' && !!aulaId && <FilePicker aulaId={aulaId} />}</Screen></View>;
}
