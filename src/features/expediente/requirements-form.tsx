import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, typography } from '@/components/ui';
import { ContentForm } from '@/features/shared/content-form';
import { ApiError, type Session } from '@/services/api';
import { guardarRequisitos, type Expediente } from '@/services/expedientes';

export function RequirementsForm({ data, session, onResult, onSaved, refresh, onBusy }: { data: Expediente; session: Session; onResult: (result: Expediente) => void; onSaved: () => void; refresh: () => void; onBusy: (v: boolean) => void }) {
  const [tasks, setTasks] = useState(data.configuracion?.tareas ?? data.tareas.map(t => t.id));
  const [targets, setTargets] = useState(data.configuracion?.metas ?? data.metas.map(m => m.id));
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false);
  const toggle = (id: string, values: string[], set: (v: string[]) => void) => set(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  const lock = (value: boolean) => { setBusy(value); onBusy(value); };
  // El callback permanece estable mientras vive el formulario.
  const [setLocked] = useState(() => lock);
  if (!review) return <Card>
    <Text style={typography.title}>Definir requisitos de esta práctica</Text>
    <Text style={typography.body}>Selecciona las tareas y metas que exigirás al cierre. Se proponen todas las existentes. Si no exiges alguna, explica el criterio al confirmar. Esto no sustituye el reglamento académico.</Text>
    <Text style={typography.title}>Tareas exigidas</Text>
    {data.tareas.length === 0 && <Text style={typography.body}>No hay tareas publicadas.</Text>}
    {data.tareas.map(t => <Button key={t.id} title={`${tasks.includes(t.id) ? '✓ Exigir' : 'Sin exigir'} · ${t.titulo}`} secondary={!tasks.includes(t.id)} onPress={() => toggle(t.id, tasks, setTasks)} />)}
    <Text style={typography.title}>Metas exigidas</Text>
    {data.metas.length === 0 && <Text style={typography.body}>No hay metas definidas.</Text>}
    {data.metas.map(m => <Button key={m.id} title={`${targets.includes(m.id) ? '✓ Exigir' : 'Sin exigir'} · ${m.descripcion || m.tipo.replaceAll('_', ' ')}`} secondary={!targets.includes(m.id)} onPress={() => toggle(m.id, targets, setTargets)} />)}
    <Button title="Continuar con los requisitos seleccionados" onPress={() => setReview(true)} />
  </Card>;
  return <View style={{ gap: 12 }}><ContentForm title="Confirmar requisitos de cierre" onBusy={setLocked} refresh={refresh} onSaved={onSaved}
    confirm="Confirmar requisitos académicos"
    initial={{ tareas: data.tareas.filter(t => tasks.includes(t.id)).map(t => t.titulo).join('\n') || 'Ninguna tarea exigida', metas: data.metas.filter(m => targets.includes(m.id)).map(m => m.descripcion || m.tipo).join('\n') || 'Ninguna meta exigida', notaMinima: data.configuracion?.notaMinima?.toString() ?? '', motivo: data.configuracion?.motivo ?? '' }}
    fields={[{ key: 'tareas', label: 'Tareas seleccionadas', readOnly: true }, { key: 'metas', label: 'Metas seleccionadas', readOnly: true }, { key: 'notaMinima', label: 'Nota mínima de tareas (opcional, 0–20)', numeric: true, max: 2 }, { key: 'motivo', label: 'Criterio académico para estos requisitos', multiline: true, max: 2000 }]}
    validate={v => {
      if (v.notaMinima.trim() && (!/^\d{1,2}$/.test(v.notaMinima.trim()) || Number(v.notaMinima) > 20)) throw new ApiError(400, 'La nota mínima debe estar entre 0 y 20, o quedar vacía para exigir solo revisión docente.');
      if (v.motivo.trim().length < 5) throw new ApiError(400, 'Explica el criterio de selección de requisitos.');
    }}
    submit={async (v, _key, signal) => { const result = await guardarRequisitos(session, data, { tareas: [...tasks].sort(), metas: [...targets].sort(), notaMinima: v.notaMinima.trim() ? Number(v.notaMinima) : null, motivo: v.motivo.trim() }, signal); onResult(result); }} />
    <Button title="Cambiar tareas y metas seleccionadas" secondary disabled={busy} onPress={() => setReview(false)} />
  </View>;
}
