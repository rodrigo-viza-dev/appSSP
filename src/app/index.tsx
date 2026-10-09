import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <Text style={[styles.brand, { color: colors.accent }]}>SSP</Text>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Empezamos aquí.
        </Text>
        <Text style={[styles.description, { color: colors.muted }]}>
          Estamos preparando tu aplicación.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Primera versión en preparación</Text>
        <Text style={[styles.description, { color: colors.muted }]}>
          Las pantallas y funcionalidades estarán disponibles próximamente.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  heading: { gap: 12 },
  title: { fontSize: 36, fontWeight: '700' },
  description: { fontSize: 16, lineHeight: 25 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
});
