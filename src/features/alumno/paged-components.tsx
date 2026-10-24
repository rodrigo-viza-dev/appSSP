import type { ReactNode } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, typography } from '@/components/ui';
import { studentColors as c } from '@/theme/student';
import { studentStyles as s } from './components';

export function ListHeading({ title, subtitle, back }: { title: string; subtitle?: string; back: () => void }) {
  return <SafeAreaView edges={['top']}><View style={s.heading}><Pressable accessibilityRole="button" accessibilityLabel="Volver" style={s.back} onPress={back}><Text style={s.chevron}>‹</Text></Pressable><View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.title}>{title}</Text>{!!subtitle && <Text style={s.muted}>{subtitle}</Text>}</View></View></SafeAreaView>;
}
export function FilterChip({ title, selected, onPress, disabled = false }: { title: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} aria-selected={selected} disabled={disabled} onPress={onPress} style={[s.chip, selected && s.chipSelected]}><Text style={[s.muted, { color: selected ? c.paper : c.primary }]}>{title}</Text></Pressable>;
}
export function PageFooter({ query, noun = 'registros', older = false, disabled = false }: { query: { data: { items: unknown[]; total: number; siguiente: string | null } | null; moreError: string; loading: boolean; more: () => void }; noun?: string; older?: boolean; disabled?: boolean }) {
  return <View style={{ gap: 12, paddingVertical: 16 }}>{query.data && <Text style={s.muted}>{query.data.items.length} de {query.data.total} {noun}</Text>}{!!query.moreError && <Text accessibilityRole="alert" style={typography.error}>{query.moreError}</Text>}{query.data?.siguiente && <Button title={query.loading ? 'Cargando…' : query.moreError ? 'Reintentar carga' : older ? 'Cargar mensajes anteriores' : 'Ver más'} secondary disabled={query.loading || disabled} onPress={query.more} />}</View>;
}
export function PagedList<T extends { id: string }>({ title, back, header, rows, render, footer, empty }: { title: string; back: () => void; header: ReactNode; rows: T[]; render: (item: T) => ReactNode; footer?: ReactNode; empty?: ReactNode }) {
  return <View style={s.page}><ListHeading title={title} back={back} /><FlatList data={rows} keyExtractor={row => row.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} ListHeaderComponent={<View style={{ gap: 18 }}>{header}</View>} renderItem={({ item }) => <View>{render(item)}</View>} ListFooterComponent={footer ? <View>{footer}</View> : null} ListEmptyComponent={empty ? <View>{empty}</View> : null} /></View>;
}
