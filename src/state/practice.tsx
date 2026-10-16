import { createContext, useContext, useState, type PropsWithChildren } from 'react';
export type Activity = { id: string; date: string; hours: number; description: string; validated: boolean };
export type Notice = { id: string; title: string; body: string; tone: 'success' | 'primary' | 'warning' | 'neutral'; read: boolean };
const initialActivities: Activity[] = [
  { id: '1', date: '2026-06-25', hours: 48, description: 'Cobertura de eventos institucionales', validated: false },
  { id: '2', date: '2026-06-01', hours: 60, description: 'Edición de contenidos para redes sociales', validated: true },
  { id: '3', date: '2026-05-02', hours: 40, description: 'Producción de notas informativas', validated: true },
];
const initialNotices: Notice[] = [
  { id: '1', title: 'Horas validadas', body: 'Marisol Chávez validó tu registro del 1 de junio, 60 horas.', tone: 'success', read: false },
  { id: '2', title: 'Nueva tarea asignada', body: 'Informe Semanal N.° 9, en Prácticas Pre-Profesionales I.', tone: 'primary', read: false },
  { id: '3', title: 'Vencimiento próximo', body: 'Revisa la fecha de entrega del Informe Semanal N.° 9.', tone: 'warning', read: false },
  { id: '4', title: 'Anuncio del aula', body: 'Cambio de horario de la sesión del miércoles.', tone: 'neutral', read: true },
];
function usePracticeState() {
  const [demo, setDemo] = useState(false);
  const [activities, setActivities] = useState(initialActivities);
  const [notices, setNotices] = useState(initialNotices);
  const [entry, setEntry] = useState<number | null>(null);
  const [exit, setExit] = useState<number | null>(null);
  return { demo, enterDemo: () => setDemo(true), activities, notices, entry, exit,
    addActivity: (activity: Omit<Activity, 'id' | 'validated'>) => setActivities(current => [{ ...activity, id: `${Date.now()}`, validated: false }, ...current]),
    markRead: (id: string) => setNotices(current => current.map(notice => notice.id === id ? { ...notice, read: true } : notice)),
    startAttendance: () => { setEntry(Date.now()); setExit(null); }, finishAttendance: () => setExit(Date.now()),
    logout: () => { setDemo(false); setActivities(initialActivities); setNotices(initialNotices); setEntry(null); setExit(null); },
  };
}
type PracticeState = ReturnType<typeof usePracticeState>;
const PracticeContext = createContext<PracticeState | null>(null);
export function PracticeProvider({ children }: PropsWithChildren) { const state = usePracticeState(); return <PracticeContext.Provider value={state}>{children}</PracticeContext.Provider>; }
export function usePractice() { const state = useContext(PracticeContext); if (!state) throw new Error('PracticeProvider requerido'); return state; }
