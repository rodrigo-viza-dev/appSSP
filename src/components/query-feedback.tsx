import { ActivityIndicator, Text, View } from 'react-native';
import { Button, typography } from '@/components/ui';
import type { ApiError } from '@/services/api';
import { colors } from '@/theme';

export function QueryFeedback({ loading, error, retry, notFound }: {
  loading: boolean; error: ApiError | null; retry: () => void; notFound: string;
}) {
  if (loading) return <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
    <ActivityIndicator color={colors.primary} /><Text style={typography.body}>Consultando la información…</Text>
  </View>;
  if (!error) return null;
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="alert" style={typography.error}>{error.status === 404 ? notFound : error.message}</Text>
    <Button title="Reintentar" secondary onPress={retry} />
  </View>;
}
