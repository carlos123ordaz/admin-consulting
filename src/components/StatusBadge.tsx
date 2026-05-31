const STATUS_BADGE: Record<string, string> = {
  'En progreso':  'badge-blue',
  'En revisión':  'badge-amber',
  'Planificación':'badge-purple',
  'Completado':   'badge-green',
  'Pagada':       'badge-green',
  'Pendiente':    'badge-amber',
  'Vencida':      'badge-red',
  'Activo':       'badge-green',
  'Inactivo':     'badge-gray',
};

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span className={'badge ' + (STATUS_BADGE[value] || 'badge-gray')}>
      <span className="bdot"></span>{value}
    </span>
  );
}
