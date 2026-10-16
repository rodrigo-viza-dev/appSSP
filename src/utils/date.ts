export function academicDate(value: string | null, empty = 'Sin fecha límite') {
  if (!value) return empty;
  // Una fecha sin hora conserva su día; los timestamps sin offset siguen el UTC del API.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const utcValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value) ? `${value}Z` : value;
  const date = new Date(utcValue);
  if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium', ...(dateOnly ? {} : { timeStyle: 'short' as const }), timeZone: dateOnly ? 'UTC' : 'America/Lima',
  }).format(date);
}
