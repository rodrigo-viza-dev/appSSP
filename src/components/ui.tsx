import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, serif } from '@/theme';

export function Header({ title, subtitle, back }: { title: string; subtitle: string; back?: () => void }) {
  return <SafeAreaView edges={['top']} style={s.header}><View style={s.headerInner}>
    {back && <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12}><Text style={s.back}>‹</Text></Pressable>}
    <View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.headerTitle}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View>
    <View style={s.mark}><Text style={s.markText}>UNSA</Text></View>
  </View></SafeAreaView>;
}
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}><Text style={[s.buttonText, secondary && { color: colors.primary }]}>{title}</Text></Pressable>;
}
export function Card({ children }: PropsWithChildren) { return <View style={s.card}>{children}</View>; }
export function Label({ children }: PropsWithChildren) { return <Text style={s.label}>{children}</Text>; }
export function Badge({ title, tone = 'success' }: { title: string; tone?: 'success' | 'warning' | 'neutral' }) {
  return <View style={[s.badge, { backgroundColor: tone === 'success' ? colors.successSoft : tone === 'warning' ? colors.warningSoft : colors.primarySoft }]}><Text style={[s.badgeText, { color: tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.primary }]}>{title}</Text></View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8 }}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { minHeight: 110, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Hours({ total, validated }: { total: number; validated: number }) {
  return <View style={s.hours}><Label>HORAS ACUMULADAS</Label><Text style={s.number}>{total}<Text style={s.denominator}> / 360 h</Text></Text>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 360, now: Math.min(total, 360) }} style={s.track}><View style={[s.fill, { width: `${Math.min(total / 360, 1) * 100}%` }]} /></View>
    <Text style={s.caption}>{validated} h validadas · {total - validated} h por validar</Text>
  </View>;
}
// Iconos de línea sin fuentes ni dependencias adicionales.
export function TabIcon({ name, color }: { name: 'home' | 'clock' | 'book' | 'bell'; color: ColorValue }) {
  const line = { borderColor: color, borderWidth: 1.6 };
  return <View style={{ width: 25, height: 25, alignItems: 'center', justifyContent: 'center' }}>
    {name === 'home' && <><View style={[line, { width: 13, height: 13, transform: [{ rotate: '45deg' }], position: 'absolute', top: 2, borderRightWidth: 0, borderBottomWidth: 0 }]} /><View style={[line, { width: 15, height: 14, top: 4, borderTopWidth: 0, backgroundColor: colors.white }]} /></>}
    {name === 'clock' && <View style={[line, { width: 21, height: 21, borderRadius: 11 }]}><View style={{ width: 1.6, height: 7, backgroundColor: color, position: 'absolute', top: 3, left: 8 }} /><View style={{ width: 6, height: 1.6, backgroundColor: color, position: 'absolute', top: 10, left: 8, transform: [{ rotate: '25deg' }] }} /></View>}
    {name === 'book' && <View style={[line, { width: 17, height: 21, borderRadius: 2, padding: 3, gap: 3 }]}>{[1, 2, 3].map(x => <View key={x} style={{ height: 1.4, backgroundColor: color }} />)}</View>}
    {name === 'bell' && <><View style={[line, { width: 16, height: 17, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomWidth: 0 }]} /><View style={{ width: 21, height: 1.6, backgroundColor: color, position: 'absolute', bottom: 5 }} /><View style={{ width: 4, height: 2, borderRadius: 2, backgroundColor: color, position: 'absolute', bottom: 1 }} /></>}
  </View>;
}
export const typography = StyleSheet.create({ title: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: colors.text }, body: { fontSize: 14, lineHeight: 23, color: colors.muted }, error: { fontSize: 13, lineHeight: 20, color: colors.primary } });
const s = StyleSheet.create({
  header: { backgroundColor: colors.primary }, headerInner: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 14 }, headerTitle: { color: colors.white, fontSize: 21, fontWeight: '700' }, subtitle: { color: '#E7CED1', fontSize: 13, marginTop: 5 },
  mark: { borderWidth: 1, borderColor: '#A66C72', borderRadius: 6, padding: 7 }, markText: { color: '#E7CED1', fontSize: 10, letterSpacing: 1, fontWeight: '600' }, back: { color: colors.white, fontSize: 36, width: 28 },
  button: { minHeight: 52, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', padding: 14 }, secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }, buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 17, padding: 20, gap: 9 }, label: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600', color: colors.muted },
  badge: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, alignSelf: 'flex-start' }, badgeText: { fontSize: 11, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, minHeight: 50, color: colors.text, fontSize: 15 },
  hours: { padding: 20, borderRadius: 17, borderWidth: 1, borderColor: colors.border, gap: 10, backgroundColor: colors.white }, number: { fontFamily: serif, fontSize: 34, color: colors.text }, denominator: { fontSize: 14, fontFamily: undefined, color: colors.muted },
  track: { height: 7, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' }, fill: { height: 7, borderRadius: 6, backgroundColor: colors.primary }, caption: { fontSize: 12, color: colors.muted },
});
