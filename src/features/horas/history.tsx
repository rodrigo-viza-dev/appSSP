import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, typography } from '@/components/ui';
import { QueryFeedback } from '@/components/query-feedback';
import { useSessionQuery } from '@/features/shared/use-session-query';
import { getHistorialHoras, type RegistroHoras } from '@/services/horas';
import type { Session } from '@/services/api';
import { academicDate } from '@/utils/date';

const action: Record<string, string> = { REGISTRO: 'Registro de actividad', CORRECCION: 'Corrección y reenvío', RECHAZO: 'Rechazo', VALIDACION: 'Validación' };
export function HoursHistory({ registro }: { registro: RegistroHoras }) {
  const [open, setOpen] = useState(false);
  const query = useSessionQuery(`historial:${registro.id}:${registro.revision}`, useCallback((s: Session, signal: AbortSignal) => getHistorialHoras(s, registro, signal), [registro]), open);
  return <View style={{ gap: 12 }}>
    <Button title={open ? 'Ocultar historial' : 'Ver historial de actividad'} secondary onPress={() => setOpen(v => !v)} />
    {open && <>
      <QueryFeedback {...query} notFound="El historial no está disponible." />
      {query.data?.length === 0 && <Text style={typography.body}>Esta actividad aún no tiene cambios registrados en el historial.</Text>}
      {query.data?.map(e => <View key={e.id} style={{ gap: 6 }}>
        <Text style={typography.title}>{action[e.accion]}</Text>
        <Text style={typography.body}>{e.userNombre} · {academicDate(e.fecha)}</Text>
        {e.antes && <Text style={typography.body}>Antes: {e.antes.horas} h · {academicDate(e.antes.fecha)} · {e.antes.estadoValidacion.toLowerCase()}{'\n'}{e.antes.descripcion}{e.antes.observacion ? `\nObservación: ${e.antes.observacion}` : ''}</Text>}
        <Text style={typography.body}>Después: {e.despues.horas} h · {academicDate(e.despues.fecha)} · {e.despues.estadoValidacion.toLowerCase()}{'\n'}{e.despues.descripcion}{e.despues.observacion ? `\nObservación: ${e.despues.observacion}` : ''}</Text>
      </View>)}
    </>}
  </View>;
}
