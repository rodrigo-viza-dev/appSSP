import { createContext, useContext } from 'react';
export const StudentAppearance = createContext(false);
export const useStudentAppearance = () => useContext(StudentAppearance);
export const studentColors = { background: '#F7F4EF', paper: '#FFFDFA', text: '#292523', muted: '#716861', border: '#E7DFD7', primary: '#5E151D', soft: '#F3E6E7', green: '#316E58', greenSoft: '#EAF2ED', amber: '#855817', amberSoft: '#FAF0DF' };
