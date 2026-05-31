const LABEL_COLORS: Record<string, { bg: string; c: string }> = {
  'Backend':        { bg: '#e7eefe', c: '#2456b8' },
  'Frontend':       { bg: '#fbe9e8', c: '#b8362f' },
  'API':            { bg: '#efeafb', c: '#5b3cc4' },
  'Diseño':         { bg: '#fdeaf4', c: '#a8347a' },
  'UX':             { bg: '#fdeaf4', c: '#a8347a' },
  'DevOps':         { bg: '#e2f3f3', c: '#0a7070' },
  'Seguridad':      { bg: '#fbe9e8', c: '#b8362f' },
  'QA':             { bg: '#e6f4ec', c: '#177a4e' },
  'Notificaciones': { bg: '#fbf0db', c: '#a8690a' },
  'Mapas':          { bg: '#e2f3f3', c: '#0a7070' },
  'Arquitectura':   { bg: '#efeafb', c: '#5b3cc4' },
  'Integraciones':  { bg: '#e7eefe', c: '#2456b8' },
  'Accesibilidad':  { bg: '#e6f4ec', c: '#177a4e' },
};

export default function TaskLabel({ text }: { text: string }) {
  const c = LABEL_COLORS[text] || { bg: '#eef0f4', c: '#475067' };
  return <span className="klabel" style={{ background: c.bg, color: c.c }}>{text}</span>;
}
