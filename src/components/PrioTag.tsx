const PRIO_META: Record<string, { cls: string; bars: number }> = {
  'Urgente': { cls: 'prio-urgente', bars: 4 },
  'Alta':    { cls: 'prio-alta',    bars: 3 },
  'Media':   { cls: 'prio-media',   bars: 2 },
  'Baja':    { cls: 'prio-baja',    bars: 1 },
};

interface PrioTagProps {
  value: string;
  showLabel?: boolean;
}

export default function PrioTag({ value, showLabel = true }: PrioTagProps) {
  const meta = PRIO_META[value] || PRIO_META['Media'];
  return (
    <span className={'prio ' + meta.cls}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={1 + i * 4} y={11 - i * 3} width="2.6" height={2 + i * 3} rx="1"
            fill={i < meta.bars ? 'currentColor' : '#d6dae3'} />
        ))}
      </svg>
      {showLabel && value}
    </span>
  );
}
