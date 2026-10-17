import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, Header, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { Screen } from '@/components/screen';
import { RegisterHoursForm, ReviewHoursForm } from '@/features/horas/forms';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getHoras, getPracticasHoras } from '@/services/horas';
import type { Session } from '@/services/api';
import { useAuth } from '@/state/auth';
import { academicDate } from '@/utils/date';
import { colors } from '@/theme';

export default function HoursScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const supervisor = session?.user.role === 'SUPERVISOR';
  const enabled = supervisor || session?.user.role === 'ALUMNO';
  const practices = useSessionQuery('practicas-horas', useCallback(getPracticasHoras, []), enabled);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const practica = practices.data?.find(v => v.id === selected) ?? practices.data?.[0];
  const id = practica?.id ?? '';
  const hours = useSessionQuery(`horas:${id}`, useCallback((s: Session, signal: AbortSignal) => getHoras(s, id, signal), [id]), !!practica);
  const refresh = () => { setNotice(''); hours.retry(); practices.retry(); };
  const saved = () => { hours.retry(); practices.retry(); setNotice('Operación guardada y confirmada por el servidor.'); };
  const total = (state: string) => hours.data?.filter(v => v.estadoValidacion === state).reduce((sum, v) => sum + v.horas, 0) ?? 0;
  return <View style={{ flex: 1, backgroundColor: colors.white }}>
    <Header title={supervisor ? 'Validar horas' : 'Mi bitácora de prácticas'} subtitle="Registro y revisión de actividades" back={() => router.canGoBack() ? router.back() : router.replace('/panel')} />
    <Screen>
      <QueryFeedback {...practices} notFound="Este servidor todavía no tiene disponible el circuito de horas actualizado." />
      {practices.data?.length === 0 && <Text style={typography.body}>{supervisor ? 'No tienes prácticas vinculadas a tu cuenta de supervisor.' : 'Todavía no tienes una práctica asignada.'}</Text>}
      {(practices.data?.length ?? 0) > 1 && practices.data!.map(p => <Button key={p.id} title={`Ver práctica: ${p.practicanteNombre} · ${p.aulaNombre}`} secondary={p.id !== id} disabled={busy} onPress={() => { setSelected(p.id); setNotice(''); }} />)}
      {practica && <>
        <Card><Text style={typography.title}>{practica.aulaNombre}</Text><Text style={typography.body}>{practica.practicanteNombre} · {practica.periodo}</Text><Badge title={practica.estado.replaceAll('_', ' ')} tone="neutral" /></Card>
        {!!notice && <Text accessibilityLiveRegion="polite" style={typography.body}>{notice}</Text>}
        <QueryFeedback {...hours} notFound="La bitácora no está disponible para tu cuenta." />
        {hours.data && <>
          <Card><Text style={typography.title}>{total('VALIDADO')} h validadas · Meta: {practica.horasMinimas} h</Text><Text style={typography.body}>{total('PENDIENTE')} h pendientes · {total('RECHAZADO')} h rechazadas</Text><Text style={typography.body}>Solo las horas validadas suman al avance de la práctica.</Text></Card>
          {!supervisor && practica.estado !== 'CERRADA' && <RegisterHoursForm key={`new:${id}:${hours.data.map(v => v.id).join(',')}`} practica={practica} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
          <Text style={typography.title}>Actividades registradas</Text>
          {hours.data.length === 0 && <Text style={typography.body}>Todavía no hay actividades registradas.</Text>}
          {hours.data.map(r => <Card key={`${r.id}:${r.estadoValidacion}`}>
            <Text style={typography.title}>{r.horas} h · {academicDate(r.fecha)}</Text><Text style={typography.body}>{r.descripcion}</Text>
            <Badge title={r.estadoValidacion === 'VALIDADO' ? 'Validado' : r.estadoValidacion === 'RECHAZADO' ? 'Rechazado' : 'Pendiente'} tone={r.estadoValidacion === 'VALIDADO' ? 'success' : 'warning'} />
            {supervisor && r.estadoValidacion === 'PENDIENTE' && practica.estado !== 'CERRADA' && <ReviewHoursForm disabled={busy} registro={r} onSaved={saved} refresh={refresh} onBusy={setBusy} />}
          </Card>)}
        </>}
        <Button title="Actualizar bitácora" secondary disabled={busy || hours.loading || practices.loading} onPress={refresh} />
      </>}
    </Screen>
  </View>;
}
