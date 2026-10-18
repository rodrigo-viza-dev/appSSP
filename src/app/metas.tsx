import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, Field, Header, typography } from '@/components/ui';
import { Screen } from '@/components/screen';
import { QueryFeedback } from '@/components/query-feedback';
import { ContentForm } from '@/features/shared/content-form';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { crearMeta, getMetas, getPracticasMetas, guardarAvanceMeta, metaKinds, validateAvanceMeta, validateMeta } from '@/services/metas';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';

export default function GoalsScreen() {
  const router = useRouter(), { session } = useAuth();
  const params = useLocalSearchParams<{ practicaId?: string }>();
  const [selected, setSelected] = useState(typeof params.practicaId === 'string' ? params.practicaId : ''), [search, setSearch] = useState(''), [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [creating, setCreating] = useState(false), [editing, setEditing] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const practices = useSessionQuery('metas-practicas', useCallback(getPracticasMetas, []), !!session);
  const practica = practices.data?.find(p => p.id === selected) ?? practices.data?.[0];
  const id = practica?.id ?? '';
  const query = useSessionQuery(`metas:${id}`, useCallback((s: Session, signal: AbortSignal) => getMetas(s, practica!, signal), [practica]), !!practica);
  const editor = session?.user.role === 'PROFESOR' || session?.user.role === 'ADMIN';
  const refresh = () => { setCreating(false); setEditing(''); setNotice(''); practices.retry(); query.retry(); };
  const saved = () => { setCreating(false); setEditing(''); query.retry(); setNotice('Meta guardada y confirmada por el servidor.'); };
  const rows = query.data?.filter(m => (filter === 'all' || (filter === 'done' ? m.cantidadAlcanzada >= m.cantidadObjetivo : m.cantidadAlcanzada < m.cantidadObjetivo)) && `${m.descripcion ?? ''} ${metaKinds.find(k => k.value === m.tipo)?.label}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const done = query.data?.filter(m => m.cantidadAlcanzada >= m.cantidadObjetivo).length ?? 0;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title="Metas de prácticas" subtitle="Producción y avance supervisado" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <QueryFeedback {...practices} notFound="Este servidor todavía no ofrece el seguimiento de metas actualizado." />
      {practices.data?.length === 0 && <Text style={typography.body}>No tienes prácticas disponibles para consultar metas.</Text>}
      {(practices.data?.length ?? 0) > 1 && practices.data!.map(p => <Button key={p.id} title={`Metas: ${p.practicanteNombre} · ${p.aulaNombre}`} secondary={p.id !== id} disabled={busy} onPress={() => { setSelected(p.id); setCreating(false); setEditing(''); setNotice(''); }} />)}
      {practica && <>
        <Card><Text style={typography.title}>{practica.practicanteNombre}</Text><Text style={typography.body}>{practica.aulaNombre} · {practica.periodo}</Text><Badge title={practica.estado.replaceAll('_', ' ')} tone="neutral" /></Card>
        <Button title="Ver requisitos y expediente de esta práctica" secondary disabled={busy} onPress={() => router.push({ pathname: '/expediente', params: { practicaId: id } })} />
        <Text style={typography.body}>El docente define los objetivos y registra la producción que ha revisado. Las metas de horas se actualizan desde las horas validadas de la bitácora.</Text>
        <QueryFeedback {...query} notFound="Las metas no están disponibles para tu cuenta." />
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        {query.data && <>
          <Card><Text style={typography.title}>{done} de {query.data.length} metas completadas</Text><Text style={typography.body}>{query.data.length - done} metas con producción pendiente.</Text></Card>
          <Field label="Buscar metas" editable={!busy && !editing && !creating} value={search} onChangeText={setSearch} placeholder="Tipo o descripción" />
          <View style={{ gap: 8 }}>{([['all', 'Todas las metas'], ['pending', 'En progreso'], ['done', 'Completadas']] as const).map(([key, title]) => <Button key={key} title={title} secondary={filter !== key} disabled={busy || !!editing || creating} onPress={() => setFilter(key)} />)}</View>
          {editor && practica.estado !== 'CERRADA' && !creating && !editing && <Button title="Definir nueva meta" onPress={() => setCreating(true)} />}
          {creating && <>
            <ContentForm title="Nueva meta de producción" fields={[{ key: 'tipo', label: 'Tipo de meta', choices: metaKinds }, { key: 'objetivo', label: 'Cantidad objetivo', numeric: true, max: 7 }, { key: 'descripcion', label: 'Descripción de la meta (opcional)', multiline: true, max: 2000 }]} initial={{ tipo: 'ARTICULOS', objetivo: '', descripcion: '' }} confirm="Confirmar nueva meta" validate={validateMeta} submit={(v, key, signal) => crearMeta(session!, practica, v, key, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
            <Button title="Cancelar nueva meta" secondary disabled={busy} onPress={() => setCreating(false)} />
          </>}
          {query.data.length === 0 && <Text style={typography.body}>Todavía no se han definido metas para esta práctica.</Text>}
          {rows?.map(m => {
            const percent = Math.min(100, Math.round(m.cantidadAlcanzada / m.cantidadObjetivo * 100));
            return <Card key={`${m.id}:${m.cantidadAlcanzada}`}>
              <Text style={typography.title}>{metaKinds.find(k => k.value === m.tipo)?.label}</Text><Text style={typography.body}>{m.descripcion || 'Objetivo de producción de la práctica.'}</Text>
              <Badge title={m.cantidadAlcanzada >= m.cantidadObjetivo ? 'Meta completada' : 'En progreso'} tone={m.cantidadAlcanzada >= m.cantidadObjetivo ? 'success' : 'warning'} />
              <Text style={typography.title}>{m.cantidadAlcanzada} de {m.cantidadObjetivo} · {percent}%</Text>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 8, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' }}><View style={{ height: 8, width: `${percent}%`, backgroundColor: colors.primary }} /></View>
              <Text style={typography.body}>Definida por {m.creadoPor} · {academicDate(m.fechaCreacion)}</Text>
              {m.tipo === 'HORAS' && <Text style={typography.body}>Avance automático. Las horas pendientes o rechazadas no cuentan.</Text>}
              {editor && practica.estado !== 'CERRADA' && m.tipo !== 'HORAS' && (editing === m.id ? <>
                <ContentForm title="Actualizar producción revisada" fields={[{ key: 'cantidad', label: 'Total de producción alcanzado', numeric: true, max: 7 }, { key: 'motivo', label: 'Producción revisada y motivo del cambio', multiline: true, max: 2000 }]} initial={{ cantidad: String(m.cantidadAlcanzada), motivo: '' }} confirm="Confirmar total revisado" validate={v => { validateAvanceMeta(m, v); }} submit={(v, _key, signal) => guardarAvanceMeta(session!, practica, m, v, signal)} onSaved={saved} refresh={refresh} onBusy={setBusy} />
                <Button title="Cancelar actualización de meta" secondary disabled={busy} onPress={() => setEditing('')} />
              </> : <Button title="Actualizar producción" secondary disabled={busy || creating || !!editing} onPress={() => setEditing(m.id)} />)}
            </Card>;
          })}
          {query.data.length > 0 && rows?.length === 0 && <Text style={typography.body}>No hay metas que coincidan con estos filtros.</Text>}
        </>}
        <Button title="Actualizar metas" secondary disabled={busy || query.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}
