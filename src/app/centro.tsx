import { StudentLegacyRoute, useAppRouter } from '@/features/alumno/navigation';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { QueryFeedback } from '@/components/query-feedback';
import { Badge, Button } from '@/components/ui';
import { StudentPage, StudentGroup, StudentRow, studentStyles as s } from '@/features/alumno/components';
import { RegistrationForm } from '@/features/centro/registration-form';
import { useStudentQuery } from '@/features/shared/use-student-query';
import type { Session } from '@/services/api';
import { getCentro, getSupervisor, registerCentro, registerSupervisor, validateCentro, validateSupervisor, type CentroDraft, type SupervisorDraft } from '@/services/centro';
import { useAuth } from '@/state/auth';

function CentroScreenContent() {
  const router = useAppRouter();
  const { session } = useAuth();
  const [notice, setNotice] = useState('');
  const [centroDraft, setCentroDraft] = useState<CentroDraft>({ razonSocial: '', ruc: '', direccion: '', sector: '', telefono: '', email: '' });
  const [supervisorDraft, setSupervisorDraft] = useState<SupervisorDraft>({ nombres: '', apellidos: '', cargo: '', email: '', telefono: '' });
  const loadCentro = useCallback((account: Session, signal: AbortSignal) => getCentro(account, signal), []);
  const centro = useStudentQuery('mi-centro', loadCentro, true);
  const data = centro.data;
  const loadSupervisor = useCallback((account: Session, signal: AbortSignal) => getSupervisor(account, data!, signal), [data]);
  const supervisor = useStudentQuery(`supervisor:${data?.id ?? ''}`, loadSupervisor, !!data);
  const contact = supervisor.data;
  const back = () => router.canGoBack() ? router.back() : router.replace('/panel');
  const refresh = () => { setNotice(''); centro.retry(); };

  return <StudentPage title="Centro y supervisor" subtitle="Los datos de tu experiencia profesional." back={back} keyboard>
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
      <QueryFeedback {...centro} notFound="La ficha del centro no está disponible. Consulta con la coordinación." />
      {!centro.loading && !centro.error && !data && <>
        <Badge title="Centro por registrar" tone="warning" />
        <RegistrationForm kind="centro" value={centroDraft} onChange={setCentroDraft} validate={validateCentro} reconcile={refresh}
          fields={[
            { key: 'razonSocial', label: 'Razón social', maxLength: 160 },
            { key: 'ruc', label: 'RUC (11 dígitos)', keyboardType: 'number-pad', maxLength: 11 },
            { key: 'direccion', label: 'Dirección del centro', maxLength: 240, multiline: true },
            { key: 'sector', label: 'Sector o actividad', maxLength: 100 },
            { key: 'telefono', label: 'Teléfono del centro', keyboardType: 'phone-pad', maxLength: 25 },
            { key: 'email', label: 'Correo del centro', keyboardType: 'email-address', autoCapitalize: 'none', maxLength: 254 },
          ]}
          submit={(value, signal) => registerCentro(session!, value, signal)}
          onSaved={result => { centro.setData(result); setNotice('Centro registrado correctamente.'); }} />
      </>}
      {data && <>
        <View style={{ gap: 12 }}>
          <Text style={s.eyebrow}>Centro de prácticas</Text><Text accessibilityRole="header" style={s.hero}>{data.razonSocial}</Text>
          <Badge title="Centro registrado" tone="neutral" />
          <Text selectable style={s.muted}>RUC {data.ruc} · {data.sector}</Text>
        </View>
        <StudentGroup><StudentRow title="Dirección" subtitle={data.direccion} /><StudentRow title="Correo del centro" subtitle={data.email} /><StudentRow title="Teléfono del centro" subtitle={data.telefono} /></StudentGroup>
        <Text accessibilityRole="header" style={s.sectionTitle}>Tu supervisor</Text>
        <QueryFeedback {...supervisor} notFound="El supervisor no está disponible. Actualiza tu ficha." />
        {!supervisor.loading && !supervisor.error && !contact && <>
          <Badge title="Supervisor por registrar" tone="warning" />
          <RegistrationForm key={data.id} kind="supervisor" value={supervisorDraft} onChange={setSupervisorDraft} validate={validateSupervisor}
            reconcile={() => { setNotice(''); supervisor.retry(); }}
            fields={[
              { key: 'nombres', label: 'Nombres del supervisor', maxLength: 160, autoCapitalize: 'words' },
              { key: 'apellidos', label: 'Apellidos del supervisor', maxLength: 160, autoCapitalize: 'words' },
              { key: 'cargo', label: 'Cargo del supervisor', maxLength: 100 },
              { key: 'email', label: 'Correo del supervisor', keyboardType: 'email-address', autoCapitalize: 'none', maxLength: 254 },
              { key: 'telefono', label: 'Teléfono del supervisor', keyboardType: 'phone-pad', maxLength: 25 },
            ]}
            submit={(value, signal) => registerSupervisor(session!, data, value, signal)}
            onSaved={result => { supervisor.setData(result); setNotice('Contacto del supervisor registrado correctamente.'); }} />
        </>}
        {contact && <>
          <View style={{ gap: 12 }}><Text accessibilityRole="header" style={s.title}>{contact.nombres} {contact.apellidos}</Text><Text style={s.muted}>{contact.cargo}</Text>
          <Badge title={contact.userId ? 'Cuenta vinculada' : 'Contacto registrado'} tone="neutral" />
          </View><StudentGroup><StudentRow title="Correo del supervisor" subtitle={contact.email} /><StudentRow title="Teléfono del supervisor" subtitle={contact.telefono} /></StudentGroup>
        </>}
        <View style={s.notice}><Text style={s.rowTitle}>¿Necesitas cambiar algún dato?</Text><Text style={s.muted}>La coordinación gestiona los cambios y la asignación de tu práctica. Registrar un contacto no crea una cuenta de acceso para el supervisor.</Text></View>
        <Button title="Actualizar ficha" secondary onPress={refresh} />
      </>}
  </StudentPage>;
}

export default function CentroScreen(){return <StudentLegacyRoute route="/centro"><CentroScreenContent /></StudentLegacyRoute>;}
