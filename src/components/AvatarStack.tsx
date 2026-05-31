import Avatar from './Avatar';

interface AvatarStackProps {
  ids: string[];
  size?: number;
  max?: number;
}

export default function AvatarStack({ ids, size = 26, max = 4 }: AvatarStackProps) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <div className="av-stack">
      {shown.map(id => <Avatar key={id} id={id} size={size} />)}
      {extra > 0 && (
        <div className="av-more" style={{ width: size, height: size, fontSize: size * 0.36 }}>
          +{extra}
        </div>
      )}
    </div>
  );
}
