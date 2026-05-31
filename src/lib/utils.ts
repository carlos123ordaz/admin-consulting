export const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

export function money(n: number): string {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export function isLate(iso: string): boolean {
  if (!iso) return false;
  return new Date(iso + 'T00:00:00') < TODAY;
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

export const PALETTE = ['#2A6FDB', '#6d4bd6', '#0d8a8a', '#d2453d', '#c2790b', '#1f8a5b', '#a8347a', '#3457a8'];
export const LABEL_OPTIONS = ['Backend', 'Frontend', 'Diseño', 'UX', 'API', 'QA', 'DevOps', 'Seguridad', 'Notificaciones', 'Integraciones'];
