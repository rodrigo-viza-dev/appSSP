import { useStudentAppearance, studentColors as sc } from '@/theme/student';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

export function Screen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const student = useStudentAppearance();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.safeArea, { backgroundColor: student ? sc.background : colors.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 22 },
  content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', gap: 20 },
});
