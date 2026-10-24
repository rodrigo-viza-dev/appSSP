import { createContext, useCallback, useContext, useState, type PropsWithChildren } from 'react';

const StaffData = createContext({ revisions: {} as Record<string, number>, touch: (_resource: string) => {} });
export function StaffDataProvider({ children }: PropsWithChildren) {
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const touch = useCallback((resource: string) => setRevisions(previous => ({ ...previous, [resource]: (previous[resource] ?? 0) + 1 })), []);
  return <StaffData.Provider value={{ revisions, touch }}>{children}</StaffData.Provider>;
}
export const useStaffData = () => useContext(StaffData);
