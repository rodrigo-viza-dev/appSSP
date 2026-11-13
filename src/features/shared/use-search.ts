import { useEffect, useState } from 'react';

/** Espera una pausa breve antes de consultar al servidor y no oculta el texto escrito. */
export function useSearch(delay = 350) {
  const [value, setValue] = useState(''), [query, setQuery] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(value.trim()), delay); return () => clearTimeout(timer); }, [value, delay]);
  return { value, setValue, query, waiting: value.trim() !== query };
}
