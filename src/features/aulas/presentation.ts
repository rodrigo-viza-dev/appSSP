export function deliveryLabel(estado: string | null) {
  if (estado === null) return 'Sin entrega';
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente', ENTREGADA: 'Entregada', CALIFICADA: 'Calificada',
    OBSERVADA: 'Con observaciones', RECHAZADA: 'Rechazada',
  };
  return labels[estado] ?? estado.replaceAll('_', ' ');
}
